/**
 * 狀態值對照表 / 常數 SSOT
 *
 * 2026-05-29 B7 收斂：本檔保留為「**狀態值常數 + 業務判斷 helper**」SSOT
 * （TOUR_STATUS / ORDER_STATUS_MAP / isTourLocked / canConfirmTour 等）、
 * label 中文顯示 SSOT 已收進 @/lib/status/、本檔 getXxxStatusLabel 改為純委派。
 */

import { getStatusLabelFor } from '@/lib/status'

// ============================================
// 旅遊團狀態對照表（DB 存英文、UI 顯示中文）
// ============================================

/**
 * Tour Lifecycle 狀態列表（6 個值）
 *
 * 生命週期: template → proposal → upcoming → ongoing → returned → closed
 * 取消走封存維度（archived=true, archive_reason='cancelled'）、不是狀態
 * 封存是獨立欄位、跟狀態正交
 */
export const TOUR_STATUS_LIST = [
  'template',
  'proposal',
  'upcoming',
  'ongoing',
  'returned',
  'closed',
] as const

type TourStatusValue = (typeof TOUR_STATUS_LIST)[number]

/**
 * 旅遊團狀態常數 - 避免魔法字串
 */
export const TOUR_STATUS = {
  TEMPLATE: 'template',
  PROPOSAL: 'proposal',
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  RETURNED: 'returned',
  CLOSED: 'closed',
} as const satisfies Record<string, TourStatusValue>

/**
 * 判斷團是否已鎖定（不可自由編輯）
 * 鎖定時機：出發之後（ongoing / returned / closed）
 */
export function isTourLocked(status: string | null): boolean {
  return (
    status === TOUR_STATUS.ONGOING ||
    status === TOUR_STATUS.RETURNED ||
    status === TOUR_STATUS.CLOSED
  )
}

/**
 * 判斷團是否可進入開團流程（proposal → upcoming）
 */
export function canConfirmTour(status: string | null): boolean {
  return status === TOUR_STATUS.PROPOSAL
}

// ============================================
// 訂單狀態對照表
// ============================================

export const ORDER_STATUS_MAP = {
  pending_review: '待處理',
  hk: '待確認',
  kk: '已確認',
  hl: '候補',
  lk: '候補成功',
} as const

export const ORDER_STATUS_REVERSE_MAP = {
  待處理: 'pending_review',
  待確認: 'hk',
  已確認: 'kk',
  候補: 'hl',
  候補成功: 'lk',
} as const

type OrderStatusKey = keyof typeof ORDER_STATUS_MAP
type OrderStatusValue = (typeof ORDER_STATUS_MAP)[OrderStatusKey]

// ============================================
// 付款狀態對照表
// ============================================

export const PAYMENT_STATUS_MAP = {
  unpaid: '未收款',
  partial: '部分收款',
  paid: '已收款',
  refunded: '已退款',
} as const

export const PAYMENT_STATUS_REVERSE_MAP = {
  未收款: 'unpaid',
  部分收款: 'partial',
  已收款: 'paid',
  已退款: 'refunded',
} as const

type PaymentStatusKey = keyof typeof PAYMENT_STATUS_MAP
type PaymentStatusValue = (typeof PAYMENT_STATUS_MAP)[PaymentStatusKey]

// ============================================
// 報價單狀態對照表
// ============================================

export const QUOTE_STATUS_MAP = {
  draft: '草稿',
  proposed: '開團',
  revised: '修改中',
  待出發: '待出發',
  approved: '已核准',
  converted: '已轉單',
  rejected: '已拒絕',
} as const

const _QUOTE_STATUS_REVERSE_MAP = {
  草稿: 'draft',
  提案: 'proposed',
  修改中: 'revised',
  進行中: '待出發',
  已核准: 'approved',
  已轉單: 'converted',
  已拒絕: 'rejected',
} as const

type QuoteStatusKey = keyof typeof QUOTE_STATUS_MAP
type QuoteStatusValue = (typeof QUOTE_STATUS_MAP)[QuoteStatusKey]

// ============================================
// 財務類型對照表
// ============================================

export const FINANCE_TYPE_MAP = {
  receipt: '收款',
  request: '請款',
  disbursement: '出納',
} as const

const _FINANCE_TYPE_REVERSE_MAP = {
  收款: 'receipt',
  請款: 'request',
  出納: 'disbursement',
} as const

type FinanceTypeKey = keyof typeof FINANCE_TYPE_MAP
type FinanceTypeValue = (typeof FINANCE_TYPE_MAP)[FinanceTypeKey]

// ============================================
// 合約狀態對照表
// ============================================

export const CONTRACT_STATUS_MAP = {
  unsigned: '未簽署',
  signed: '已簽署',
} as const

const _CONTRACT_STATUS_REVERSE_MAP = {
  未簽署: 'unsigned',
  已簽署: 'signed',
} as const

type ContractStatusKey = keyof typeof CONTRACT_STATUS_MAP
type ContractStatusValue = (typeof CONTRACT_STATUS_MAP)[ContractStatusKey]

// ============================================
// 付款方式對照表
// ============================================

export const PAYMENT_METHOD_MAP = {
  cash: '現金',
  transfer: '匯款',
  card: '刷卡',
  check: '支票',
} as const

const _PAYMENT_METHOD_REVERSE_MAP = {
  現金: 'cash',
  匯款: 'transfer',
  刷卡: 'card',
  支票: 'check',
} as const

type PaymentMethodKey = keyof typeof PAYMENT_METHOD_MAP
type PaymentMethodValue = (typeof PAYMENT_METHOD_MAP)[PaymentMethodKey]

// ============================================
// 輔助函數
// ============================================

/**
 * 取得旅遊團狀態的中文顯示（英文值 → 中文 label）
 * 過渡期：DB 若仍存中文值、fallback 直接回傳原字串。
 *
 * 2026-05-29 B7：label SSOT 統一委派至 @/lib/status
 */
export function getTourStatusLabel(status: string | null | undefined): string {
  return getStatusLabelFor('tour', status)
}

/**
 * 取得訂單狀態的中文顯示
 *
 * 註：ORDER_STATUS_MAP 是業務專用的訂單狀態（hk/kk/hl/lk/pending_review）、
 * 跟 @/lib/status 的 order type（pending/confirmed/completed/cancelled）非同集合、
 * 此 helper 保留走 ORDER_STATUS_MAP。
 */
export function getOrderStatusLabel(status: OrderStatusKey | string): string {
  return ORDER_STATUS_MAP[status as OrderStatusKey] || status
}

/**
 * 取得付款狀態的中文顯示
 *
 * 2026-05-29 B7：label SSOT 統一委派至 @/lib/status（payment type）
 */
export function getPaymentStatusLabel(status: PaymentStatusKey | string): string {
  return getStatusLabelFor('payment', status)
}

/**
 * 取得報價單狀態的中文顯示
 *
 * 2026-05-29 B7：label SSOT 統一委派至 @/lib/status（quote type）
 */
export function getQuoteStatusLabel(status: QuoteStatusKey | string): string {
  return getStatusLabelFor('quote', status)
}

/**
 * 取得財務類型的中文顯示
 */
export function getFinanceTypeLabel(type: FinanceTypeKey | string): string {
  return FINANCE_TYPE_MAP[type as FinanceTypeKey] || type
}

/**
 * 取得合約狀態的中文顯示
 */
export function getContractStatusLabel(status: ContractStatusKey | string): string {
  return CONTRACT_STATUS_MAP[status as ContractStatusKey] || status
}

/**
 * 取得付款方式的中文顯示
 */
export function getPaymentMethodLabel(method: PaymentMethodKey | string): string {
  return PAYMENT_METHOD_MAP[method as PaymentMethodKey] || method
}
