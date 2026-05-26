'use client'

/**
 * ReceiptDialogFooter
 * Dialog 底部：總金額 + 刪除 / 收款轉移 / 存檔 / 確認核帳 按鈕
 */

import { Save, Check, Trash2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiPost } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils/format-currency'
import { confirm } from '@/lib/ui/alert-dialog'
import { useAuthStore } from '@/stores'
import { updateReceipt } from '@/data'
import { recalculateReceiptStats } from '../_services/receipt-core.service'
import { useTranslations } from 'next-intl'
import type { Receipt } from '@/stores'
import type { PaymentItem } from '../_types'

interface ReceiptDialogFooterProps {
  // 狀態
  totalAmount: number
  isEditMode: boolean
  isConfirmed: boolean
  isSubmitting: boolean
  isDeleting: boolean
  // 權限
  canEdit: boolean
  canConfirm: boolean
  // form data（用於按鈕 disabled 判斷）
  tourId: string
  orderId: string
  paymentItemsCount: number
  paymentItems: PaymentItem[]
  // 編輯模式資料
  editingReceipt?: Receipt | null
  onUpdate?: (receiptId: string, data: Partial<Receipt>) => Promise<void>
  onDelete?: (receiptId: string) => Promise<void>
  // 事件
  onSubmit: () => Promise<void>
  onDeleteSuccess: () => void
  onConfirmSuccess: () => void
  onOpenReceiptTransfer: () => void
  setIsSubmitting: (v: boolean) => void
  setIsDeleting: (v: boolean) => void
}

export function ReceiptDialogFooter({
  totalAmount,
  isEditMode,
  isConfirmed,
  isSubmitting,
  isDeleting,
  canEdit,
  canConfirm,
  tourId,
  orderId,
  paymentItemsCount,
  paymentItems,
  editingReceipt,
  onUpdate,
  onDelete,
  onSubmit,
  onDeleteSuccess,
  onConfirmSuccess,
  onOpenReceiptTransfer,
  setIsSubmitting,
  setIsDeleting,
}: ReceiptDialogFooterProps) {
  const t = useTranslations('finance')
  const handleDelete = async () => {
    if (!editingReceipt) return

    const deleteFunc =
      onDelete ||
      (async (receiptId: string) => {
        const { deleteReceipt } = await import('@/data')
        await deleteReceipt(receiptId)
      })

    const confirmed = await confirm(
      t('receiptDeleteConfirmDesc', { receiptNumber: editingReceipt.receipt_number }),
      { type: 'warning', title: t('receiptDeleteReceipt') }
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteFunc(editingReceipt.id)
      toast.success(t('receiptDeleteSuccess'), {
        description: t('receiptDeletedDesc', { receiptNumber: editingReceipt.receipt_number }),
      })
      onDeleteSuccess()
    } catch (error) {
      logger.error('[ReceiptDialogFooter] Delete receipt failed:', error)
      toast.error(t('receiptDeleteFailed'), {
        description: t('receiptPleaseWait'),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirm = async () => {
    if (!editingReceipt) return
    setIsSubmitting(true)
    try {
      await onSubmit()
      // 5/24：fallback 改走 updateReceipt entity hook（自動失效快取、不散刻直接寫）
      const updateFunc =
        onUpdate ||
        (async (id: string, data: Partial<Receipt>) => {
          await updateReceipt(id, data as Parameters<typeof updateReceipt>[1])
        })

      // 撈手續費設定、套規則算 actual + fees（跟列表「核准」一致）
      let feePercent = 0
      let feeFixed = 0
      const methodId =
        (editingReceipt as unknown as { payment_method_id?: string | null }).payment_method_id ||
        null
      if (methodId) {
        const { supabase } = await import('@/lib/supabase/client')
        const { data: method } = await supabase
          .from('payment_methods')
          .select('fee_percent, fee_fixed')
          .eq('id', methodId)
          .maybeSingle()
        feePercent = Number(method?.fee_percent || 0)
        feeFixed = Number(method?.fee_fixed || 0)
      }
      const receiptAmount = Number(paymentItems[0]?.amount || totalAmount || 0)
      const calcFees = Math.round((receiptAmount * feePercent) / 100) + feeFixed
      const calcActual = receiptAmount - calcFees

      await updateFunc(editingReceipt.id, {
        status: 'confirmed',
        actual_amount: calcActual,
        fees: calcFees,
      } as Partial<Receipt>)
      await recalculateReceiptStats(editingReceipt.order_id, editingReceipt.tour_id || null)

      // confirm 之後產生會計傳票（用實收金額 actual_amount）
      // 沒啟用會計 / 收款方式沒綁科目時、API 會 throw、catch 吞掉、不中斷確認流程
      try {
        const wsId = useAuthStore.getState().user?.workspace_id
        if (wsId) {
          await apiPost('/api/accounting/vouchers/auto-create', {
            source_type: 'receipt',
            source_id: editingReceipt.id,
            workspace_id: wsId,
          })
        }
      } catch (err) {
        logger.error('產生收款傳票失敗:', err)
      }
      toast.success('已確認收款')
      onConfirmSuccess()
    } catch {
      toast.error('確認失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-between items-center pt-4 border-t border-border">
      {/* 左側：總金額 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-morandi-secondary">{t('receiptTotalAmount')}</span>
        <span className="text-lg font-semibold text-morandi-gold whitespace-nowrap">
          NT$ {formatMoney(totalAmount)}
        </span>
      </div>

      {/* 右側：刪除 / 收款轉移 + 存檔 + 確認 */}
      <div className="flex items-center gap-2">
        {/* 刪除按鈕：編輯模式且未確認 */}
        {isEditMode && !isConfirmed && (
          <Button
            variant="soft-gold"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
          >
            <Trash2 size={16} />
            {isDeleting ? t('receiptDeleting') : t('receiptDelete')}
          </Button>
        )}

        {/* 收款轉移按鈕：編輯模式且已確認 */}
        {isEditMode && isConfirmed && editingReceipt && (
          <Button variant="soft-gold" onClick={onOpenReceiptTransfer} className="gap-2">
            <ArrowRightLeft size={16} />
            {t('receiptTransfer')}
          </Button>
        )}

        {/* 存檔按鈕 */}
        {canEdit && (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !tourId || !orderId || paymentItemsCount === 0}
            variant="soft-gold"
            className="gap-2"
          >
            <Save size={16} />
            {isSubmitting
              ? isEditMode
                ? t('receiptUpdating')
                : t('receiptCreating')
              : isEditMode
                ? t('receiptSave')
                : t('addReceiptTitle')}
          </Button>
        )}

        {/* 會計專用：確認收款 */}
        {canConfirm && (
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="gap-2 bg-morandi-green hover:bg-morandi-green/90 text-white"
          >
            <Check size={16} />
            {t('receiptConfirmAction')}
          </Button>
        )}
      </div>
    </div>
  )
}
