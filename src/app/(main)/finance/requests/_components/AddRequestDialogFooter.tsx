/**
 * AddRequestDialogFooter — Dialog 下方操作列
 *
 * 包含：左側總金額顯示 / 右側操作按鈕（新增 / 儲存 / 刪除）
 */

import { CheckSquare, Trash2, Save } from 'lucide-react'
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
  /** 當前作用中的品項（編輯模式 = localItems、新增模式 = requestItems）— 統一 reduce 來源 */
  activeItems: RequestItem[]
  totalAllocatedAmount: number
  importFromRequests: boolean
  selectedRequestTotal: number
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
  activeItems,
  totalAllocatedAmount,
  importFromRequests,
  selectedRequestTotal,
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
  // - batch：tour allocations 加總
  // - 新增 tour 且從既有請款匯入：被選請款的總額
  // - 其他（含編輯所有模式 / 新增 tour 非匯入 / company）：當前 activeItems 加總
  //   （activeItems 在編輯模式 = localItems、在新增模式 = requestItems = total_amount 來源、等價）
  const displayAmount =
    activeTab === 'batch'
      ? totalAllocatedAmount
      : !isEditMode && activeTab === 'tour' && importFromRequests
        ? selectedRequestTotal
        : activeItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

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
                className="text-status-danger border-status-danger hover:bg-status-danger/10 gap-2"
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
                  isDirty ? '' : 'bg-morandi-container/50 text-morandi-muted cursor-not-allowed'
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
            variant="header-outline"
            data-tutorial="add-request-submit"
            className="rounded-md gap-2"
          >
            <CheckSquare size={16} />
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
