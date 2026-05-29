/**
 * 狀態 tone SSOT — type × status → StatusTone 對應表
 *
 * 為什麼：原本散在 lib/design/status-tone-map.ts、跟 label SSOT 並存兩處互相漂移、
 * 2026-05-29 收斂到 lib/status/。
 *
 * StatusTone 是 StatusBadge 的 5 種視覺語意 pill 樣式
 * （pending/info/success/warning/danger/neutral）。
 */

import type { StatusTone } from '@/components/ui/status-badge'
import type { StatusType } from './labels'

export type { StatusType } from './labels'

/**
 * type × status → StatusTone
 * 找不到回傳 'neutral'
 */
export const STATUS_TONE_MAP: Record<StatusType, Record<string, StatusTone>> = {
  order: {
    pending: 'pending',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger',
  },
  payment_request: {
    pending: 'pending',
    confirmed: 'info',
    paid: 'success',
    // 防呆：歷史殘留值、業務語意等同 paid（2026-05-15 SSOT 盤點）
    billed: 'success',
  },
  receipt: {
    // DB 數字字串（legacy）
    '0': 'pending',
    '1': 'success',
    '2': 'danger',
    // 英文 enum（對齊 DB CHECK: draft/pending/pending_verify/confirmed/refunded/rejected）
    draft: 'neutral',
    pending: 'pending',
    pending_verify: 'warning',
    confirmed: 'success',
    refunded: 'danger',
    rejected: 'danger',
  },
  disbursement: {
    pending: 'pending',
    confirmed: 'info',
    paid: 'success',
  },
  tour: {
    template: 'neutral',
    proposal: 'pending',
    upcoming: 'success',
    ongoing: 'success',
    returned: 'warning',
    closed: 'neutral',
    // 兼容舊值
    proposed: 'pending',
  },
  quote: {
    draft: 'neutral',
    proposed: 'pending',
    revised: 'info',
    approved: 'success',
    converted: 'info',
    rejected: 'danger',
  },
  invoice: {
    draft: 'neutral',
    pending: 'pending',
    scheduled: 'info',
    issued: 'success',
    voided: 'danger',
    allowance: 'info',
    failed: 'danger',
    approved: 'success',
    paid: 'info',
    rejected: 'danger',
  },
  voucher: {
    draft: 'pending',
    posted: 'success',
    reversed: 'danger',
    locked: 'info',
  },
  check: {
    pending: 'pending',
    cleared: 'success',
    bounced: 'danger',
    cancelled: 'neutral',
    deposited: 'info',
    issued: 'info',
  },
  todo: {
    pending: 'pending',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'neutral',
  },
  tour_request: {
    pending: 'pending',
    draft: 'neutral',
    in_progress: 'info',
    replied: 'info',
    confirmed: 'success',
    completed: 'info',
    cancelled: 'danger',
  },
  esim: {
    '0': 'pending',
    '1': 'success',
    '2': 'danger',
  },
  employee: {
    active: 'neutral',
    probation: 'warning',
    leave: 'info',
    terminated: 'danger',
    // 兼容其他寫法
    inactive: 'neutral',
    suspended: 'warning',
    on_leave: 'info',
  },
  payment: {
    unpaid: 'pending',
    partial: 'warning',
    paid: 'success',
    refunded: 'danger',
  },
  contract: {
    draft: 'neutral',
    unsigned: 'pending',
    signed: 'success',
    cancelled: 'danger',
  },
  ai_agent: {
    active: 'success',
    disabled: 'neutral',
  },
  invoice_batch: {
    pending: 'pending',
    partial: 'warning',
    paid: 'success',
    cancelled: 'danger',
  },
  itinerary: {
    draft: 'neutral',
    published: 'success',
  },
  kb_sailing: {
    available: 'success',
    limited: 'warning',
    waitlist: 'warning',
    sold_out: 'danger',
    cancelled: 'danger',
    tentative: 'neutral',
  },
  workspace_billing: {
    pending: 'pending',
    paid: 'success',
    overdue: 'danger',
  },
  generic: {},
}

/**
 * Lookup helper：type × status → tone
 */
export function getStatusTone(type: StatusType, status: string | null | undefined): StatusTone {
  if (!status) return 'neutral'
  const map = STATUS_TONE_MAP[type]
  return map?.[status] ?? 'neutral'
}
