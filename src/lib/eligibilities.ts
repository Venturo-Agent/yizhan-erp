/**
 * Employee Eligibilities — 中央 SSOT
 *
 * 5/13 William 拍板：員工資格不是 role capability、是員工個人屬性。
 * role 只決定預設、employee_eligibilities 才是真相。
 *
 * 用途：
 *   - API route 驗證 code 合法性（白名單）
 *   - HR 員工編輯頁 checkbox 對應 label
 *   - 各下拉 hook 用常數、不再散刻字串
 *
 * 新增資格 code 流程：
 *   1. 在這裡加常數 + label
 *   2. 在 modules/* tabs 標 isEligibility=true（如果是新 tab）
 *   3. 寫 DB 補既有員工的 eligibility 預設（如果適用）
 */

export const ELIGIBILITY = {
  TOURS_AS_SALES: 'tours.as_sales',
  TOURS_AS_ASSISTANT: 'tours.as_assistant',
  TOURS_AS_CONTROLLER: 'tours.as_controller',
  FINANCE_ADVANCE_PAYMENT: 'finance.advance_payment',
} as const

export type EligibilityCode = (typeof ELIGIBILITY)[keyof typeof ELIGIBILITY]

export const ELIGIBILITY_CODES: ReadonlyArray<EligibilityCode> = [
  ELIGIBILITY.TOURS_AS_SALES,
  ELIGIBILITY.TOURS_AS_ASSISTANT,
  ELIGIBILITY.TOURS_AS_CONTROLLER,
  ELIGIBILITY.FINANCE_ADVANCE_PAYMENT,
]

export const ELIGIBILITY_CODE_SET: ReadonlySet<string> = new Set(ELIGIBILITY_CODES)

/** 中文 label、HR UI 顯示用 */
export const ELIGIBILITY_LABELS: Record<EligibilityCode, string> = {
  [ELIGIBILITY.TOURS_AS_SALES]: '業務（可被指派為訂單業務）',
  [ELIGIBILITY.TOURS_AS_ASSISTANT]: '助理（可被指派為訂單助理）',
  [ELIGIBILITY.TOURS_AS_CONTROLLER]: '團控（可被指派為旅遊團團控）',
  [ELIGIBILITY.FINANCE_ADVANCE_PAYMENT]: '代墊款人（可代墊請款）',
}

export function isValidEligibilityCode(code: string): code is EligibilityCode {
  return ELIGIBILITY_CODE_SET.has(code)
}
