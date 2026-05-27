import { describe, it, expect } from 'vitest'
import { calculateReceiptFees } from '../receipt-fees'

describe('calculateReceiptFees — 手續費無條件進位到整數', () => {
  it('有小數一律往上進位、不四捨五入（核心規則）', () => {
    // 100 × 1.001% = 1.001 → 進位 2（四捨五入會誤算成 1）
    expect(calculateReceiptFees(100, 1.001, 0).fees).toBe(2)
  })

  it('剛好整數時不會多進一位', () => {
    // 100 × 2% = 2.00 → 2
    expect(calculateReceiptFees(100, 2, 0).fees).toBe(2)
  })

  it('小數很接近上界也只進到該整數', () => {
    // 13800 × 2.013% = 277.794 → 進位 278
    expect(calculateReceiptFees(13800, 2.013, 0).fees).toBe(278)
  })

  it('固定費一併計入後才進位（不是各自取整再相加）', () => {
    // 100 × 1.5% = 1.5、+ 固定 30 = 31.5 → 進位 32
    expect(calculateReceiptFees(100, 1.5, 30).fees).toBe(32)
  })

  it('實收 = 應收 − 手續費', () => {
    const r = calculateReceiptFees(13800, 2.013, 0)
    expect(r.actualAmount).toBe(13800 - r.fees)
  })

  it('零費率、零固定費 → 手續費 0、實收等於應收', () => {
    expect(calculateReceiptFees(13800, 0, 0)).toEqual({ fees: 0, actualAmount: 13800 })
  })
})
