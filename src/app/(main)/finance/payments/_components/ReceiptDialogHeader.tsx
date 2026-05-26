'use client'

/**
 * ReceiptDialogHeader
 * Dialog 頂部：Tab 切換 + 批量/團體選擇器 + 標題
 */

import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'
import { useTourOptions } from '@/hooks'
interface PaymentMethod {
  id: string
  name: string
}

const COMPONENT_LABELS = {
  TAB_TOUR: '團體收款',
  TAB_BATCH: '批量收款',
  TAB_COMPANY: '公司收款',
} as const

interface TourOption {
  id: string
  code: string
  name: string
}

interface OrderOption {
  id: string
  order_number: string | null
  contact_person: string | null
}

interface ReceiptDialogHeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isEditMode: boolean
  isConfirmed: boolean
  // 團體收款 selectors
  tours: TourOption[]
  filteredOrders: OrderOption[]
  tourId: string
  orderId: string
  onTourChange: (id: string) => void
  onOrderChange: (id: string) => void
  // 批量收款 header fields
  batchReceiptDate: string
  onBatchReceiptDateChange: (date: string) => void
  batchPaymentMethod: string
  onBatchPaymentMethodChange: (method: string) => void
  batchTotalAmount: number
  onBatchTotalAmountChange: (amount: number) => void
  paymentMethods: PaymentMethod[]
}

export function ReceiptDialogHeader({
  activeTab,
  setActiveTab,
  isEditMode,
  isConfirmed,
  tours,
  filteredOrders,
  tourId,
  orderId,
  onTourChange,
  onOrderChange,
  batchReceiptDate,
  onBatchReceiptDateChange,
  batchPaymentMethod,
  onBatchPaymentMethodChange,
  batchTotalAmount,
  onBatchTotalAmountChange,
  paymentMethods,
}: ReceiptDialogHeaderProps) {
  const t = useTranslations('finance')
  const tourComboOptions = useTourOptions(tours)
  return (
    <DialogHeader className="flex-row items-center justify-between pb-4">
      {/* 左邊：Tab + 選擇器 */}
      <div className="flex items-center gap-4">
        {/* Tab 切換 */}
        <TabsList className="w-fit h-10">
          <TabsTrigger value="tour" disabled={isEditMode}>
            {COMPONENT_LABELS.TAB_TOUR}
          </TabsTrigger>
          <TabsTrigger value="batch" disabled={isEditMode}>
            {COMPONENT_LABELS.TAB_BATCH}
          </TabsTrigger>
          <TabsTrigger value="company" disabled={isEditMode}>
            {COMPONENT_LABELS.TAB_COMPANY}
          </TabsTrigger>
        </TabsList>

        {/* 批量收款：日期 / 收款方式 / 總金額（跟 tab 同排、無 Label、之間加垂直分隔線） */}
        {activeTab === 'batch' && (
          <>
            <div className="relative z-[10018] w-[11.5rem]">
              <DatePicker
                value={batchReceiptDate}
                onChange={date => onBatchReceiptDateChange(date)}
              />
            </div>
            <div className="w-px h-8 bg-border/60 self-center" />
            <div className="relative z-[10017] w-[11.5rem]">
              <Select value={batchPaymentMethod} onValueChange={onBatchPaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('receiptColMethod')} />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-px h-8 bg-border/60 self-center" />
            <div className="w-[10rem]">
              <Input
                type="number"
                value={batchTotalAmount || ''}
                onChange={e => onBatchTotalAmountChange(parseFloat(e.target.value) || 0)}
                placeholder={t('receiptTotalAmount')}
              />
            </div>
          </>
        )}

        {/* 團體收款：團號 + 訂單選擇器
            5/13 William 拍板：移除上方 Label，placeholder 已表達用途 */}
        {activeTab === 'tour' && (
          <>
            <div className="relative z-[10020]">
              <Combobox
                options={tourComboOptions}
                value={tourId}
                onChange={value => onTourChange(value)}
                placeholder={t('receiptSelectTour')}
                emptyMessage={t('receiptTourNotFound')}
                className="w-[22rem]"
                maxHeight="18rem"
              />
            </div>

            <div className="relative z-[10019]">
              <Combobox
                options={filteredOrders.map(order => ({
                  value: order.id,
                  label: `${order.order_number} - ${order.contact_person || t('receiptNoContact')}`,
                }))}
                value={orderId}
                onChange={value => onOrderChange(value)}
                placeholder={
                  !tourId
                    ? '選擇團體後選擇訂單'
                    : filteredOrders.length === 0
                      ? t('receiptNoOrders')
                      : t('receiptSelectOrder')
                }
                disabled={!tourId || filteredOrders.length === 0}
                className="w-[19rem]"
                maxHeight="18rem"
              />
            </div>
          </>
        )}
      </div>

      {/* 右邊：標題 */}
      <div className="text-right">
        <DialogTitle className="flex items-center justify-end gap-2">
          {isEditMode ? t('editReceiptTitle') : t('addReceiptTitle')}
          {isConfirmed && <StatusBadge tone="success" label={t('receiptConfirmed')} />}
        </DialogTitle>
      </div>
    </DialogHeader>
  )
}

// Re-export for convenience
export { COMPONENT_LABELS as RECEIPT_TAB_LABELS }
