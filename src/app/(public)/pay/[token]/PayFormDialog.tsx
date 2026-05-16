'use client'

/**
 * /pay/[token] 付款頁 — 填寫付款資訊 Dialog
 */

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LABELS, PaymentMethodOption } from './types'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!paymentMethodId) {
      setError(LABELS.ERR_NO_METHOD)
      return
    }
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
      const res = await fetch(`/api/public/invoices/${token}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          selected_invoice_ids: selectedIds,
          payment_method_id: paymentMethodId,
          identifier,
          payment_date: paymentDate,
          notes: notes || null,
          amount,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || LABELS.ERR_SUBMIT_FAILED)
        return
      }
      setSuccess(true)
      setTimeout(onSuccess, 1500)
    } catch {
      setError(LABELS.ERR_NETWORK)
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
            <CheckCircle2 className="h-12 w-12 mx-auto text-morandi-green mb-3" />
            <p className="text-sm text-morandi-primary">{LABELS.SUBMIT_SUCCESS}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 金額（可輸入部分金額） */}
            <div className="px-3 py-2 bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg">
              <div className="text-xs text-morandi-secondary mb-1">
                {LABELS.FORM_AMOUNT}
                <span className="ml-1 text-morandi-muted">
                  （上限 NT$ {totalAmount.toLocaleString()}，共 {selectedIds.length} 人）
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-morandi-gold">NT$</span>
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
                  剩餘 NT$ {(totalAmount - amount).toLocaleString()} 下次再付
                </div>
              )}
            </div>

            {/* 收款方式 dropdown */}
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {LABELS.FORM_PAY_METHOD}
              </label>
              {paymentMethods.length === 0 ? (
                <div className="text-sm text-morandi-red px-3 py-2 bg-morandi-red/10 rounded-lg">
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

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-morandi-red/10 border border-morandi-red/30 rounded-lg text-sm text-morandi-red">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
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
                className="flex-1 py-2 bg-morandi-gold text-white rounded-lg text-sm font-medium hover:bg-morandi-gold/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? LABELS.FORM_SUBMITTING : LABELS.FORM_SUBMIT}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
