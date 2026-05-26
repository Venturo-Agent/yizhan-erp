'use client'

// ============================================
// 子元件：歷史帳單卡片
// ============================================

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Copy, Check, Ban, Loader2 } from 'lucide-react'
import type { HistoryBatch } from './invoice-dialog.types'

interface HistoryBatchCardProps {
  batch: HistoryBatch
  link: string
  copied: boolean
  onCopy: () => void
  /** 作廢 handler（紅線 D：有收款的 parent 仍會傳、靠下方條件 + API 雙重擋）2026-05-26 */
  onCancel?: () => void
  canceling?: boolean
}

export function HistoryBatchCard({
  batch,
  link,
  copied,
  onCopy,
  onCancel,
  canceling,
}: HistoryBatchCardProps) {
  const isExpired = new Date(batch.token_expires_at) < new Date()
  const remaining = batch.total_amount - batch.paid_amount

  const statusBadge = (() => {
    if (batch.status === 'cancelled')
      return { label: '已取消', cls: 'bg-muted text-morandi-secondary border-border' }
    if (batch.status === 'paid')
      return {
        label: '已付清',
        cls: 'bg-morandi-green/10 text-morandi-green border-morandi-green/30',
      }
    if (isExpired)
      return { label: '連結過期', cls: 'bg-morandi-red/10 text-morandi-red border-morandi-red/30' }
    if (batch.status === 'partial')
      return {
        label: '部分付款',
        cls: 'bg-status-warning-bg text-status-warning border-status-warning/30',
      }
    return {
      label: '待付',
      cls: 'bg-morandi-gold-light/40 text-morandi-primary border-morandi-gold/30',
    }
  })()

  return (
    <div className="border border-border rounded-lg p-2.5 bg-card">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs text-morandi-secondary">
          {batch.created_at.slice(0, 16).replace('T', ' ')}
          <span className="ml-2">{batch.member_count} 人</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.588rem] border ${statusBadge.cls}`}
        >
          {statusBadge.label}
        </span>
      </div>

      <div className="text-sm mb-1.5 tabular-nums">
        <span className="text-morandi-primary font-medium">
          {batch.paid_amount.toLocaleString()}
        </span>
        <span className="text-morandi-secondary"> / {batch.total_amount.toLocaleString()}</span>
        {remaining > 0 && (
          <span className="ml-2 text-xs text-morandi-expense">
            (尚欠 {remaining.toLocaleString()})
          </span>
        )}
      </div>

      {!isExpired && batch.status !== 'cancelled' && batch.status !== 'paid' && (
        <div className="flex items-center gap-1.5 mb-2">
          <Input value={link} readOnly className="text-[0.588rem] font-mono h-7" />
          <Button variant="outline" size="sm" onClick={onCopy} className="h-7 px-2">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </Button>
        </div>
      )}

      {batch.invoices.length > 0 && (
        <div className="space-y-0.5 mt-1.5 pt-1.5 border-t border-border/50">
          {batch.invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between text-xs">
              <span className="text-morandi-secondary truncate flex-1">{inv.member_name}</span>
              <span
                className={`tabular-nums ${
                  inv.status === 'paid'
                    ? 'text-morandi-green'
                    : inv.status === 'partial'
                      ? 'text-status-warning'
                      : 'text-morandi-secondary'
                }`}
              >
                {inv.status === 'paid'
                  ? '✓ 已付清'
                  : `${inv.paid_amount.toLocaleString()} / ${inv.total_amount.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {batch.notes && (
        <div className="mt-1.5 text-[0.588rem] text-morandi-secondary border-t border-border/50 pt-1.5">
          {batch.notes}
        </div>
      )}

      {/* 作廢：只在「沒收款 + 非已付清 + 非已作廢」顯示（紅線 D：有收款要先退款、API 再擋一層）*/}
      {onCancel &&
        batch.paid_amount === 0 &&
        batch.status !== 'cancelled' &&
        batch.status !== 'paid' && (
          <div className="mt-2 pt-1.5 border-t border-border/50 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={canceling}
              className="h-7 px-2 text-[0.7rem] text-status-danger hover:text-status-danger/80 hover:bg-status-danger-bg"
            >
              {canceling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
              <span className="ml-1">作廢</span>
            </Button>
          </div>
        )}
    </div>
  )
}
