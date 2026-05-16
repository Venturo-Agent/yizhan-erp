'use client'
/**
 * QuickReceipt — 待辦事項「收款確認」子任務的內嵌表單
 *
 * 對齊真實 AddReceiptDialog（共用同一套 hooks + components）：
 *   - usePaymentForm        : form state + multi-row items
 *   - useReceiptMutations   : createReceiptWithItems（同一條寫入路徑）
 *   - usePaymentMethodsCached: SSOT 收款方式（含 fee_percent / fee_account）
 *   - PaymentItemRow / InlineEditTable : 同一個 row 渲染（自動算手續費 + actual_amount）
 *
 * 跟真實 AddReceiptDialog 的差異：
 *   - 沒有 dialog wrapper（inline 嵌在子任務展開區）
 *   - 沒有 tab（只走「團體收款」flow、不需要公司收款）
 *   - 沒有編輯 / 退款 / 收款轉移（待辦只負責「建立」一筆）
 */

import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores'
import { usePaymentForm } from '@/app/(main)/finance/payments/_hooks/usePaymentForm'
import { useReceiptMutations } from '@/app/(main)/finance/payments/_hooks/useReceiptMutations'
import { usePaymentMethodsCached } from '@/data/hooks'
import { PaymentItemRow } from '@/app/(main)/finance/payments/_components/PaymentItemRow'
import {
  InlineEditTable,
  type InlineEditColumn,
} from '@/components/ui/inline-edit-table'
import { RequestDateInput } from '@/app/(main)/finance/requests/_components/RequestDateInput'
import { formatMoney } from '@/lib/utils/format-currency'
import type { PaymentItem } from '@/app/(main)/finance/payments/_types'

const COMPONENT_LABELS = {
  PH_SEARCH_TOUR: '搜尋團號或團名',
  RECEIPT_ITEMS: '收款項目',
  TOTAL_PREFIX: '總金額：',
} as const

interface QuickReceiptProps {
  onSubmit?: () => void
  /** 預設選中的團體 ID */
  defaultTourId?: string
  /** 預設選中的訂單 ID */
  defaultOrderId?: string
}

const receiptColumns: InlineEditColumn<PaymentItem>[] = [
  { key: 'method', label: '收款方式', width: '110px', render: () => null },
  { key: 'date', label: '交易日期', width: '150px', render: () => null },
  { key: 'detail', label: '收款項目', width: '180px', render: () => null },
  { key: 'remarks', label: '備註', render: () => null },
  { key: 'amount', label: '收款金額', width: '120px', align: 'right', render: () => null },
  { key: 'actual', label: '實收金額', width: '120px', align: 'right', render: () => null },
]

export function QuickReceipt({
  onSubmit,
  defaultTourId,
  defaultOrderId,
}: QuickReceiptProps) {
  const { user } = useAuthStore()
  const {
    tours,
    formData,
    setFormData,
    paymentItems,
    filteredOrders,
    selectedOrder,
    totalAmount,
    addPaymentItem,
    removePaymentItem,
    updatePaymentItem,
    resetForm,
  } = usePaymentForm()

  const { createReceiptWithItems } = useReceiptMutations()
  const { methods: paymentMethods } = usePaymentMethodsCached('receipt')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 預設值帶入（todo 卡片帶來的 tour / order）
  useEffect(() => {
    if (defaultTourId || defaultOrderId) {
      setFormData(prev => ({
        ...prev,
        tour_id: defaultTourId || prev.tour_id,
        order_id: defaultOrderId || prev.order_id,
      }))
    }
     
  }, [defaultTourId, defaultOrderId])

  const tourOptions = (tours || []).map(t => ({
    value: t.id,
    label: `${t.code || ''} ${t.name || ''}`.trim() || t.id,
  }))
  const orderOptions = filteredOrders.map(o => ({
    value: o.id,
    label: `${o.code || ''} ${o.contact_person || ''}`.trim() || o.id,
  }))

  const handleSubmit = async () => {
    if (
      !formData.tour_id ||
      !formData.order_id ||
      paymentItems.length === 0 ||
      !user?.workspace_id ||
      !user?.id
    ) {
      return
    }
    setIsSubmitting(true)
    try {
      const tourInfo = tours.find(
        t => t.id === (selectedOrder?.tour_id || formData.tour_id)
      )
      const result = await createReceiptWithItems({
        formData,
        paymentItems,
        orderInfo: selectedOrder
          ? {
              tour_id: selectedOrder.tour_id,
              customer_id: selectedOrder.customer_id,
              order_number: selectedOrder.order_number,
              tour_name: selectedOrder.tour_name,
            }
          : null,
        tourInfo: tourInfo
          ? { id: tourInfo.id, code: tourInfo.code, name: tourInfo.name }
          : null,
        userId: user.id,
        workspaceId: user.workspace_id,
      })
      toast.success('收款單已建立', {
        description: `共 ${result.itemCount} 筆 / NT$ ${formatMoney(result.totalAmount)}`,
      })
      resetForm()
      onSubmit?.()
    } catch (error) {
      logger.error('[QuickReceipt] create error:', error)
      toast.error('建立失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 團 + 訂單 + 收款日期 */}
      <div className="flex items-start gap-3">
        <div className="w-[280px]">
          <Combobox
            options={tourOptions}
            value={formData.tour_id}
            onChange={value =>
              setFormData(prev => ({ ...prev, tour_id: value, order_id: '' }))
            }
            placeholder={COMPONENT_LABELS.PH_SEARCH_TOUR}
            maxHeight="300px"
          />
        </div>
        <div className="w-[240px]">
          <Combobox
            options={orderOptions}
            value={formData.order_id}
            onChange={value => setFormData(prev => ({ ...prev, order_id: value }))}
            placeholder={!formData.tour_id ? '請先選擇旅遊團' : '搜尋訂單'}
            disabled={!formData.tour_id}
            maxHeight="300px"
          />
        </div>
        <div className="w-[200px]">
          <RequestDateInput
            value={formData.receipt_date}
            onChange={date => setFormData(prev => ({ ...prev, receipt_date: date }))}
          />
        </div>
      </div>

      {/* 收款項目（多筆 row、含手續費自動算） */}
      <InlineEditTable<PaymentItem>
        title={COMPONENT_LABELS.RECEIPT_ITEMS}
        rows={paymentItems}
        columns={receiptColumns}
        onAdd={addPaymentItem}
        addLabel="新增項目"
        rowRender={(item, index) => (
          <PaymentItemRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={updatePaymentItem}
            onRemove={removePaymentItem}
            canRemove={paymentItems.length > 1}
            isNewRow={index === paymentItems.length - 1}
            paymentMethods={paymentMethods}
            orderInfo={
              selectedOrder
                ? {
                    order_number: selectedOrder.order_number || undefined,
                    tour_name: selectedOrder.tour_name || undefined,
                    contact_person: selectedOrder.contact_person || undefined,
                  }
                : undefined
            }
          />
        )}
      />

      {/* 總金額 + 提交 */}
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <div className="text-sm">
          <span className="text-morandi-secondary">{COMPONENT_LABELS.TOTAL_PREFIX}</span>
          <span className="text-base font-semibold text-morandi-gold">
            NT$ {formatMoney(totalAmount)}
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !formData.tour_id ||
            !formData.order_id ||
            paymentItems.length === 0
          }
          variant="soft-gold"
          className="gap-2"
        >
          <Save size={16} />
          {isSubmitting ? '建立中...' : '建立收款單'}
        </Button>
      </div>
    </div>
  )
}
