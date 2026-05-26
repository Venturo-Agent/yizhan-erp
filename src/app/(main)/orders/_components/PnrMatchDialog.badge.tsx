'use client'

import { cn } from '@/lib/utils'
import type { RecordLocatorSource } from '@/lib/pnr-parser/types'

// 訂位代號來源 badge — 顯示信心度
export function PnrSourceBadge({
  source,
  valid,
}: {
  source?: RecordLocatorSource
  valid: boolean
}) {
  if (!valid) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-status-danger/20 text-status-danger">
        🔴 請手動輸入
      </span>
    )
  }
  const map: Record<RecordLocatorSource, { label: string; cls: string }> = {
    rp_header: { label: '🟢 從 PNR header', cls: 'bg-status-success/20 text-status-success' },
    segment_tail: { label: '🟡 從航班末尾', cls: 'bg-morandi-gold/20 text-morandi-gold' },
    ssr_duplicate: { label: '🟡 從 SSR 行', cls: 'bg-morandi-gold/20 text-morandi-gold' },
    tk_line: { label: '🟠 從 TK 行（請確認）', cls: 'bg-status-warning/20 text-status-warning' },
    other: { label: '🟢 已辨識', cls: 'bg-status-success/20 text-status-success' },
    none: { label: '🔴 未辨識', cls: 'bg-status-danger/20 text-status-danger' },
  }
  const cfg = source ? map[source] : map.other
  return <span className={cn('text-xs px-2 py-0.5 rounded-full', cfg.cls)}>{cfg.label}</span>
}
