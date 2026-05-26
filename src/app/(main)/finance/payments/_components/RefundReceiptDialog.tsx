'use client'

import { useState, useEffect } from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import { Money } from '@/components/ui/money'
import { FormDialog } from '@/components/dialog/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiPost, extractHttpErrorMessage } from '@/lib/api/client'
import { formatDateTaipei } from '@/lib/utils/format-date'
import type { Receipt } from '@/stores'

const COMPONENT_LABELS = {
  TOAST_INVALID_AMOUNT: '請輸入有效的退款金額',
  TOAST_AMOUNT_EXCEEDS_PREFIX: '退款金額不能超過實收金額 ',
  TOAST_REFUND_FAILED: '退款失敗',
  TOAST_REFUND_FAILED_RETRY: '退款失敗、請稍後再試',
  TOAST_REFUND_SUCCESS_VOUCHER: '退款成功（已產生反向傳票）',
  TOAST_REFUND_SUCCESS_NO_ACCOUNTING: '退款成功（會計未啟用、僅標記退款）',
  TITLE_PREFIX: '退款 — ',
  TOUR_NAME: '團名',
  CUSTOMER: '客戶',
  ACTUAL_AMOUNT: '實收金額',
  REFUND_AMOUNT: '退款金額 *',
  PARTIAL_REFUND_PREFIX: '部分退款（保留 $',
  PARTIAL_REFUND_SUFFIX: '）',
  REFUND_DATE: '退款日期 *',
  REFUND_REASON: '退款原因',
  REFUND_REASON_PLACEHOLDER: '例：客人退團、行程取消、扣手續費...',
  REFUND_NOTICE:
    '退款執行後：原收款狀態改為「已退款」、會計上會自動產生「借收入 / 貸銀行」反向傳票（會計啟用且原傳票存在的情況下）。退款不可復原。',
  CANCEL: '取消',
  PROCESSING: '處理中...',
  CONFIRM_REFUND: '確認退款',
} as const

interface RefundReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: Receipt | null
  onSuccess?: () => void
}

export function RefundReceiptDialog({
  open,
  onOpenChange,
  receipt,
  onSuccess,
}: RefundReceiptDialogProps) {
  const [refundAmount, setRefundAmount] = useState('')
  const [refundDate, setRefundDate] = useState(() => formatDateTaipei(new Date()))
  const [refundNotes, setRefundNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const actualAmount = Number(receipt?.actual_amount) || Number(receipt?.receipt_amount) || 0

  useEffect(() => {
    if (open && receipt) {
      setRefundAmount(String(actualAmount))
      setRefundDate(formatDateTaipei(new Date()))
      setRefundNotes('')
    }
  }, [open, receipt, actualAmount])

  const handleSubmit = async () => {
    if (!receipt) return

    const amount = Number(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(COMPONENT_LABELS.TOAST_INVALID_AMOUNT)
      return
    }
    if (amount > actualAmount) {
      toast.error(`${COMPONENT_LABELS.TOAST_AMOUNT_EXCEEDS_PREFIX}${actualAmount.toLocaleString()}`)
      return
    }

    setIsSubmitting(true)
    try {
      const json = await apiPost<{ refund_voucher_id?: string }>(
        `/api/accounting/receipts/${receipt.id}/refund`,
        {
          refund_amount: amount,
          refund_date: refundDate,
          refund_notes: refundNotes || undefined,
        }
      )
      toast.success(
        json.refund_voucher_id
          ? COMPONENT_LABELS.TOAST_REFUND_SUCCESS_VOUCHER
          : COMPONENT_LABELS.TOAST_REFUND_SUCCESS_NO_ACCOUNTING
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('退款失敗:', error)
      toast.error(extractHttpErrorMessage(error, COMPONENT_LABELS.TOAST_REFUND_FAILED_RETRY))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!receipt) return null

  const isPartial = Number(refundAmount) > 0 && Number(refundAmount) < actualAmount

  // FormDialog footer 自訂、用 danger 紅按鈕表退款
  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="soft-gold"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting}
      >
        <X size={16} className="mr-1" />
        {COMPONENT_LABELS.CANCEL}
      </Button>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="bg-status-danger hover:bg-status-danger/90 text-white gap-2"
      >
        <Undo2 size={16} />
        {isSubmitting ? COMPONENT_LABELS.PROCESSING : COMPONENT_LABELS.CONFIRM_REFUND}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Undo2 size={18} className="text-status-danger" />
          {COMPONENT_LABELS.TITLE_PREFIX}
          {receipt.receipt_number}
        </span>
      }
      maxWidth="md"
      level={2}
      footer={customFooter}
      loading={isSubmitting}
    >
      <div className="space-y-4">
        {/* 收款資訊 */}
        <div className="rounded-md bg-morandi-container/40 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{COMPONENT_LABELS.TOUR_NAME}</span>
            <span>{receipt.tour_name || <EmptyValue />}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{COMPONENT_LABELS.CUSTOMER}</span>
            <span>{receipt.customer_name || <EmptyValue />}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{COMPONENT_LABELS.ACTUAL_AMOUNT}</span>
            <span className="font-mono font-semibold">
              <Money amount={actualAmount} variant="income" />
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="refund_amount">{COMPONENT_LABELS.REFUND_AMOUNT}</Label>
          <Input
            id="refund_amount"
            type="number"
            step="0.01"
            max={actualAmount}
            value={refundAmount}
            onChange={e => setRefundAmount(e.target.value)}
            required
          />
          {isPartial && (
            <div className="text-xs text-status-warning">
              {COMPONENT_LABELS.PARTIAL_REFUND_PREFIX}
              {(actualAmount - Number(refundAmount)).toLocaleString()}
              {COMPONENT_LABELS.PARTIAL_REFUND_SUFFIX}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="refund_date">{COMPONENT_LABELS.REFUND_DATE}</Label>
          <DatePicker value={refundDate} onChange={setRefundDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refund_notes">{COMPONENT_LABELS.REFUND_REASON}</Label>
          <Textarea
            id="refund_notes"
            placeholder={COMPONENT_LABELS.REFUND_REASON_PLACEHOLDER}
            value={refundNotes}
            onChange={e => setRefundNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="text-xs text-muted-foreground bg-status-info/5 border border-status-info/20 rounded p-2">
          {COMPONENT_LABELS.REFUND_NOTICE}
        </div>
      </div>
    </FormDialog>
  )
}
