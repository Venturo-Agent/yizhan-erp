/**
 * Payment Receipt Types
 * 收款單相關型別定義
 *
 * 注意：RECEIPT_TYPES, ReceiptType, RECEIPT_TYPE_OPTIONS 從 @/types/receipt.types re-export
 */

// Re-export 統一的收款類型定義
export { ReceiptType, RECEIPT_TYPE_OPTIONS } from '@/types/receipt.types'

// 相容性別名（建議逐步遷移到 ReceiptType enum）
import { ReceiptType } from '@/types/receipt.types'
export const RECEIPT_TYPES = {
  BANK_TRANSFER: ReceiptType.BANK_TRANSFER,
  CASH: ReceiptType.CASH,
  CREDIT_CARD: ReceiptType.CREDIT_CARD,
  CHECK: ReceiptType.CHECK,
} as const

export const BANK_ACCOUNTS = [
  { value: '國泰', label: '國泰銀行' },
  { value: '合庫', label: '合作金庫' },
] as const

/**
 * 收款項目
 */
export interface PaymentItem {
  id: string
  receipt_type: ReceiptType
  payment_method_code?: string // DB payment_methods.code (CASH, TRANSFER, CREDIT_CARD, CHECK, etc.)
  payment_method_id?: string // DB payment_methods.id
  amount: number
  actual_amount?: number // 實收金額（核帳用）
  transaction_date: string

  // 通用欄位
  receipt_account?: string // 付款人姓名
  notes?: string // 備註
  fees?: number // 手續費（刷卡 / 匯款用）

  // 公司收款專屬
  accounting_subject_id?: string // 會計科目 ID（公司收款用）
}

/**
 * 收款表單資料
 */
export interface PaymentFormData {
  tour_id: string
  order_id: string
  receipt_date: string
  notes?: string
}
