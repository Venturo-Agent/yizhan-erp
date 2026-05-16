/**
 * AddRequestDialogHeader — Dialog 上方 Header 區塊
 *
 * 包含：Tab 切換 / 團號+訂單選擇器 / 批量日期選擇 / 標題 / 同批次請款單切換器
 */

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Layers } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { PaymentRequest } from '@/stores/types'
import { RequestMode, COMPONENT_LABELS } from './AddRequestDialog.types'
import { useTranslations } from 'next-intl'

interface TourOption {
  value: string
  label: string
}

interface OrderOption {
  value: string
  label: string
}

interface AddRequestDialogHeaderProps {
  activeTab: RequestMode
  isEditMode: boolean
  canCreateCompanyPayment: boolean
  currentRequest: PaymentRequest | null
  isEditBatch: boolean
  editBatchRequests: PaymentRequest[]
  selectedRequestId: string | null
  formData: { tour_id: string; order_id: string }
  batchDate: string
  tourOptions: TourOption[]
  orderOptions: OrderOption[]
  onTabChange: (mode: RequestMode) => void
  onTourChange: (value: string) => void
  onOrderChange: (value: string) => void
  onBatchDateChange: (date: string) => void
  onSelectRequestId: (id: string) => void
}

export function AddRequestDialogHeader({
  activeTab,
  isEditMode,
  canCreateCompanyPayment,
  currentRequest,
  isEditBatch,
  editBatchRequests,
  selectedRequestId,
  formData,
  batchDate,
  tourOptions,
  orderOptions,
  onTabChange,
  onTourChange,
  onOrderChange,
  onBatchDateChange,
  onSelectRequestId,
}: AddRequestDialogHeaderProps) {
  const t = useTranslations('finance')
  return (
    <>
      {/* Header: Tab + 選擇器 + 標題 同一行 */}
      <DialogHeader className="flex-row items-center justify-between pb-4">
        {/* 左邊：Tab + 選擇器 */}
        <div className="flex items-end gap-4">
          <TabsList className="w-fit h-10">
            <TabsTrigger value="tour" disabled={isEditMode}>
              {t('requestTabTour')}
            </TabsTrigger>
            <TabsTrigger value="batch" disabled={isEditMode}>
              {t('requestTabBatch')}
            </TabsTrigger>
            {canCreateCompanyPayment && (
              <TabsTrigger value="company" disabled={isEditMode}>
                {t('requestTabCompany')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* 團體請款：團號 + 訂單 */}
          {activeTab === 'tour' && (
            <>
              <div className="flex flex-col gap-1 relative z-[10020]">
                <Combobox
                  options={tourOptions}
                  value={formData.tour_id}
                  onChange={onTourChange}
                  placeholder={t('requestSearchTourOrCode')}
                  emptyMessage={t('receiptTourNotFound')}
                  className="w-[19rem]"
                  maxHeight="18rem"
                  disabled={isEditMode}
                />
              </div>
              <div className="flex flex-col gap-1 relative z-[10019]">
                <Combobox
                  options={orderOptions}
                  value={formData.order_id}
                  onChange={onOrderChange}
                  placeholder={
                    !formData.tour_id
                      ? t('addRequestSelectTourFirst')
                      : t('requestSearchOrder')
                  }
                  disabled={!formData.tour_id}
                  className="w-[15rem]"
                  maxHeight="18rem"
                />
              </div>
            </>
          )}

          {/* 批量請款：日期 */}
          {activeTab === 'batch' && (
            <div className="flex flex-col gap-1 relative z-[10018] w-[15rem]">
              <DatePicker
                value={batchDate}
                onChange={onBatchDateChange}
                placeholder={t('paymentItemSelectDate')}
              />
            </div>
          )}
        </div>

        {/* 右邊：標題 */}
        <div className="text-right">
          <DialogTitle className="flex items-center justify-end gap-2">
            {isEditMode ? (
              <>
                {COMPONENT_LABELS.REQUEST_PREFIX}{currentRequest?.code}
                <StatusBadge
                  type="payment_request"
                  status={currentRequest?.status || 'pending'}
                />
              </>
            ) : (
              t('addRequestTitle')
            )}
          </DialogTitle>
        </div>
      </DialogHeader>

      {/* Batch request switcher (edit mode) */}
      {isEditMode && isEditBatch && (
        <div className="flex items-center gap-2 px-1 pb-3">
          <Layers size={14} className="text-morandi-muted" />
          <span className="text-xs text-morandi-muted">{COMPONENT_LABELS.SAME_BATCH}</span>
          <div className="flex flex-wrap gap-1 ml-2">
            {editBatchRequests.map(br => (
              <Button
                key={br.id}
                variant="soft-gold"
                size="sm"
                onClick={() => onSelectRequestId(br.id)}
                className={cn(
                  'h-7 text-xs',
                  selectedRequestId === br.id
                    ? 'bg-morandi-gold/10 border-morandi-gold text-morandi-gold'
                    : 'hover:bg-morandi-container/50'
                )}
              >
                {br.tour_code || br.code}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
