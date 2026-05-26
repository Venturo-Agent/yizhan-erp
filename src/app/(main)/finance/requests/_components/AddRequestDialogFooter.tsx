/**
 * AddRequestDialogFooter — Dialog 下方操作列
 *
 * 包含：左側總金額顯示 / 右側操作按鈕（新增 / 儲存 / 刪除）
 */

import { Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils/format-currency'
import { cn } from '@/lib/utils'
import { RequestItem } from '../_types'
import { TourAllocation, RequestMode, COMPONENT_LABELS } from './AddRequestDialog.types'
import { useTranslations } from 'next-intl'

interface AddRequestDialogFooterProps {
  // 模式
  isEditMode: boolean
  canEdit: boolean
  activeTab: RequestMode
  isSubmitting: boolean
  isDirty: boolean

  // 金額計算用
  localItems: RequestItem[]
  totalAllocatedAmount: number
  importFromRequests: boolean
  selectedRequestTotal: number
  total_amount: number
  tourAllocations: TourAllocation[]
  batchCategory: string
  requestItems: RequestItem[]
  formData: { tour_id: string }
  selectedRequestCount: number

  // 操作
  onDelete: () => void
  onSave: () => void
  onSubmit: () => void
}

export function AddRequestDialogFooter({
  isEditMode,
  canEdit,
  activeTab,
  isSubmitting,
  isDirty,
  localItems,
  totalAllocatedAmount,
  importFromRequests,
  selectedRequestTotal,
  total_amount,
  tourAllocations,
  batchCategory,
  requestItems,
  formData,
  selectedRequestCount,
  onDelete,
  onSave,
  onSubmit,
}: AddRequestDialogFooterProps) {
  const t = useTranslations('finance')
  // 計算顯示金額
  const displayAmount = isEditMode
    ? localItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    : activeTab === 'batch'
      ? totalAllocatedAmount
      : activeTab === 'tour' && importFromRequests
        ? selectedRequestTotal
        : total_amount

  // 計算新增按鈕是否 disabled
  const submitDisabled =
    isSubmitting ||
    (activeTab === 'batch'
      ? totalAllocatedAmount === 0 ||
        tourAllocations.filter(a => a.tour_id && a.allocated_amount > 0).length === 0 ||
        !batchCategory
      : activeTab === 'company'
        ? requestItems.length === 0
        : !formData.tour_id ||
          (importFromRequests ? selectedRequestCount === 0 : requestItems.length === 0))

  return (
    <div className="flex justify-between items-center pt-4 border-t border-border">
      {/* 左側：總金額 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-morandi-secondary">{t('receiptTotalAmount')}</span>
        <span className="text-lg font-semibold text-morandi-gold whitespace-nowrap">
          {formatMoney(displayAmount)}
        </span>
      </div>

      {/* 右側：按鈕 */}
      <div className="flex space-x-2">
        {isEditMode ? (
          canEdit ? (
            <>
              <Button
                variant="soft-gold"
                size="sm"
                onClick={onDelete}
                disabled={isSubmitting}
                className="text-morandi-red border-morandi-red hover:bg-morandi-red/10 gap-2"
              >
                <Trash2 size={16} />
                {COMPONENT_LABELS.DELETE}
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSubmitting || !isDirty}
                className={cn(
                  'gap-2 transition-all',
                  isDirty
                    ? 'bg-morandi-gold hover:bg-morandi-gold/90 text-white'
                    : 'bg-morandi-container/50 text-morandi-muted cursor-not-allowed'
                )}
              >
                <Save size={16} />
                {isSubmitting ? COMPONENT_LABELS.SAVING : COMPONENT_LABELS.SAVE}
              </Button>
            </>
          ) : null
        ) : (
          <Button
            onClick={onSubmit}
            disabled={submitDisabled}
            variant="soft-gold"
            className="rounded-md gap-2"
          >
            <Plus size={16} />
            {isSubmitting
              ? t('addRequestProcessing')
              : activeTab === 'batch'
                ? t('addRequestBatchCreateLabel')
                : t('addRequestTitle')}
          </Button>
        )}
      </div>
    </div>
  )
}
