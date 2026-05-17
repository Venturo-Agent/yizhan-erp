'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores'
import { deleteOrder } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { recalculateParticipants } from '@/app/(main)/tours/_services/tour-stats.service'
import { recalculateReceiptStats } from '@/app/(main)/finance/payments/_services/receipt-core.service'
import { logger } from '@/lib/utils/logger'
import { User, Trash2, FileText, SquarePen, Plus, HandCoins, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Order, Tour } from '@/stores/types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { OrderMembersExpandable } from '@/app/(main)/orders/_components/OrderMembersExpandable'
import { OrderStatusBadge } from '@/app/(main)/orders/_components/OrderStatusBadge'
import { OrderStatusChangeDialog } from '@/app/(main)/orders/_components/OrderStatusChangeDialog'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { useTranslations } from 'next-intl'
import type { TableColumn } from '@/components/ui/enhanced-table'
import type { OrderStatus } from '@/types/order.types'

interface SimpleOrderTableProps {
  orders: Order[]
  tours?: Pick<Tour, 'id' | 'departure_date'>[]
  showTourInfo?: boolean
  className?: string
  onQuickReceipt?: (order: Order) => void
  onQuickPaymentRequest?: (order: Order) => void
  onQuickInvoice?: (order: Order) => void
  onEdit?: (order: Order) => void
  onAdd?: () => void
  /** Server-side 分頁（給 /orders 頁用、tour-orders 子頁不用、傳就生效）*/
  serverPagination?: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
  }
}

export const SimpleOrderTable = React.memo(function SimpleOrderTable({
  orders,
  tours = [],
  showTourInfo = false,
  className,
  onQuickReceipt,
  onQuickPaymentRequest,
  onQuickInvoice,
  onEdit,
  onAdd,
  serverPagination,
}: SimpleOrderTableProps) {
  const t = useTranslations('orders')
  const router = useRouter()
  const workspaceId = useAuthStore(state => state.user?.workspace_id) || ''
  const [expanded, setExpanded] = useState<string[]>([])
  const [statusDialog, setStatusDialog] = useState<{
    order: Order
    newStatus: OrderStatus
  } | null>(null)
  const [orderStatuses, setOrderStatuses] = useState<Record<string, OrderStatus>>({})

  const handleStatusChangeRequest = useCallback((order: Order, newStatus: OrderStatus) => {
    setStatusDialog({ order, newStatus })
  }, [])

  const handleStatusChangeSuccess = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrderStatuses(prev => ({ ...prev, [orderId]: newStatus }))
  }, [])

  const handleDelete = useCallback(async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()

    // 檢查財務 / 業務關聯單據是否存在
    // 團員（order_members）不擋、因為人員身份已在顧客管理、團員記錄可直接刪
    // 真正要守護的是：請款單 / 收款單
    const [reqRes, rcptRes] = await Promise.all([
      supabase
        .from('payment_requests')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', order.id),
      supabase
        .from('receipts')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', order.id),
    ])

    const blockers: string[] = []
    if ((reqRes.count || 0) > 0) blockers.push(`請款單 ${reqRes.count} 張`)
    if ((rcptRes.count || 0) > 0) blockers.push(`收款單 ${rcptRes.count} 張`)

    if (blockers.length > 0) {
      await alert(
        `此訂單還有關聯單據、無法刪除：\n・${blockers.join('\n・')}\n\n請先處理這些單據再刪訂單。`,
        'warning'
      )
      return
    }

    const confirmed = await confirm(
      t('simpleOrderDeleteConfirm', { orderNumber: order.order_number || '' }),
      { title: t('deleteOrder'), type: 'warning' }
    )
    if (!confirmed) return

    try {
      // 先清團員（避開 order_members RESTRICT FK）
      const { error: memDelError } = await supabase
        .from('order_members')
        .delete()
        .eq('order_id', order.id)
      if (memDelError) throw memDelError

      const tour_id = order.tour_id
      await deleteOrder(order.id)
      if (tour_id) {
        recalculateParticipants(tour_id).catch(err =>
          logger.error('[OrderTable] 重算團人數失敗:', err)
        )
        recalculateReceiptStats(null, tour_id).catch(err =>
          logger.error('[OrderTable] 重算收入失敗:', err)
        )
      }
    } catch (err) {
      logger.error('[OrderTable] 刪除訂單失敗:', err)
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('foreign key')) {
        await alert('此訂單還有其他關聯資料、無法刪除。請聯繫工程確認。', 'error')
      } else {
        await alert(t('deleteFailedRetry'), 'error')
      }
    }
  }, [t])

  const handleToggleExpand = useCallback((orderId: string) => {
    setExpanded(prev =>
      prev.includes(orderId) ? prev.filter(x => x !== orderId) : [...prev, orderId]
    )
  }, [])

  const columns: TableColumn<Order>[] = [
    {
      key: 'order_number',
      label: t('orderNumber'),
      sortable: true,
      width: '11rem',
      render: value => (
        <span className="font-medium" title={String(value || '')}>
          {String(value || '')}
        </span>
      ),
    },
    ...(showTourInfo
      ? ([
          {
            key: 'tour_name',
            label: t('tourName'),
            sortable: true,
            // 不設 width：搭配 table-fixed、tour_name 吃剩餘空間
          },
        ] as TableColumn<Order>[])
      : []),
    {
      key: 'contact_person',
      label: t('contactPerson'),
      sortable: true,
      width: '7rem',
      render: value => (
        <span className="font-medium truncate" title={String(value || '')}>
          {String(value || '')}
        </span>
      ),
    },
    {
      key: 'sales_person',
      label: t('salesPerson'),
      sortable: true,
      width: '4rem',
    },
    {
      key: 'member_count',
      label: '人數',
      sortable: true,
      width: '2.5rem',
      render: value => (
        <span className="tabular-nums">{typeof value === 'number' ? value : 0}</span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '5.5rem',
      render: (_value, row) => {
        const order = row as Order
        const currentStatus = (orderStatuses[order.id] ?? order.status) as OrderStatus | null
        return (
          <OrderStatusBadge
            status={currentStatus}
            onChangeRequest={newStatus => handleStatusChangeRequest(order, newStatus)}
          />
        )
      },
    },
  ]

  return (
    <>
    <OrderStatusChangeDialog
      order={statusDialog?.order ?? null}
      newStatus={statusDialog?.newStatus ?? null}
      isOpen={!!statusDialog}
      onClose={() => setStatusDialog(null)}
      onSuccess={handleStatusChangeSuccess}
    />
    <EnhancedTable<Order>
      className={className}
      columns={columns}
      data={orders}
      serverPagination={serverPagination}
      striped
      showFilters={false}
      actionsHeader={
        onAdd ? (
          <div className="flex justify-end">
            <Button variant="default" size="sm" className="h-7 px-3 text-xs" onClick={onAdd}>
              <Plus size={12} className="mr-1" />
              {t('add')}
            </Button>
          </div>
        ) : undefined
      }
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-morandi-secondary">
          <FileText size={32} className="mb-2 opacity-30" />
          <p className="text-sm">{t('noOrders')}</p>
        </div>
      }
      expandable={{
        expanded,
        onExpand: handleToggleExpand,
        renderExpanded: order => (
          <OrderMembersExpandable
            orderId={order.id}
            tourId={order.tour_id || ''}
            workspaceId={workspaceId}
            onClose={() => handleToggleExpand(order.id)}
            embedded
            tour={
              tours.find(t => t.id === order.tour_id) as import('@/stores/types').Tour | undefined
            }
          />
        ),
      }}
      actions={order => (
        <div
          className="flex items-center gap-1 justify-start whitespace-nowrap"
          onClick={e => e.stopPropagation()}
        >
          {/* 編輯 */}
          {onEdit && (
            <Button
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onEdit(order)
              }}
              className="h-7 px-1.5 gap-0.5 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-gold-light"
            >
              <SquarePen size="0.95em" />
              {t('simpleOrderEdit')}
            </Button>
          )}

          {/* 展開成員 */}
          <Button
            variant="ghost"
            onClick={e => {
              e.stopPropagation()
              handleToggleExpand(order.id)
            }}
            className={cn(
              'h-7 px-1.5 gap-0.5 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-gold-light',
              expanded.includes(order.id) && 'text-morandi-primary bg-morandi-gold-light'
            )}
          >
            <User size="0.95em" />
            {t('simpleOrderMembers')}
          </Button>

          {/* 收款 */}
          <Button
            variant="ghost"
            onClick={e => {
              e.stopPropagation()
              if (onQuickReceipt) {
                onQuickReceipt(order)
              } else {
                router.push(
                  `/finance/payments?tour_id=${order.tour_id || ''}&order_id=${order.id}&order_number=${order.order_number}&contact_person=${order.contact_person}&amount=${order.remaining_amount}`
                )
              }
            }}
            className="h-7 px-1.5 gap-0.5 text-xs text-morandi-green hover:text-morandi-green hover:bg-morandi-green/10"
          >
            <Wallet size="0.95em" />
            {t('simpleOrderReceive')}
          </Button>

          {/* 請款 */}
          <Button
            variant="ghost"
            onClick={e => {
              e.stopPropagation()
              if (onQuickPaymentRequest) {
                onQuickPaymentRequest(order)
              } else {
                router.push(
                  `/finance/requests?tour_id=${order.tour_id}&order_id=${order.id}&order_number=${order.order_number}`
                )
              }
            }}
            className="h-7 px-1.5 gap-0.5 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
          >
            <HandCoins size="0.95em" />
            {t('simpleOrderRequest')}
          </Button>

          {/* 開發票 */}
          {onQuickInvoice && (
            <Button
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onQuickInvoice(order)
              }}
              className="h-7 px-1.5 gap-0.5 text-xs text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10"
            >
              <FileText size="0.95em" />
              {t('simpleOrderInvoice')}
            </Button>
          )}

          {/* 刪除 */}
          <Button
            variant="ghost"
            onClick={e => handleDelete(order, e)}
            className="h-7 px-1.5 gap-0.5 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
          >
            <Trash2 size="0.95em" />
            {t('simpleOrderDelete')}
          </Button>
        </div>
      )}
    />
    </>
  )
})
