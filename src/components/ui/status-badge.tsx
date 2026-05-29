/**
 * StatusBadge - 全站統一的狀態 pill 樣式
 *
 * 規範（soft pill）：
 * - 半透明背景 + 同色字（不要 shadow、不要 gradient、不要 border）
 * - 統一 padding / font / rounded
 * - 顏色語意：tone 名稱表達狀態、不綁特定業務（pending/info/success 等）
 *
 * 用法：
 *   <StatusBadge tone="pending" label="待處理" />
 *   <StatusBadge tone="success" label="已確認" />
 */

import { cn } from '@/lib/utils'
import { getStatusTone, getStatusLabelFor, type StatusType } from '@/lib/status'

export type StatusTone =
  | 'pending' // 待處理 / 待確認 — 中性灰、不搶眼
  | 'info' // 已確認 / 進行中 — 柔和藍
  | 'success' // 已出帳 / 已付 / 已完成 — 柔和綠
  | 'warning' // 警告 / 過期 — 柔和黃
  | 'danger' // 已取消 / 失敗 — 柔和紅
  | 'neutral' // 預設 / 未分類

const TONE_STYLES: Record<StatusTone, string> = {
  pending: 'bg-morandi-secondary/15 text-morandi-secondary',
  info: 'bg-status-info/15 text-status-info',
  success: 'bg-status-success/15 text-status-success',
  warning: 'bg-status-warning/15 text-status-warning',
  danger: 'bg-status-danger/15 text-status-danger',
  neutral: 'bg-morandi-container text-morandi-primary',
}

// Legacy API：tone + label
interface StatusBadgePropsLegacy {
  tone: StatusTone
  label: string
  type?: never
  status?: never
  className?: string
}

// New API：type + status（內部 lookup tone + label）
interface StatusBadgePropsNew {
  type: string // StatusType from @/lib/status/labels.ts、避免 import cycle 用 string
  status: string | null | undefined
  label?: string // override default label
  tone?: StatusTone // override default tone
  className?: string
}

export type StatusBadgeProps = StatusBadgePropsLegacy | StatusBadgePropsNew

export function StatusBadge(props: StatusBadgeProps) {
  let tone: StatusTone
  let label: string

  if ('type' in props && props.type) {
    // New API：top-level ESM import（@/lib/status/tone 用 import type 引 StatusTone、無 runtime cycle）
    // props.type 是 string（避開 import cycle 用），lookup 函式期待 StatusType union、強轉
    tone = props.tone ?? getStatusTone(props.type as StatusType, props.status)
    label = props.label ?? getStatusLabelFor(props.type as StatusType, props.status)
  } else {
    // Legacy API
    tone = (props as StatusBadgePropsLegacy).tone
    label = (props as StatusBadgePropsLegacy).label
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_STYLES[tone],
        props.className
      )}
    >
      {label}
    </span>
  )
}
