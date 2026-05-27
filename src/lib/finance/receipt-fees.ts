/**
 * 收款單手續費計算 — SSOT（2026-05-27 William 拍板）
 *
 * 規則：手續費 =（應收 × 費率%）+ 固定費，再「無條件進位到整數」（個位數、無小數）。
 *
 * 為什麼抽到這裡：原本散在 3 處各自用 Math.round（四捨五入）、且寫法還不一致
 *   （confirm-payment 把固定費也包進取整）。統一一處改、全站生效，
 *   避免將來各改各的漏掉（對應開發品管 #7：三份重複就抽）。
 *
 * 為什麼用進位不四捨五入：手續費是公司付給銀行的成本，進位記法較保守
 *   （寧可多認列一點成本）。William 拍板。
 *
 * 方向（外扣）：公司實收 = 應收 − 手續費。旅遊團收入彙總用的是實收，
 *   所以進位會讓團收入誠實地少個零頭（每筆 < 1 元）。
 */

export interface ReceiptFeeResult {
  /** 手續費（無條件進位後的整數） */
  fees: number
  /** 實收淨額 = 應收 − 手續費 */
  actualAmount: number
}

/**
 * 算收款單的手續費與實收淨額。
 *
 * @param receiptAmount 應收金額（客人原價）
 * @param feePercent    費率百分比（如 2 = 2%）
 * @param feeFixed      單筆固定手續費
 */
export function calculateReceiptFees(
  receiptAmount: number,
  feePercent: number,
  feeFixed: number
): ReceiptFeeResult {
  const fees = Math.ceil((receiptAmount * feePercent) / 100 + feeFixed)
  return { fees, actualAmount: receiptAmount - fees }
}
