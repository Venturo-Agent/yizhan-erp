import { describe, it, expect } from 'vitest'

// Pure logic extracted from receipt-core.service for testing
function calculatePaymentStatus(
  orderTotalAmount: number,
  confirmedReceipts: { actual_amount: number | null }[]
): { totalPaid: number; status: 'unpaid' | 'partial' | 'paid'; remaining: number } {
  const totalPaid = confirmedReceipts.reduce((sum, r) => sum + (r.actual_amount || 0), 0)

  let status: 'unpaid' | 'partial' | 'paid' = 'unpaid'
  if (totalPaid >= orderTotalAmount && orderTotalAmount > 0) {
    status = 'paid'
  } else if (totalPaid > 0) {
    status = 'partial'
  }

  return { totalPaid, status, remaining: Math.max(0, orderTotalAmount - totalPaid) }
}

describe('payment status logic', () => {
  it('should be unpaid when no receipts', () => {
    const result = calculatePaymentStatus(10000, [])
    expect(result.status).toBe('unpaid')
    expect(result.remaining).toBe(10000)
  })

  it('should be partial when partially paid', () => {
    const result = calculatePaymentStatus(10000, [{ actual_amount: 3000 }])
    expect(result.status).toBe('partial')
    expect(result.remaining).toBe(7000)
  })

  it('should be paid when fully paid', () => {
    const result = calculatePaymentStatus(10000, [{ actual_amount: 5000 }, { actual_amount: 5000 }])
    expect(result.status).toBe('paid')
    expect(result.remaining).toBe(0)
  })

  it('should be paid when overpaid', () => {
    const result = calculatePaymentStatus(10000, [{ actual_amount: 15000 }])
    expect(result.status).toBe('paid')
    expect(result.remaining).toBe(0)
  })

  it('should handle null actual_amount', () => {
    const result = calculatePaymentStatus(10000, [{ actual_amount: 5000 }, { actual_amount: null }])
    expect(result.status).toBe('partial')
    expect(result.totalPaid).toBe(5000)
  })

  it('should be unpaid when order amount is 0', () => {
    const result = calculatePaymentStatus(0, [])
    expect(result.status).toBe('unpaid')
  })
})
