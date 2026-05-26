'use client'

/**
 * /pay/[token] 付款頁 — 填寫付款資訊 Dialog
 */

import { useState } from 'react'
import { Loader2, CheckSquare, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LABELS, PaymentMethodOption } from './types'
import { apiMutate } from '@/lib/swr/api-mutate'
import { isGatewayProvider } from '@/constants/payment-provider'

interface PayFormDialogProps {
  token: string
  selectedIds: string[]
  totalAmount: number
  paymentMethods: PaymentMethodOption[]
  initialNotes?: string
  onClose: () => void
  onSuccess: () => void
}

export function PayFormDialog({
  token,
  selectedIds,
  totalAmount,
  paymentMethods,
  initialNotes,
  onClose,
  onSuccess,
}: PayFormDialogProps) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [paymentMethodId, setPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '')
  const [identifier, setIdentifier] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(todayStr)
  const [notes, setNotes] = useState<string>(initialNotes || '')
  const [amount, setAmount] = useState<number>(totalAmount)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedMethod = paymentMethods.find(m => m.id === paymentMethodId)
  // placeholder 從 payment_methods.placeholder 撈、撈不到走預設「匯款後五碼」
  const identifierPlaceholder = selectedMethod?.placeholder || LABELS.IDENTIFIER_DEFAULT
  // maxLength：placeholder 含「四碼」走 4、「後五碼」走 5、其他走 20
  const identifierMaxLength =
    identifierPlaceholder.includes('四') || identifierPlaceholder.toLowerCase().includes('4')
      ? 4
      : identifierPlaceholder.includes('五') || identifierPlaceholder.toLowerCase().includes('5')
        ? 5
        : 20

  // B 方案：如果選的方式是「永豐 provider」，走線上刷卡流程（不收識別碼、改跳轉刷卡頁）
  const isGatewayMethod = isGatewayProvider(selectedMethod?.provider)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!paymentMethodId) {
      setError(LABELS.ERR_NO_METHOD)
      return
    }

    // 永豐金流：產生 payment link、跳轉客戶到刷卡頁
    if (isGatewayMethod) {
      setSubmitting(true)
      try {
        const res = await fetch(`/api/public/invoices/${token}/generate-payment-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selected_invoice_ids: selectedIds,
            payment_method_id: paymentMethodId,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error || '產生付款連結失敗')
          return
        }
        // 跳轉到 mock 刷卡頁
        if (typeof window !== 'undefined' && json.data?.redirect_to) {
          window.location.href = json.data.redirect_to
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '連線失敗')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // 既有「填匯款資訊」流程
    if (!amount || amount <= 0 || amount > totalAmount) {
      setError(`金額請填 1 ~ ${totalAmount.toLocaleString()}`)
      return
    }
    if (!/^\d{4,20}$/.test(identifier)) {
      setError(LABELS.ERR_IDENTIFIER_FORMAT)
      return
    }
    if (new Date(paymentDate) > new Date(todayStr)) {
      setError(LABELS.ERR_DATE_FUTURE)
      return
    }

    setSubmitting(true)
    try {
      const res = await apiMutate(`/api/public/invoices/${token}/pay`, {
        method: 'POST',
        body: {
          selected_invoice_ids: selectedIds,
          payment_method_id: paymentMethodId,
          identifier,
          payment_date: paymentDate,
          notes: notes || null,
          amount,
        },
      })
      if (!res.ok) {
        setError(res.error || LABELS.ERR_SUBMIT_FAILED)
        return
      }
      setSuccess(true)
      setTimeout(onSuccess, 1500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent size="md" level={1} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{LABELS.FORM_TITLE}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <CheckSquare className="h-12 w-12 mx-auto text-status-success mb-3" />
            <p className="text-sm text-morandi-primary">{LABELS.SUBMIT_SUCCESS}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 金額（可輸入部分金額） */}
            <div className="px-3 py-2 bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg">
              <div className="text-xs text-morandi-secondary mb-1">
                {LABELS.FORM_AMOUNT}
                <span className="ml-1 text-morandi-muted">
                  （上限 {totalAmount.toLocaleString()}，共 {selectedIds.length} 人）
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={totalAmount}
                  value={amount}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    setAmount(isNaN(v) ? 0 : v)
                  }}
                  disabled={submitting}
                  className="w-full text-xl font-bold text-morandi-gold tabular-nums bg-transparent border-0 border-b border-morandi-gold/40 focus:outline-none focus:border-morandi-gold px-0"
                />
              </div>
              {amount < totalAmount && amount > 0 && (
                <div className="text-[0.588rem] text-morandi-secondary mt-1">
                  剩餘 {(totalAmount - amount).toLocaleString()} 下次再付
                </div>
              )}
            </div>

            {/* 收款方式 dropdown */}
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {LABELS.FORM_PAY_METHOD}
              </label>
              {paymentMethods.length === 0 ? (
                <div className="text-sm text-status-danger px-3 py-2 bg-status-danger/10 rounded-lg">
                  {LABELS.NO_PAYMENT_METHODS}
                </div>
              ) : (
                <select
                  value={paymentMethodId}
                  onChange={e => setPaymentMethodId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold/40"
                  disabled={submitting}
                  required
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                      {pm.description ? `（${pm.description}）` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 永豐金流：不需要識別碼 / 日期 / 備註、刷卡頁裡填完即可 */}
            {isGatewayMethod ? (
              <div className="px-3 py-2 bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg text-xs text-morandi-secondary">
                點下方按鈕後將跳轉到 <strong>永豐銀行刷卡頁面</strong>、請在該頁完成付款。
              </div>
            ) : (
              <>
                {/* 識別碼 */}
                <div>
                  <label className="block text-xs font-medium text-morandi-primary mb-1">
                    {LABELS.FORM_IDENTIFIER}
                    <span className="ml-2 text-morandi-secondary text-[0.647rem]">
                      ({identifierPlaceholder})
                    </span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern={`\\d{4,${identifierMaxLength}}`}
                    maxLength={identifierMaxLength}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder={identifierPlaceholder}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-morandi-gold/40"
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-morandi-primary mb-1">
                    {LABELS.FORM_DATE}
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold/40"
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-morandi-primary mb-1">
                    {LABELS.FORM_NOTES}
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={LABELS.FORM_NOTES_PLACEHOLDER}
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold/40 resize-none"
                    disabled={submitting}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-status-danger/10 border border-status-danger/30 rounded-lg text-sm text-status-danger">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-morandi-secondary hover:bg-muted transition-colors disabled:opacity-50"
              >
                {LABELS.FORM_CANCEL}
              </button>
              <button
                type="submit"
                disabled={submitting || paymentMethods.length === 0}
                className="flex-1 py-2 rounded-lg text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 [background:var(--btn-primary-bg)] [color:var(--btn-primary-fg)] [border-color:var(--btn-primary-border)] border font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting
                  ? LABELS.FORM_SUBMITTING
                  : isGatewayMethod
                    ? '前往刷卡'
                    : LABELS.FORM_SUBMIT}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
