'use client'

import { logger } from '@/lib/utils/logger'
import React, { useState, useCallback } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { FormLabel } from '@/components/ui/form-label'
import { useRequestForm } from '@/app/(main)/finance/requests/_hooks/useRequestForm'
import { useRequestOperations } from '@/app/(main)/finance/requests/_hooks/useRequestOperations'
import { usePaymentMethodsCached } from '@/data/hooks'

import { EditableRequestItemList } from '@/app/(main)/finance/requests/_components/RequestItemList'
import { RequestDateInput } from '@/app/(main)/finance/requests/_components/RequestDateInput'
import { CreateSupplierDialog } from '@/app/(main)/finance/requests/_components/CreateSupplierDialog'
import { alert } from '@/lib/ui/alert-dialog'
import { CurrencyCell } from '@/components/table-cells'
import { useTranslations } from 'next-intl'

interface QuickDisbursementProps {
  onSubmit?: () => void
  /** 預設選中的團體 ID */
  defaultTourId?: string
  /** 預設選中的訂單 ID */
  defaultOrderId?: string
}

export function QuickDisbursement({ onSubmit, defaultTourId, defaultOrderId }: QuickDisbursementProps) {
  const t = useTranslations('todos')
  const {
    formData,
    setFormData,
    requestItems,
    filteredOrders,
    total_amount,
    addNewEmptyItem,
    updateItem,
    removeItem,
    resetForm,
    suppliers,
    tours,
    orders,
  } = useRequestForm()

  const { createRequest } = useRequestOperations()
  const { methods: paymentMethods } = usePaymentMethodsCached('payment')

  // === 新增供應商對話框狀態（和 AddRequestDialog 同一套）===
  const [createSupplierDialogOpen, setCreateSupplierDialogOpen] = useState(false)
  const [pendingSupplierName, setPendingSupplierName] = useState('')
  const [supplierCreateResolver, setSupplierCreateResolver] = useState<
    ((supplierId: string | null) => void) | null
  >(null)

  // 快速新增供應商（和 AddRequestDialog 同一套邏輯）
  const handleCreateSupplier = useCallback(
    async (name: string): Promise<string | null> => {
      return new Promise(resolve => {
        setPendingSupplierName(name)
        setSupplierCreateResolver(() => resolve)
        setCreateSupplierDialogOpen(true)
      })
    },
    []
  )

  // 如果待辦已關聯團號/訂單，自動帶入
  React.useEffect(() => {
    if (defaultTourId) {
      setFormData(prev => ({ ...prev, tour_id: defaultTourId }))
    }
  }, [defaultTourId, setFormData])

  React.useEffect(() => {
    if (defaultOrderId) {
      setFormData(prev => ({ ...prev, order_id: defaultOrderId }))
    }
  }, [defaultOrderId, setFormData])

  const selectedTour = (tours || []).find(t => t.id === formData.tour_id)
  const selectedOrder = (orders || []).find(o => o.id === formData.order_id)

  // TODO(P1 抽象機會): tourOptions 同樣的 .map 出現在 quick-receipt / AddRequestDialog /
  // TodoExpandedView / ReceiptTransferDialog / CostTransferDialog 等 5+ 處。
  // 各處 label 格式略不同（「code - name」vs「code name」vs「code｜name」），
  // 要統一格式後才能安全提取 shared TourSelect 組件（約 -120 行）。
  // 統一格式後可建 src/components/shared/TourSelect.tsx 替換這些地方。
  const tourOptions = (tours || []).map(tour => ({
    value: tour.id,
    label: `${tour.code || ''} - ${tour.name || ''}`,
  }))

  const orderOptions = filteredOrders.map(order => ({
    value: order.id,
    label: `${order.order_number} - ${order.contact_person || t('noContact')}`,
  }))

  const handleSubmit = async () => {
    if (!formData.tour_id || requestItems.length === 0 || !formData.request_date) {
      void alert(t('requiredFields'), 'warning')
      return
    }

    if (!selectedTour) {
      void alert(t('groupNotFound'), 'warning')
      return
    }

    try {
      await createRequest(
        formData,
        requestItems,
        selectedTour.name,
        selectedTour.code,
        selectedOrder?.order_number || undefined
      )

      await alert(t('disbursementCreateSuccess'), 'success')
      resetForm()
      onSubmit?.()
    } catch (error) {
      logger.error('❌ Create Request Error:', error)
      void alert(t('createFailed'), 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* 團體 + 訂單 + 請款日期 同一行（和 AddRequestDialog 完全一致） */}
      <div className="flex items-start gap-3">
        <div className="relative z-[10020]">
          <Combobox
            options={tourOptions}
            value={formData.tour_id}
            onChange={value =>
              setFormData(prev => ({ ...prev, tour_id: value, order_id: '' }))
            }
            placeholder="搜尋團號或團名..."
            emptyMessage="找不到團體"
            className="w-[280px]"
            maxHeight="300px"
          />
        </div>
        <div className="relative z-[10019]">
          <Combobox
            options={orderOptions}
            value={formData.order_id}
            onChange={value => setFormData(prev => ({ ...prev, order_id: value }))}
            placeholder={
              !formData.tour_id
                ? '請先選擇旅遊團'
                : '搜尋訂單...'
            }
            disabled={!formData.tour_id}
            className="w-[240px]"
            maxHeight="300px"
          />
        </div>
        <div className="relative z-[10018] w-[200px]">
          <RequestDateInput
            value={formData.request_date}
            onChange={(date, isSpecialBilling) =>
              setFormData(prev => ({
                ...prev,
                request_date: date,
                is_special_billing: isSpecialBilling,
              }))
            }
          />
        </div>
      </div>

      {/* Item List（和 AddRequestDialog 完全一致：含 onCreateSupplier + paymentMethods + tourId） */}
      <EditableRequestItemList
        items={requestItems}
        suppliers={suppliers}
        updateItem={updateItem}
        removeItem={removeItem}
        addNewEmptyItem={addNewEmptyItem}
        onCreateSupplier={handleCreateSupplier}
        tourId={formData.tour_id || null}
        paymentMethods={paymentMethods}
      />

      {/* Note */}
      <div>
        <FormLabel>{t('remarksLabel')}</FormLabel>
        <Textarea
          placeholder={t('disbursementNotes')}
          rows={2}
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="border-morandi-container/30"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!formData.tour_id || requestItems.length === 0 || !formData.request_date}
          className="w-full"
        >
          <FileText size={16} className="mr-2" />
          {t('createRequestPrefix')}{requestItems.length} {t('itemsSuffix')}
          <CurrencyCell amount={total_amount} className="inline text-white" />)
        </Button>
      </div>

      {/* 新增供應商 Dialog（和 AddRequestDialog 同一套） */}
      <CreateSupplierDialog
        open={createSupplierDialogOpen}
        onOpenChange={open => {
          if (!open && supplierCreateResolver) {
            supplierCreateResolver(null)
            setSupplierCreateResolver(null)
          }
          setCreateSupplierDialogOpen(open)
        }}
        defaultName={pendingSupplierName}
        onSuccess={supplierId => {
          if (supplierCreateResolver) {
            supplierCreateResolver(supplierId)
            setSupplierCreateResolver(null)
          }
          setCreateSupplierDialogOpen(false)
        }}
      />
    </div>
  )
}
