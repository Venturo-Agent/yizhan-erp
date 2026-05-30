/**
 * 狀態文字 (label) SSOT — 中央集中表
 *
 * 為什麼：原本 3 套並存（status/financial.ts + status/tour.ts 的 StatusConfig.label、
 * lib/design/status-tone-map.ts 的 STATUS_LABEL_MAP、lib/constants/status-maps.ts 的
 * getXxxStatusLabel）、改文案要動 3 處、漂移嚴重。2026-05-29 收斂到本檔。
 *
 * 文案規則（William 多次拍板、保留歷史脈絡註解）：
 * - payment_request（請款單）：pending=未付款 / confirmed=待付款 / paid=已付款（2026-05-15）
 * - disbursement（出納單）：對齊請款單 3 階段語意（2026-05-21）
 * - receipt：pending = pending_verify = '待確認'（會計待勾稽、2026-05-21）
 * - proposed 一律叫「提案」（quote / tour）
 *
 * 此檔只放 label / type union、tone 在 tone.ts、StatusConfig（含 icon/color）在 financial.ts + tour.ts
 */

/**
 * 全站支援的 status type
 *
 * 核心 11 個 type（payment / disbursement / invoice / voucher / receipt / quote /
 * tour / order / tour_request / todo / esim）有 StatusConfig（含 icon + bgColor）
 * 在 financial.ts / tour.ts 定義。
 *
 * 額外 type（payment_request / check / employee / contract / ai_agent /
 * invoice_batch / itinerary / kb_sailing / workspace_billing / generic）只走 label + tone、
 * 不走 StatusConfig（StatusBadge 場景）。
 */
export type StatusType =
  | 'order'
  | 'payment_request' // 請款單（pending=未付款 / confirmed=待付款 / paid=已付款）
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
 * type × status → 中文 label
 *
 * 找不到時 getStatusLabelFor 回傳原值（讓未對應的 status 自然顯示原始字串）
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
    pending: '未付款', // 新建請款單
    confirmed: '待付款', // 已綁定出納單、等實際付款
    paid: '已付款', // 款項實際匯出（含舊 billed / approved 一律歸這）
    // 防呆：歷史殘留值、業務語意等同 paid（2026-05-15 SSOT 盤點）
    billed: '已付款',
  },
  receipt: {
    // 數字字串（legacy）
    '0': '待確認',
    '1': '已確認',
    '2': '異常',
    // 英文 enum（對齊 DB CHECK + receipt.types.ts RECEIPT_STATUS_LABELS）
    // 2026-05-21 William 拍板：pending = pending_verify = '待確認'（會計待勾稽）
    pending: '待確認',
    pending_verify: '待確認',
    confirmed: '已確認',
    rejected: '已退回',
    cancelled: '已取消',
    refunded: '已退款',
  },
  disbursement: {
    // 2026-05-21 William 拍板對齊請款單 3 狀態語意（未付款 / 待付款 / 已付款）
    pending: '未付款',
    confirmed: '待付款',
    paid: '已付款',
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
    待出發: '待出發',
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
 * Lookup helper：type × status → label
 * 找不到回傳原值（讓 caller 自然顯示）
 */
export function getStatusLabelFor(type: StatusType, status: string | null | undefined): string {
  if (!status) return ''
  const map = STATUS_LABEL_MAP[type]
  return map?.[status] ?? status
}
