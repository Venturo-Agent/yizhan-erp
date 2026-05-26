'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tour } from '@/stores/types'
import {
  useOrdersSlim,
  usePaymentRequests,
  useSuppliersSlim,
  createPaymentRequest as createPaymentRequestApi,
  invalidatePaymentRequests,
} from '@/data'
import type { PaymentRequestItem } from '@/stores/types'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'

// 擴展 PaymentRequest 型別以包含 items
interface PaymentRequestWithItems {
  id: string
  tour_id?: string | null
  order_id?: string | null
  status: string
  created_at?: string | null
  items?: PaymentRequestItem[]
  [key: string]: unknown
}
import { Plus } from 'lucide-react'
import { CurrencyCell } from '@/components/table-cells'
import { toast } from 'sonner'
import { generateUUID } from '@/lib/utils/uuid'
import { PaymentRequestOverviewTable } from './PaymentRequestOverviewTable'

interface TourCostsProps {
  tour: Tour
  orderFilter?: string // 選填：只顯示特定訂單相關的成本
  showSummary?: boolean
  onChildDialogChange?: (hasOpen: boolean) => void
}

// 成本付款項目型別（內部用）
interface CostPayment {
  id: string
  type: 'request'
  tour_id: string
  order_id?: string | null
  amount: number
  description: string
  status: string
  category?: string
  vendor?: string
  created_at?: string | null
}

export const TourCosts = React.memo(function TourCosts({
  tour,
  orderFilter,
  showSummary = true,
  onChildDialogChange: _onChildDialogChange,
}: TourCostsProps) {
  const t = useTranslations('tour')
  // server-side filter by tour_id（egress 殺手修復、不再全撈）
  const { items: orders } = useOrdersSlim({ all: true, filter: { tour_id: tour.id } })
  // 使用 @/data hooks（SWR 自動載入）
  const { items: paymentRequests } = usePaymentRequests({
    all: true,
    filter: { tour_id: tour.id },
  })
  const { items: suppliers } = useSuppliersSlim({ all: true })

  const addPayment = async (data: {
    tour_id: string
    amount: number
    description: string
    category: string
    vendor: string
    status: string
  }) => {
    try {
      // 守門：提案 / 模板狀態的旅遊團不可開立請款單（業務規則）
      if (tour.status === 'proposal' || tour.status === 'template') {
        toast.error(t('costsError'), {
          description: '提案 / 模板狀態的旅遊團不可開立請款單、請先將提案轉為正式團',
        })
        return
      }

      // 找到供應商
      const supplier = suppliers.find(s => s.name === data.vendor || s.id === data.vendor)

      // 類別映射：英文 -> 中文
      const categoryMap: Record<string, '住宿' | '交通' | '餐食' | '門票' | '導遊' | '其他'> = {
        transport: '交通',
        accommodation: '住宿',
        food: '餐食',
        attraction: '門票',
        guide: '導遊',
        other: '其他',
      }

      // 建立請款單項目
      const itemId = generateUUID()
      const requestItem: PaymentRequestItem = {
        id: itemId,
        request_id: '', // 會在 create 時自動設定
        item_number: `ITEM-${Date.now()}`,
        category: categoryMap[data.category] || '其他',
        supplier_id: supplier?.id || '',
        supplier_name: supplier?.name || data.vendor,
        description: data.description,
        unit_price: data.amount,
        quantity: 1,
        subtotal: data.amount,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // 建立請款單
      const paymentRequestData = {
        allocation_mode: 'single' as const,
        tour_id: data.tour_id,
        code: tour.code,
        tour_name: tour.name,
        request_date: new Date().toISOString(),
        items: [requestItem],
        total_amount: data.amount,
        status: data.status === 'confirmed' ? 'confirmed' : 'pending',
        note: data.description,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await createPaymentRequestApi(
        paymentRequestData as unknown as Parameters<typeof createPaymentRequestApi>[0]
      )
      // SWR 快取失效，自動重新載入
      await invalidatePaymentRequests()

      // 同步更新 tour 的成本數據
      await recalculateExpenseStats(tour.id)

      toast.success(t('costsSuccess'), {
        description: t('costsPaymentCreated'),
      })
    } catch (error) {
      logger.error(t('costsPaymentCreateFailed'), error)
      toast.error(t('costsError'), {
        description: t('costsPaymentCreateFailed'),
      })
      throw error
    }
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddSubmitting, setIsAddSubmitting] = useState(false)

  const [newCost, setNewCost] = useState({
    amount: 0,
    description: '',
    category: 'transport',
    status: 'pending' as const,
    vendor: '',
  })

  const handleAddCost = useCallback(async () => {
    if (!newCost.amount || !newCost.description) return

    setIsAddSubmitting(true)
    try {
      await addPayment({
        tour_id: tour.id,
        ...newCost,
      })
      setNewCost({
        amount: 0,
        description: '',
        category: 'transport',
        status: 'pending',
        vendor: '',
      })
      setIsAddDialogOpen(false)
    } finally {
      setIsAddSubmitting(false)
    }
  }, [newCost, tour.id])

  // 獲取屬於這個旅遊團的所有訂單
  const tourOrders = orders.filter(order => order.tour_id === tour.id)

  // 從 payment_requests store 獲取這個團的請款記錄
  const costPayments = React.useMemo(() => {
    const tourOrderIds = new Set(tourOrders.map(o => o.id))

    return (
      paymentRequests as unknown as (PaymentRequestWithItems & { is_active?: boolean | null })[]
    )
      .filter(request => {
        // 排除已刪除的請款單
        if (request.is_active === false) return false

        // 如果有 orderFilter，只顯示該訂單的請款
        if (orderFilter) {
          return request.order_id === orderFilter
        }

        // 顯示所有屬於這個團的請款
        return (
          request.tour_id === tour.id || (request.order_id && tourOrderIds.has(request.order_id))
        )
      })
      .flatMap(request =>
        (request.items || []).map((item: PaymentRequestItem) => ({
          id: item.id,
          type: 'request' as const,
          tour_id: request.tour_id || tour.id,
          order_id: request.order_id,
          amount: item.subtotal,
          description: item.description,
          status: request.status,
          category: item.category,
          vendor: item.supplier_name,
          created_at: request.created_at,
        }))
      ) as CostPayment[]
  }, [paymentRequests, tourOrders, tour.id, orderFilter])

  // status 顯示走 SSOT：<StatusBadge type="payment_request" status={...} />
  // 此處只算統計、不渲染 status label
  const totalCosts = costPayments.reduce((sum, cost) => sum + cost.amount, 0)
  const confirmedCosts = costPayments
    .filter(cost => cost.status === 'confirmed')
    .reduce((sum, cost) => sum + cost.amount, 0)
  const pendingCosts = costPayments
    .filter(cost => cost.status === 'pending')
    .reduce((sum, cost) => sum + cost.amount, 0)

  return (
    <div className="space-y-4">
      {/* 統計摘要 + 新增按鈕 */}
      {showSummary && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center">
              <span className="text-morandi-secondary">{t('costsTotal')}</span>
              <CurrencyCell
                amount={totalCosts}
                className="ml-2 font-semibold text-morandi-primary"
              />
            </div>
            <div className="flex items-center">
              <span className="text-morandi-secondary">{t('costsConfirmed')}</span>
              <CurrencyCell
                amount={confirmedCosts}
                className="ml-2 font-semibold text-morandi-green"
              />
            </div>
            <div className="flex items-center">
              <span className="text-morandi-secondary">{t('costsPending')}</span>
              <CurrencyCell
                amount={pendingCosts}
                className="ml-2 font-semibold text-morandi-gold"
              />
            </div>
            <div className="flex items-center">
              <span className="text-morandi-secondary">{t('costsEstimatedProfit')}</span>
              <CurrencyCell
                amount={Math.max(0, tour.total_revenue - totalCosts)}
                className="ml-2 font-semibold text-morandi-red"
              />
            </div>
          </div>
          <Button variant="soft-gold" onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus size={14} className="mr-1" />
            {t('costsAddExpense')}
          </Button>
        </div>
      )}

      {/* 請款總覽（抽成獨立組件） */}
      <PaymentRequestOverviewTable tour={tour} />

      {/* 新增成本對話框 */}
      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title={t('costsAddExpenseTitle')}
        onSubmit={handleAddCost}
        submitLabel={t('costsSubmitAdd')}
        cancelLabel={t('costsCancel')}
        onCancel={() => setIsAddDialogOpen(false)}
        loading={isAddSubmitting}
        submitDisabled={isAddSubmitting}
        level={2}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {t('costsExpenseAmount')}
            </label>
            <Input
              type="number"
              value={newCost.amount}
              onChange={e => setNewCost(prev => ({ ...prev, amount: Number(e.target.value) }))}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {t('costsExpenseNote')}
            </label>
            <Input
              value={newCost.description}
              onChange={e => setNewCost(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('costsExpenseExamplePlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">{t('costsCategory')}</label>
            <Select
              value={newCost.category}
              onValueChange={value => setNewCost(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transport">{t('costsCategoryTransport')}</SelectItem>
                <SelectItem value="accommodation">{t('costsCategoryAccommodation')}</SelectItem>
                <SelectItem value="food">{t('costsCategoryMeal')}</SelectItem>
                <SelectItem value="attraction">{t('costsCategoryAttraction')}</SelectItem>
                <SelectItem value="other">{t('costsCategoryOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">{t('costsSupplier')}</label>
            <Select
              value={newCost.vendor}
              onValueChange={value => setNewCost(prev => ({ ...prev, vendor: value }))}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder={t('costsSelectSupplier')} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  )
})
