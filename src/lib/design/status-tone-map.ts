/**
 * 全站 Status SSOT — tone + label 集中表
 *
 * StatusBadge 是冠軍 component、本檔提供 type × status → tone/label 的 lookup。
 *
 * 文案規則：
 * - proposed 一律叫「提案」
 * - finance 系列 pending 一律叫「待處理」
 * - 列印場景的 status display 不走這裡（依公司客製）
 *
 * 用法：
 *   <StatusBadge type="order" status={order.status} />
 *   <StatusBadge type="payment_request" status={req.status} />
 *
 * 也支援 tone + label 直接傳入：
 *   <StatusBadge tone="success" label="已完成" />
 */

import type { StatusTone } from '@/components/ui/status-badge'

/**
 * 所有支援的 status type
 * （新增業務 type 時加在這裡）
 */
export type StatusType =
  | 'order'
  | 'payment_request' // 請款單（pending=未付款 / confirmed=待付款 / paid=已付款 三狀態）
  | 'receipt' // 收款單（draft/pending/pending_verify/confirmed/refunded/rejected、含 DB 字串 '0'/'1'/'2'）
  | 'disbursement' // 出納單（pending/confirmed/paid）
  | 'tour' // 旅遊團（template/proposal/upcoming/ongoing/returned/closed）
  | 'quote' // 報價單
  | 'invoice' // 發票（含代轉發票）
  | 'voucher' // 會計傳票
  | 'check' // 支票
  | 'todo' // 待辦事項
  | 'tour_request' // 需求單
  | 'esim' // eSIM 網卡
  | 'employee' // 員工狀態
  | 'payment' // 訂單付款狀態（unpaid/partial/paid/refunded）
  | 'contract' // 合約簽署狀態（draft/signed/cancelled）
  | 'ai_agent' // AI agent（active/disabled）
  | 'invoice_batch' // 發票批次（pending/partial/paid/cancelled）
  | 'itinerary' // 行程（draft/published）
  | 'kb_sailing' // 知識庫航次（available/limited/waitlist/sold_out/cancelled/tentative）
  | 'workspace_billing' // 工作區帳單（pending/paid/overdue）
  | 'generic' // 兜底通用

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
 * type × status → 中文 label
 * 找不到回傳原值（讓未對應的 status 自然顯示原始字串）
 */
export const STATUS_LABEL_MAP: Record<StatusType, Record<string, string>> = {
  order: {
    pending: '待處理',
    confirmed: '已確認',
    completed: '已完成',
    cancelled: '已取消',
  },
  payment_request: {
    // 2026-05-15 William 拍板：請款單只有 3 狀態、舊值已批次 UPDATE 進 paid
    pending: '未付款',     // 新建請款單
    confirmed: '待付款',   // 已綁定出納單、等實際付款
    paid: '已付款',        // 款項實際匯出（含舊 billed / approved 一律歸這）
    // 防呆：歷史殘留值、業務語意等同 paid（2026-05-15 SSOT 盤點）
    billed: '已付款',
  },
  receipt: {
    // 數字字串（legacy）
    '0': '待處理',
    '1': '已確認',
    '2': '異常',
    // 英文 enum（對齊 DB CHECK）
    draft: '草稿',
    pending: '待處理',
    pending_verify: '待驗證',
    confirmed: '已確認',
    refunded: '已退款',
    rejected: '已拒絕',
  },
  disbursement: {
    // 2026-05-15 William 拍板對齊請款單 3 狀態語意（未付款 / 待付款 / 已付款）
    pending: '未付款',     // 出納單建好、尚未實際出帳
    confirmed: '待付款',   // 已確認、等實際付款（理論流程、實際 DB 暫無此狀態）
    paid: '已付款',        // 款項實際匯出
  },
  tour: {
    template: '模板',
    proposal: '提案',
    upcoming: '即將出發',
    ongoing: '旅行中',
    returned: '未結案',
    closed: '已結案',
    proposed: '提案', // 同 proposal alias
  },
  quote: {
    draft: '草稿',
    proposed: '提案',
    revised: '修改中',
    approved: '已核准',
    converted: '已轉單',
    rejected: '已拒絕',
  },
  invoice: {
    draft: '草稿',
    pending: '待處理',
    scheduled: '預約中',
    issued: '已開立',
    voided: '已作廢',
    allowance: '已折讓',
    failed: '失敗',
    approved: '已核准',
    paid: '已付款',
    rejected: '已駁回',
  },
  voucher: {
    draft: '草稿',
    posted: '已過帳',
    reversed: '已沖銷',
    locked: '已鎖定',
  },
  check: {
    pending: '待處理',
    cleared: '已兌現',
    bounced: '已退票',
    cancelled: '已取消',
    deposited: '已存入',
    issued: '已開立',
  },
  todo: {
    pending: '待處理',
    in_progress: '進行中',
    completed: '已完成',
    cancelled: '已取消',
  },
  tour_request: {
    pending: '待處理',
    draft: '草稿',
    in_progress: '處理中',
    replied: '已回復',
    confirmed: '已確認',
    completed: '已完成',
    cancelled: '已取消',
  },
  esim: {
    '0': '待處理',
    '1': '已確認',
    '2': '錯誤',
  },
  employee: {
    active: '在職',
    inactive: '停用',
    suspended: '暫停',
    terminated: '離職',
    on_leave: '請假中',
  },
  payment: {
    unpaid: '未收款',
    partial: '部分收款',
    paid: '已收款',
    refunded: '已退款',
  },
  contract: {
    draft: '草稿',
    unsigned: '未簽署',
    signed: '已簽署',
    cancelled: '已取消',
  },
  ai_agent: {
    active: '啟用中',
    disabled: '已停用',
  },
  invoice_batch: {
    pending: '待處理',
    partial: '部分付款',
    paid: '已付款',
    cancelled: '已取消',
  },
  itinerary: {
    draft: '草稿',
    published: '已發佈',
  },
  kb_sailing: {
    available: '可預訂',
    limited: '少量',
    waitlist: '候補',
    sold_out: '售完',
    cancelled: '已取消',
    tentative: '暫定',
  },
  workspace_billing: {
    pending: '待繳款',
    paid: '已繳款',
    overdue: '逾期',
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

/**
 * Lookup helper：type × status → label
 * 找不到回傳原值（讓 caller 自然顯示）
 */
export function getStatusLabelFor(type: StatusType, status: string | null | undefined): string {
  if (!status) return ''
  const map = STATUS_LABEL_MAP[type]
  return map?.[status] ?? status
}
