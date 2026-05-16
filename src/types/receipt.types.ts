/**
 * 收款系統型別定義
 */

// ============================================
// 收款單（Receipt）
// ============================================

export interface Receipt {
  id: string
  receipt_number: string // R2501280001
  workspace_id: string
  order_id: string | null | undefined
  tour_id: string | null // 直接關聯團號，方便查詢
  customer_id: string | null // 付款人（客戶）ID
  customer_name: string | null | undefined // 付款人姓名（DB 欄位、用於顯示）
  order_number: string | null | undefined
  tour_name: string | null | undefined

  // 收款資訊
  receipt_date: string // ISO date
  payment_date: string // 付款日期（資料庫必填欄位）
  /** 寫死 4 大類字串、DB trigger 還用、新 code 走 payment_method_id（向後相容、勿刪） */
  payment_method: string
  /** SSOT — 付款方式 ID（FK to payment_methods）、列表 / 條件比對都讀這個 */
  payment_method_id: string | null
  /** PostgREST join 出來的 payment_methods row（顯示真實方式名字） */
  payment_methods?: { name: string; code: string } | null
  /** 數字 enum、DB auto_posting trigger 還在用 0-3、新 code 用 payment_method_id（向後相容、勿刪） */
  receipt_type: ReceiptType
  receipt_amount: number // 應收金額
  actual_amount: number // 實收金額
  status: ReceiptStatus // 'pending' | 'confirmed' | 'cancelled'

  // 收款方式相關欄位
  receipt_account: string | null // 付款人姓名/收款帳號
  bank_account_last5: string | null // 匯款後五碼 / 信用卡末四碼

  // 手續費（刷卡 / 匯款用、跟 fee_rate 配合計算）
  fees: number | null

  notes: string | null | undefined

  // 退款相關（null = 未退款）
  refunded_at: string | null | undefined
  refund_amount: number | null | undefined
  refund_voucher_id: string | null | undefined
  refund_notes: string | null | undefined
  refunded_by: string | null | undefined

  // 會計科目 ID（選填、關聯 chart_of_accounts）
  accounting_subject_id: string | null | undefined

  // 批量收款關聯（同一筆進帳的多張收款）
  batch_id: string | null | undefined

  // 系統欄位
  created_at: string
  created_by: string | null | undefined
  updated_at: string
  updated_by: string | null | undefined
  is_active: boolean
}

// ============================================
// （無）
// ============================================

// ============================================
// 列舉與常數
// ============================================

/**
 * 收款方式（向後相容、新 code 用 payment_methods.code 代替）
 *
 * 保留原因：DB auto_posting trigger 還在 case `receipt_type = 0/1/2/3`、
 * 寫入時還要塞 number 給 trigger 兼容。新 code 一律用 codeToReceiptType(code) 反推、
 * 不要直接寫 ReceiptType.X。等 trigger 重寫成 join payment_methods.code 後再砍 enum。
 *
 * 但 enum 不刪、避免歷史資料 receipt_type=4 解析失敗。
 */
export enum ReceiptType {
  BANK_TRANSFER = 0, // 匯款
  CASH = 1, // 現金
  CREDIT_CARD = 2, // 刷卡
  CHECK = 3, // 支票
}

export const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  [ReceiptType.BANK_TRANSFER]: '匯款',
  [ReceiptType.CASH]: '現金',
  [ReceiptType.CREDIT_CARD]: '刷卡',
  [ReceiptType.CHECK]: '支票',
}

/** 收款方式選項（for Select/Dropdown） */
export const RECEIPT_TYPE_OPTIONS = [
  { value: ReceiptType.BANK_TRANSFER, label: '匯款' },
  { value: ReceiptType.CASH, label: '現金' },
  { value: ReceiptType.CREDIT_CARD, label: '刷卡' },
  { value: ReceiptType.CHECK, label: '支票' },
] as const

// =============================================================================
// SSOT helper：payment_methods.code 為唯一真相
// receipt_type / payment_method 字串都從 code 反推、給 DB trigger 兼容
// 自訂方式（譬如「匯款-國泰」code = 'TRANSFER_KGI'）prefix 比對到大類
// =============================================================================

/** payment_methods.code → ReceiptType 數字（給 DB auto_posting trigger 兼容） */
export function codeToReceiptType(code: string | null | undefined): ReceiptType {
  if (!code) return ReceiptType.BANK_TRANSFER
  const upper = code.toUpperCase()
  if (upper === 'CASH' || upper.startsWith('CASH_')) return ReceiptType.CASH
  if (upper === 'CREDIT_CARD' || upper === 'CARD' || upper.startsWith('CREDIT_') || upper.startsWith('CARD_')) return ReceiptType.CREDIT_CARD
  if (upper === 'CHECK' || upper.startsWith('CHECK_')) return ReceiptType.CHECK
  // 'TRANSFER' / 'TRANSFER_KGI' / 'TRANSFER_TCB' 跟其他全 fallback 到匯款
  return ReceiptType.BANK_TRANSFER
}

/** payment_methods.code → 4 大類字串（receipts.payment_method 兼容欄位） */
export function codeToPaymentMethod(code: string | null | undefined): string {
  const t = codeToReceiptType(code)
  switch (t) {
    case ReceiptType.CASH: return 'cash'
    case ReceiptType.CREDIT_CARD: return 'card'
    case ReceiptType.CHECK: return 'check'
    case ReceiptType.BANK_TRANSFER:
    default: return 'transfer'
  }
}

/** 收款單付款方式標籤（對應資料庫 payment_method 字串值） */
export const RECEIPT_PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '刷卡',
  check: '支票',
}

/**
 * 收款狀態(跟 payment_requests 一致的英文 enum、DB CHECK constraint 限定)
 *
 * - pending:會計手動建、待會計核准(既有)
 * - pending_verify:客戶自助付款建、待會計對帳(2026-05-14 新增)
 * - confirmed:已確認、算入 invoice.paid_amount
 * - rejected:會計退回客戶自助付款(2026-05-14 新增)、客戶端會看到原因
 * - cancelled:已取消
 * - refunded:已退款
 */
export type ReceiptStatus =
  | 'pending'
  | 'pending_verify'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'refunded'

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  pending: '待確認',
  pending_verify: '客戶待對帳',
  confirmed: '已確認',
  rejected: '已退回',
  cancelled: '已取消',
  refunded: '已退款',
}

export const RECEIPT_STATUS_COLORS: Record<ReceiptStatus, string> = {
  pending: 'text-morandi-gold',
  pending_verify: 'text-status-warning',
  confirmed: 'text-morandi-green',
  rejected: 'text-morandi-red',
  cancelled: 'text-morandi-secondary',
  refunded: 'text-morandi-red',
}

export const RECEIPT_STATUS_ICONS: Record<ReceiptStatus, string> = {
  pending: '🟡',
  pending_verify: '🕒',
  confirmed: '✅',
  rejected: '❌',
  cancelled: '🚫',
  refunded: '↩️',
}

// ============================================
// 輔助函數
// ============================================

/**
 * 取得收款方式名稱
 */
export function getReceiptTypeName(type: ReceiptType): string {
  return RECEIPT_TYPE_LABELS[type] || '未知'
}

/**
 * 取得收款狀態名稱
 */
export function getReceiptStatusName(status: ReceiptStatus | string): string {
  return RECEIPT_STATUS_LABELS[status as ReceiptStatus] || '未知'
}

/**
 * 取得收款狀態顏色
 */
export function getReceiptStatusColor(status: ReceiptStatus | string): string {
  return RECEIPT_STATUS_COLORS[status as ReceiptStatus] || 'text-morandi-secondary'
}

// ============================================
// 表單資料型別
// ============================================

/**
 * 建立收款單的表單資料
 */
export interface CreateReceiptData {
  workspace_id: string
  order_id: string
  tour_id?: string // 直接關聯團號
  order_number: string
  tour_name?: string
  receipt_date: string
  receipt_type: ReceiptType
  receipt_amount: number
  actual_amount?: number
  status?: ReceiptStatus
  receipt_account?: string
  fees?: number
  notes?: string
}

/**
 * 更新收款單的表單資料
 */
export interface UpdateReceiptData {
  actual_amount?: number
  status?: ReceiptStatus
  notes?: string
}

/**
 * 收款項目（UI 表單用）
 */
export interface ReceiptItem {
  id: string // 臨時 ID（前端用）
  receipt_type: ReceiptType
  amount: number
  transaction_date: string

  // 真正的方式關聯（PaymentItemRow handleReceiptTypeChange 寫入）
  payment_method_id?: string | null // FK to payment_methods.id
  payment_method_code?: string | null // method.code snapshot（向下相容）

  receipt_account?: string
  fees?: number
  notes?: string
}

// ============================================
// DB 收款項目 (Receipt Item from database)
// ============================================

export interface DbReceiptItem {
  id: string
  receipt_id: string // 關聯的收款單

  // 關聯（可獨立移動）
  tour_id: string | null | undefined
  order_id: string | null | undefined
  customer_id: string | null | undefined

  // 金額
  receipt_amount: number
  actual_amount: number | null | undefined

  // 收款方式（SSOT 用 payment_method_id）
  payment_method_id: string | null | undefined
  /** DB trigger 還用、新 code 不寫（向後相容、勿刪） */
  payment_method: string
  /** DB trigger 還用、新 code 不寫（向後相容、勿刪） */
  receipt_type: number

  receipt_account: string | null | undefined
  fees: number | null | undefined

  // 備註與狀態
  notes: string | null | undefined
  status: string | null // '0':待確認 '1':已確認 '2':異常

  // 系統欄位
  workspace_id: string
  created_at: string | null | undefined
  updated_at: string | null | undefined
  created_by: string | null | undefined
  updated_by: string | null | undefined
  is_active: boolean
}

// 建立收款項目用
export type CreateReceiptItemData = Omit<DbReceiptItem, 'id' | 'created_at' | 'updated_at'>
