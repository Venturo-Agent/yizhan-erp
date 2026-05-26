'use client'

import { FormDialog } from '@/components/dialog/form-dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { EmptyValue } from '@/components/ui/empty-value'
import { DollarSign, X, Check, Trash2 } from 'lucide-react'
import { InlineEditTable } from '@/components/ui/inline-edit-table'
import { UnallocatedAmountWarning } from '@/app/(main)/finance/_components/UnallocatedAmountWarning'
import { formatMoney } from '@/lib/utils/format-currency'
import { cn } from '@/lib/utils'
import { CurrencyCell } from '@/components/table-cells'
import { PaymentMethod } from '@/stores/types'
import { useTranslations } from 'next-intl'
import { useBatchReceiptForm, OrderAllocationWithNote } from './useBatchReceiptForm'

interface BatchReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** inline=true 時不渲染 Dialog 外殼、由 AddReceiptDialog header 控制日期/方式/金額 */
  inline?: boolean
  onSuccess?: () => void
  /** 受控 receiptDate：傳了就 form 內不渲染、由外層 header 渲染 */
  receiptDate?: string
  onReceiptDateChange?: (date: string) => void
  /** 受控 paymentMethod */
  paymentMethod?: PaymentMethod
  onPaymentMethodChange?: (method: PaymentMethod) => void
  /** 受控 totalAmount */
  totalAmount?: number
  onTotalAmountChange?: (n: number) => void
  /** 受控時、外層需要知道的選項 list（讓 header 的 Select 顯示 method 選項）*/
  paymentMethodsOptions?: { value: string; label: string }[]
}

// 收款方式選項（從 DB 讀取）
// 不再使用 hardcoded fallback — 新租戶會透過 trigger 自動建立預設值

export function BatchReceiptDialog({
  open,
  onOpenChange,
  inline = false,
  onSuccess,
  receiptDate: externalReceiptDate,
  onReceiptDateChange,
  paymentMethod: externalPaymentMethod,
  onPaymentMethodChange,
  totalAmount: externalTotalAmount,
  onTotalAmountChange,
}: BatchReceiptDialogProps) {
  const t = useTranslations('finance')
  const {
    totalAmount,
    orderAllocations,
    isSubmitting,
    availableOrders,
    selectedOrderIds,
    totalAllocatedAmount,
    unallocatedAmount,
    addOrderAllocation,
    removeOrderAllocation,
    updateOrderAllocation,
    selectOrder,
    distributeEvenly,
    handleSave,
  } = useBatchReceiptForm({
    open,
    onOpenChange,
    onSuccess,
    receiptDate: externalReceiptDate,
    onReceiptDateChange,
    paymentMethod: externalPaymentMethod,
    onPaymentMethodChange,
    totalAmount: externalTotalAmount,
    onTotalAmountChange,
  })

  const formContent = (
    <>
      <div className="space-y-6 py-4">
        {/* 日期 / 收款方式 / 總金額由 AddReceiptDialog header 渲染、此處不再顯示 */}

        {/* 訂單分配（rowRender 模式、cell 樣式跟 PaymentItemRow 完全一致） */}
        <InlineEditTable<OrderAllocationWithNote>
          title={t('batchReceiptOrderAllocation')}
          rows={orderAllocations}
          columns={[
            { key: 'order', label: t('batchReceiptOrderLabel'), render: () => null },
            {
              key: 'tour_name',
              label: t('batchReceiptTourName'),
              width: '160px',
              render: () => null,
            },
            {
              key: 'allocated_amount',
              label: t('batchReceiptAllocAmount'),
              width: '140px',
              align: 'right',
              render: () => null,
            },
            {
              key: 'notes',
              label: t('batchReceiptRemarks'),
              width: '200px',
              render: () => null,
            },
          ]}
          rowRender={(row, index) => (
            <tr key={index} className={cn(index > 0 && 'border-t border-border/50', 'bg-card')}>
              <td className="py-2 px-3 border-b border-border/50">
                <Combobox
                  options={availableOrders
                    .filter(o => !selectedOrderIds.has(o.id) || o.id === row.order_id)
                    .map(order => ({
                      value: order.id,
                      label: `${order.order_number} - ${order.contact_person || t('receiptNoContact')} (${order.tour_name})`,
                    }))}
                  value={row.order_id}
                  onChange={value => selectOrder(index, value)}
                  placeholder={t('requestSearchOrder')}
                />
              </td>
              <td className="py-2 px-3 border-b border-border/50 text-sm text-morandi-secondary">
                {row.tour_name || <EmptyValue />}
              </td>
              <td className="py-2 px-3 border-b border-border/50 text-right">
                <input
                  type="number"
                  value={row.allocated_amount || ''}
                  onChange={e =>
                    updateOrderAllocation(index, {
                      allocated_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input-no-focus w-full bg-transparent text-sm text-right"
                />
              </td>
              <td className="py-2 px-3 border-b border-border/50">
                <input
                  type="text"
                  value={row.notes || ''}
                  onChange={e => updateOrderAllocation(index, { notes: e.target.value })}
                  className="input-no-focus w-full bg-transparent text-sm"
                />
              </td>
              <td className="py-2 px-3 border-b border-border/50 text-center w-12">
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  onClick={() => removeOrderAllocation(index)}
                  className="text-morandi-secondary hover:text-morandi-red"
                  title={t('receiptDelete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          )}
          onAdd={addOrderAllocation}
          addLabel={t('batchReceiptAddOrder')}
          emptyMessage={t('batchReceiptEmptyMsg')}
          headerExtra={
            <Button
              size="sm"
              variant="soft-gold"
              onClick={distributeEvenly}
              disabled={orderAllocations.filter(a => a.order_id).length === 0 || totalAmount === 0}
            >
              {t('batchReceiptAverageAlloc')}
            </Button>
          }
          footer={
            <tr className="bg-morandi-container/20 font-medium">
              <td className="py-2.5 px-3 text-sm text-morandi-primary">
                {t('batchReceiptTotalCount', {
                  count: orderAllocations.filter(a => a.order_id).length,
                })}
              </td>
              <td></td>
              <td className="py-2.5 px-3 text-right">
                <CurrencyCell amount={totalAllocatedAmount} className="text-sm" />
              </td>
              <td></td>
              <td></td>
            </tr>
          }
        />

        {/* 未分配提示 */}
        {totalAmount > 0 && (
          <UnallocatedAmountWarning
            amount={unallocatedAmount}
            underMessage={t('batchReceiptUnallocatedLabel')}
            overMessage={t('batchReceiptOverAllocation')}
            labelSuffix="未分配"
          />
        )}
      </div>

      {/* 操作按鈕 */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center text-sm">
          <span className="text-morandi-secondary">
            {t('batchReceiptTotalCount', {
              count: orderAllocations.filter(a => a.order_id).length,
            })}
          </span>
          <span className="inline-block min-w-[100px] text-right font-semibold text-morandi-gold ml-2">
            {formatMoney(totalAmount)}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex space-x-2">
          <Button variant="soft-gold" className="gap-1" onClick={() => onOpenChange(false)}>
            <X size={16} />
            {t('batchReceiptCancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="gap-1"
            disabled={
              isSubmitting ||
              unallocatedAmount !== 0 ||
              orderAllocations.filter(a => a.order_id).length === 0 ||
              totalAmount === 0
            }
          >
            <Check size={16} />
            {t('batchReceiptCreateLabel')}
          </Button>
        </div>
      </div>
    </>
  )

  if (inline) {
    return formContent
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-morandi-gold" />
          {t('batchReceiptTitle')}
        </span>
      }
      maxWidth="4xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
      level={2}
      showFooter={false}
      loading={isSubmitting}
    >
      {formContent}
    </FormDialog>
  )
}
