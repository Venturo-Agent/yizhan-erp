// Finance settings 共用 types + 常數 labels
// 從 page.tsx 抽出、避免 sub-components 各自重複定義

export type { PaymentMethodKind } from '@/constants/payment-method'
export { PAYMENT_METHOD_KIND_LABELS } from '@/constants/payment-method'

import type { PaymentMethodKind } from '@/constants/payment-method'

export interface PaymentMethod {
  id: string
  code: string
  name: string
  type: 'receipt' | 'payment' // 收款 or 請款
  description: string | null
  placeholder: string | null // 付款資訊提示文字
  is_active: boolean
  is_system: boolean
  sort_order: number
  debit_account_id: string | null
  credit_account_id: string | null
  debit_account: { id: string; code: string; name: string } | null
  credit_account: { id: string; code: string; name: string } | null
  fee_percent: number // 百分比手續費（如 2.00 = 2%）
  fee_fixed: number // 單筆固定手續費（例：跨行匯款 30 元）
  fee_account_id: string | null // 手續費科目（如 6100 刷卡手續費費用）
  fee_account: { id: string; code: string; name: string } | null
  /** 種類 — 取代舊 is_wire_transfer flag、未來各 kind 走獨立邏輯 */
  kind: PaymentMethodKind | null
  /** B 方案 provider 欄位：誰來處理金流（2026-05-22）
   * - manual = 不接 API、自己處理
   * - sinopac_card / sinopac_collect / sinopac_apple_pay / sinopac_google_pay / sinopac_samsung_pay
   */
  provider: string
}

export interface PlatformPaymentProvider {
  code: string
  provider_name: string
  provider_kind: string // card / wire_transfer / wallet / manual
  enabled: boolean
  description: string | null
}

export interface BankAccount {
  id: string
  code: string
  name: string
  bank_code: string | null // onboarding fix pack 2026-05-10：FK to ref_banks
  bank_name: string | null
  account_number: string | null
  is_default: boolean
  is_active: boolean
  /** 可作為出帳帳戶（出納單 wizard 列入選項）2026-05-15 William 拍板 */
  is_disbursement_eligible?: boolean
  /** 跨行匯款每筆手續費（譬如 10 元）、2026-05-21 William 拍板加 */
  cross_bank_fee?: number
}

export interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: string // API 返回的是 type（轉換自 account_type）
  account_type?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_active: boolean
  is_system: boolean
  sort_order: number
  debit_account_id: string | null
  credit_account_id: string | null
  debit_account?: { id: string; code: string; name: string } | null
  credit_account?: { id: string; code: string; name: string } | null
}

export type ActiveSection =
  | 'receipt'
  | 'payment'
  | 'bank'
  | 'category'
  | 'company_expense'
  | 'company_income'
  | 'bonus'

export const PAGE_LABELS = {
  COL_NAME: '名稱',
  COL_DESCRIPTION: '說明',
  COL_PAYMENT_HINT: '付款提示',
  COL_DEBIT_ACCOUNT: '借方科目',
  COL_CREDIT_ACCOUNT: '貸方科目',
  COL_STATUS: '狀態',
  COL_ACTION: '操作',
  COL_CODE: '代碼',
  COL_BANK: '銀行',
  COL_ACCOUNT_NUMBER: '帳號',
  COL_DEFAULT: '預設',
  COL_SORT: '排序',
  NOT_SET: '未設定',
  DEFAULT_BADGE: '預設',
  BONUS_SETTINGS: '獎金設定',
  COMING_SOON: '即將推出',
  NAME_PLACEHOLDER: '例：現金、匯款、信用卡',
  DESCRIPTION_LABEL: '說明',
  DESCRIPTION_PLACEHOLDER: '選填',
  PAYMENT_INFO_HINT: '付款資訊提示',
  PAYMENT_INFO_PLACEHOLDER: '例：帳號後五碼、收款人、調閱編號',
  EXAMPLE_2: '例：2',
  FEE_ACCOUNT: '手續費科目',
  NO_BIND: '不綁定',
  CODE_PLACEHOLDER: '例：ESUN',
  BANK_NAME_PLACEHOLDER: '例：玉山銀行',
  BANK_FULL_NAME: '銀行全名',
  BANK_FULL_NAME_PLACEHOLDER: '例：玉山商業銀行',
  ACCOUNT_NUMBER_LABEL: '帳號',
  ACCOUNT_NUMBER_PLACEHOLDER: '例：0000-1234-5678-90',
  SET_AS_DEFAULT: '設為預設帳戶',
  CATEGORY_NAME_PLACEHOLDER: '例：住宿、交通、餐食',
  PLEASE_SELECT: '請選擇',
  SORT: '排序',
} as const
