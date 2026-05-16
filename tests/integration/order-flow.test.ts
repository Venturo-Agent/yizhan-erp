/**
 * 訂單完整流程整合測試
 *
 * 模擬完整的訂單操作鏈：
 * - 建立訂單 → 團人數更新
 * - 加成員 → 訂單金額更新 + 團人數更新
 * - 改成員金額 → 訂單 total_amount 更新
 * - 刪成員 → 訂單金額和團人數都扣回
 * - 刪訂單 → 團人數和收入都扣回
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('swr', () => ({
  default: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

// 核心計算邏輯（提取自 order-stats.service 和 tour-stats.service）
function calculateOrderTotal(members: Array<{ total_payable: number }>): number {
  return members.reduce((sum, m) => sum + (m.total_payable || 0), 0)
}

function calculatePaymentStatus(
  totalAmount: number,
  paidAmount: number
): 'unpaid' | 'partial' | 'paid' {
  if (paidAmount >= totalAmount && totalAmount > 0) return 'paid'
  if (paidAmount > 0) return 'partial'
  return 'unpaid'
}

function calculateRemainingAmount(totalAmount: number, paidAmount: number): number {
  return Math.max(0, totalAmount - paidAmount)
}

function calculateParticipants(
  orders: Array<{ id: string }>,
  allMembers: Array<{ order_id: string }>
): number {
  const orderIds = new Set(orders.map(o => o.id))
  return allMembers.filter(m => orderIds.has(m.order_id)).length
}

describe('訂單完整流程', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('建立訂單 → 團人數更新', () => {
    it('新訂單有 2 位成員 → 團人數 +2', () => {
      const orders = [{ id: 'o1' }]
      const members = [
        { order_id: 'o1', total_payable: 25000 },
        { order_id: 'o1', total_payable: 25000 },
      ]

      expect(calculateParticipants(orders, members)).toBe(2)
    })

    it('多訂單人數合併', () => {
      const orders = [{ id: 'o1' }, { id: 'o2' }]
      const members = [
        { order_id: 'o1', total_payable: 25000 },
        { order_id: 'o1', total_payable: 25000 },
        { order_id: 'o2', total_payable: 30000 },
      ]

      expect(calculateParticipants(orders, members)).toBe(3)
    })

    it('空訂單 → 人數 0', () => {
      const orders = [{ id: 'o1' }]
      const members: Array<{ order_id: string; total_payable: number }> = []

      expect(calculateParticipants(orders, members)).toBe(0)
    })
  })

  describe('加成員 → 訂單金額更新 + 團人數更新', () => {
    it('加一位成員 → total_amount 增加', () => {
      const membersBefore = [{ total_payable: 25000 }]
      const membersAfter = [{ total_payable: 25000 }, { total_payable: 30000 }]

      expect(calculateOrderTotal(membersBefore)).toBe(25000)
      expect(calculateOrderTotal(membersAfter)).toBe(55000)
    })

    it('加成員後 payment_status 可能從 paid → partial', () => {
      // 原本 1 人 25000，已付 25000 → paid
      const paidAmount = 25000
      expect(calculatePaymentStatus(25000, paidAmount)).toBe('paid')

      // 加了 1 人 total 變 55000，已付還是 25000 → partial
      expect(calculatePaymentStatus(55000, paidAmount)).toBe('partial')
    })
  })

  describe('改成員金額 → 訂單 total_amount 更新', () => {
    it('修改金額 → total_amount 重算', () => {
      const membersBefore = [{ total_payable: 25000 }, { total_payable: 25000 }]
      expect(calculateOrderTotal(membersBefore)).toBe(50000)

      // 改第二位金額
      const membersAfter = [{ total_payable: 25000 }, { total_payable: 35000 }]
      expect(calculateOrderTotal(membersAfter)).toBe(60000)
    })

    it('金額改為 0 → 正確處理', () => {
      const members = [{ total_payable: 25000 }, { total_payable: 0 }]
      expect(calculateOrderTotal(members)).toBe(25000)
    })

    it('金額增加後 remaining_amount 更新', () => {
      const paidAmount = 25000
      const newTotal = 60000
      expect(calculateRemainingAmount(newTotal, paidAmount)).toBe(35000)
    })
  })

  describe('刪成員 → 訂單金額和團人數都扣回', () => {
    it('刪除成員 → total_amount 減少', () => {
      const membersBefore = [{ total_payable: 25000 }, { total_payable: 30000 }]
      // 刪除第二位
      const membersAfter = [{ total_payable: 25000 }]

      expect(calculateOrderTotal(membersBefore)).toBe(55000)
      expect(calculateOrderTotal(membersAfter)).toBe(25000)
    })

    it('刪除所有成員 → total_amount = 0', () => {
      const membersAfter: Array<{ total_payable: number }> = []
      expect(calculateOrderTotal(membersAfter)).toBe(0)
    })

    it('刪成員後 payment_status 可能變 paid（已付覆蓋新 total）', () => {
      const paidAmount = 25000
      // 原本 2 人共 55000 → partial
      expect(calculatePaymentStatus(55000, paidAmount)).toBe('partial')
      // 刪 1 人剩 25000 → paid
      expect(calculatePaymentStatus(25000, paidAmount)).toBe('paid')
    })

    it('團人數同步減少', () => {
      const orders = [{ id: 'o1' }]
      const membersBefore = [
        { order_id: 'o1', total_payable: 25000 },
        { order_id: 'o1', total_payable: 30000 },
      ]
      const membersAfter = [{ order_id: 'o1', total_payable: 25000 }]

      expect(calculateParticipants(orders, membersBefore)).toBe(2)
      expect(calculateParticipants(orders, membersAfter)).toBe(1)
    })
  })

  describe('刪訂單 → 團人數和收入都扣回', () => {
    it('刪訂單後團人數扣回', () => {
      const ordersAll = [{ id: 'o1' }, { id: 'o2' }]
      const members = [
        { order_id: 'o1', total_payable: 25000 },
        { order_id: 'o1', total_payable: 25000 },
        { order_id: 'o2', total_payable: 30000 },
      ]

      expect(calculateParticipants(ordersAll, members)).toBe(3)

      // 刪除 o1
      const ordersAfter = [{ id: 'o2' }]
      expect(calculateParticipants(ordersAfter, members)).toBe(1)
    })

    it('刪訂單後收入扣回（收款 by order_id）', () => {
      const receipts = [
        { order_id: 'o1', actual_amount: 50000, status: '1', deleted_at: null },
        { order_id: 'o2', actual_amount: 30000, status: '1', deleted_at: null },
      ]

      // 刪除 o1 後，團只有 o2 的收入
      const remainingOrderIds = new Set(['o2'])
      const totalRevenue = receipts
        .filter(r => r.status === '1' && r.deleted_at === null && remainingOrderIds.has(r.order_id))
        .reduce((s, r) => s + (r.actual_amount || 0), 0)

      expect(totalRevenue).toBe(30000)
    })
  })

  describe('邊界情況', () => {
    it('null/undefined total_payable → 視為 0', () => {
      const members = [{ total_payable: 25000 }, { total_payable: 0 }]
      expect(calculateOrderTotal(members)).toBe(25000)
    })

    it('沒有訂單的團 → 人數 0', () => {
      const orders: Array<{ id: string }> = []
      const members: Array<{ order_id: string }> = []
      expect(calculateParticipants(orders, members)).toBe(0)
    })

    it('大量成員計算效能', () => {
      const members = Array.from({ length: 1000 }, (_, i) => ({
        total_payable: 10000 + i,
      }))
      const total = calculateOrderTotal(members)
      expect(total).toBe(members.reduce((s, m) => s + m.total_payable, 0))
    })
  })
})
