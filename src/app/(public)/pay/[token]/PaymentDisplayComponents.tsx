'use client'

/**
 * /pay/[token] 付款頁 — 展示用小元件
 * AmountRow / BankRow / MemberRow / ReceiptHistoryRow
 */

import { useMemo } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { LABELS, InvoiceItem, ReceiptRowData } from './types'

export function AmountRow({
  label,
  amount,
  emphasis,
  strikeThrough,
}: {
  label: string
  amount: number
  emphasis?: boolean
  strikeThrough?: boolean
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span
        className={`text-sm ${emphasis ? 'text-morandi-primary font-medium' : 'text-morandi-secondary'}`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${emphasis ? 'text-lg font-bold text-morandi-gold' : 'text-sm text-morandi-primary'} ${strikeThrough ? 'line-through opacity-60' : ''}`}
      >
        {amount.toLocaleString()}
      </span>
    </div>
  )
}

export function BankRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex">
      <span className="w-16 text-morandi-secondary">{label}</span>
      <span className={`text-morandi-primary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

export function MemberRow({
  invoice,
  checked,
  onToggle,
  pendingSubmit,
}: {
  invoice: InvoiceItem
  checked: boolean
  onToggle: () => void
  pendingSubmit?: boolean
}) {
  const isPaid = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const disabled = isPaid || isCancelled || !!pendingSubmit

  return (
    <label
      className={`flex items-center justify-between gap-2 px-2 py-2 rounded-lg border ${
        disabled
          ? 'bg-muted/30 border-border/40 opacity-60 cursor-not-allowed'
          : checked
            ? 'bg-morandi-gold/10 border-morandi-gold/40 cursor-pointer'
            : 'bg-card border-border/40 hover:bg-morandi-gold-light/30 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isPaid || !!pendingSubmit ? true : checked}
          onChange={onToggle}
          disabled={disabled}
          className="h-4 w-4 rounded border-border text-morandi-gold focus:ring-morandi-gold/40 disabled:opacity-50"
        />
        <span className="text-sm font-medium text-morandi-primary truncate">
          {invoice.member_name}
        </span>
        {isPaid && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.588rem] bg-morandi-green/10 text-morandi-green border border-morandi-green/30">
            <CheckCircle2 className="h-2.5 w-2.5" />
            已付清
          </span>
        )}
        {pendingSubmit && !isPaid && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.588rem] bg-status-warning-bg text-status-warning border border-status-warning/30">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            待確認
          </span>
        )}
        {invoice.status === 'partial' && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.588rem] bg-status-warning-bg text-status-warning border border-status-warning/30">
            部分已付
          </span>
        )}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-morandi-primary tabular-nums">
          {invoice.remaining.toLocaleString()}
        </div>
        {invoice.paid_amount > 0 && !isPaid && (
          <div className="text-[0.588rem] text-morandi-secondary tabular-nums">
            已付 {invoice.paid_amount.toLocaleString()} / {invoice.total_amount.toLocaleString()}
          </div>
        )}
      </div>
    </label>
  )
}

export function ReceiptHistoryRow({ receipt }: { receipt: ReceiptRowData }) {
  const statusBadge = useMemo(() => {
    switch (receipt.status) {
      case 'confirmed':
        return {
          label: LABELS.STATUS_CONFIRMED,
          className: 'bg-morandi-green/10 text-morandi-green border-morandi-green/30',
          icon: <CheckCircle2 className="h-3 w-3" />,
        }
      case 'pending_verify':
        return {
          label: LABELS.STATUS_PENDING,
          className: 'bg-status-warning-bg text-status-warning border-status-warning/30',
          icon: <Loader2 className="h-3 w-3" />,
        }
      case 'rejected':
        return {
          label: LABELS.STATUS_REJECTED,
          className: 'bg-morandi-red/10 text-morandi-red border-morandi-red/30',
          icon: <XCircle className="h-3 w-3" />,
        }
      default:
        return {
          label: receipt.status,
          className: 'bg-muted text-morandi-secondary border-border',
          icon: null,
        }
    }
  }, [receipt.status])

  return (
    <div className="py-2 border-b border-border/40 last:border-0 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          <span className="text-morandi-secondary tabular-nums">
            {receipt.payment_date?.slice(5) || '--/--'}
          </span>
          <span className="text-morandi-primary font-medium tabular-nums">
            +{Number(receipt.receipt_amount).toLocaleString()}
          </span>
          {receipt.payment_method && (
            <span className="text-[0.588rem] text-morandi-secondary truncate">
              {receipt.payment_method}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusBadge.className}`}
        >
          {statusBadge.icon}
          {statusBadge.label}
          {receipt.status === 'rejected' && receipt.rejected_reason && (
            <span className="ml-1 text-[0.588rem] opacity-70">({receipt.rejected_reason})</span>
          )}
        </span>
      </div>
      {receipt.paid_for.length > 0 && (
        <div className="text-[0.647rem] text-morandi-secondary pl-2">
          代付：{receipt.paid_for.join('、')}
        </div>
      )}
    </div>
  )
}
