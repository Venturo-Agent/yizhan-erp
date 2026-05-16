/**
 * 全流程整合測試 — 跨模組聯動
 *
 * 模擬從開團到結團的完整財務流程：
 * 開團 → 建訂單 → 加成員 → 收款 → 請款 → 驗證團利潤
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('swr', () => ({ default: vi.fn(), mutate: vi.fn() }))
vi.mock('@/lib/utils/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

// ---- 模擬資料庫狀態 ----
interface SimDB {
  tours: Array<{
    id: string
    code: string
    current_participants: number
    total_revenue: number
    total_cost: number
    profit: number
  }>
  orders: Array<{
    id: string
    tour_id: string
    total_amount: number
    paid_amount: number
    remaining_amount: number
    payment_status: string
  }>
  order_members: Array<{
    id: string
    order_id: string
    total_payable: number
  }>
  receipts: Array<{
    id: string
    order_id: string
    tour_id: string
    status: string
    actual_amount: number | null
    deleted_at: string | null
  }>
  payment_requests: Array<{
    id: string
    tour_id: string
    status: string
    deleted_at: string | null
  }>
  payment_request_items: Array<{
    id: string
    request_id: string
    subtotal: number
  }>
}

function createDB(): SimDB {
  return {
    tours: [],
    orders: [],
    order_members: [],
    receipts: [],
    payment_requests: [],
    payment_request_items: [],
  }
}

// ---- 模擬 service 操作 ----
function recalculateParticipants(db: SimDB, tourId: string) {
  const orderIds = db.orders.filter(o => o.tour_id === tourId).map(o => o.id)
  const count = db.order_members.filter(m => orderIds.includes(m.order_id)).length
  const tour = db.tours.find(t => t.id === tourId)
  if (tour) tour.current_participants = count
}

function recalculateOrderTotal(db: SimDB, orderId: string) {
  const members = db.order_members.filter(m => m.order_id === orderId)
  const total = members.reduce((s, m) => s + (m.total_payable || 0), 0)
  const order = db.orders.find(o => o.id === orderId)
  if (!order) return
  order.total_amount = total
  order.remaining_amount = Math.max(0, total - order.paid_amount)
  if (order.paid_amount >= total && total > 0) order.payment_status = 'paid'
  else if (order.paid_amount > 0) order.payment_status = 'partial'
  else order.payment_status = 'unpaid'
}

function recalculateReceiptStats(db: SimDB, orderId: string | null, tourId: string | null) {
  if (orderId) {
    const order = db.orders.find(o => o.id === orderId)
    if (!order) return
    const confirmed = db.receipts.filter(
      r => r.order_id === orderId && r.status === '1' && !r.deleted_at
    )
    const totalPaid = confirmed.reduce((s, r) => s + (r.actual_amount || 0), 0)
    order.paid_amount = totalPaid
    order.remaining_amount = Math.max(0, order.total_amount - totalPaid)
    if (totalPaid >= order.total_amount && order.total_amount > 0) order.payment_status = 'paid'
    else if (totalPaid > 0) order.payment_status = 'partial'
    else order.payment_status = 'unpaid'
  }
  if (tourId) {
    const tour = db.tours.find(t => t.id === tourId)
    if (!tour) return
    const orderIds = db.orders.filter(o => o.tour_id === tourId).map(o => o.id)
    const validReceipts = db.receipts.filter(
      r =>
        r.status === '1' && !r.deleted_at && (orderIds.includes(r.order_id) || r.tour_id === tourId)
    )
    tour.total_revenue = validReceipts.reduce((s, r) => s + (r.actual_amount || 0), 0)
    tour.profit = tour.total_revenue - tour.total_cost
  }
}

function recalculateExpenseStats(db: SimDB, tourId: string) {
  const tour = db.tours.find(t => t.id === tourId)
  if (!tour) return
  const validRequests = db.payment_requests.filter(
    r =>
      r.tour_id === tourId &&
      !r.deleted_at &&
      ['pending', 'approved', 'confirmed', 'paid'].includes(r.status)
  )
  const validIds = new Set(validRequests.map(r => r.id))
  const totalCost = db.payment_request_items
    .filter(i => validIds.has(i.request_id))
    .reduce((s, i) => s + (i.subtotal || 0), 0)
  tour.total_cost = totalCost
  tour.profit = tour.total_revenue - totalCost
}

// ---- 測試 ----

describe('完整生命週期', () => {
  it('開團 → 建訂單 → 加成員 → 收款確認 → 請款 → 驗證團利潤', () => {
    const db = createDB()

    // 1. 開團
    db.tours.push({
      id: 't1',
      code: 'CNX260301A',
      current_participants: 0,
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
    })
    expect(db.tours[0].current_participants).toBe(0)

    // 2. 建訂單
    db.orders.push({
      id: 'o1',
      tour_id: 't1',
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      payment_status: 'unpaid',
    })

    // 3. 加成員 (2 人)
    db.order_members.push(
      { id: 'm1', order_id: 'o1', total_payable: 25000 },
      { id: 'm2', order_id: 'o1', total_payable: 30000 }
    )
    recalculateOrderTotal(db, 'o1')
    recalculateParticipants(db, 't1')

    expect(db.orders[0].total_amount).toBe(55000)
    expect(db.tours[0].current_participants).toBe(2)

    // 4. 建立收款 (未確認)
    db.receipts.push({
      id: 'r1',
      order_id: 'o1',
      tour_id: 't1',
      status: '0',
      actual_amount: null,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')
    expect(db.orders[0].paid_amount).toBe(0)
    expect(db.orders[0].payment_status).toBe('unpaid')

    // 5. 確認收款 (部分)
    db.receipts[0].status = '1'
    db.receipts[0].actual_amount = 30000
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].paid_amount).toBe(30000)
    expect(db.orders[0].payment_status).toBe('partial')
    expect(db.orders[0].remaining_amount).toBe(25000)
    expect(db.tours[0].total_revenue).toBe(30000)

    // 6. 第二筆收款直接確認
    db.receipts.push({
      id: 'r2',
      order_id: 'o1',
      tour_id: 't1',
      status: '1',
      actual_amount: 25000,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].paid_amount).toBe(55000)
    expect(db.orders[0].payment_status).toBe('paid')
    expect(db.orders[0].remaining_amount).toBe(0)
    expect(db.tours[0].total_revenue).toBe(55000)

    // 7. 建立請款
    db.payment_requests.push({
      id: 'pr1',
      tour_id: 't1',
      status: 'approved',
      deleted_at: null,
    })
    db.payment_request_items.push(
      { id: 'pi1', request_id: 'pr1', subtotal: 15000 },
      { id: 'pi2', request_id: 'pr1', subtotal: 10000 }
    )
    recalculateExpenseStats(db, 't1')

    expect(db.tours[0].total_cost).toBe(25000)
    expect(db.tours[0].profit).toBe(30000) // 55000 - 25000

    // 8. 加第二筆請款
    db.payment_requests.push({
      id: 'pr2',
      tour_id: 't1',
      status: 'pending',
      deleted_at: null,
    })
    db.payment_request_items.push({ id: 'pi3', request_id: 'pr2', subtotal: 8000 })
    recalculateExpenseStats(db, 't1')

    expect(db.tours[0].total_cost).toBe(33000)
    expect(db.tours[0].profit).toBe(22000) // 55000 - 33000
  })

  it('刪除收款 → 利潤連動變化', () => {
    const db = createDB()
    db.tours.push({
      id: 't1',
      code: 'CNX260301A',
      current_participants: 1,
      total_revenue: 50000,
      total_cost: 20000,
      profit: 30000,
    })
    db.orders.push({
      id: 'o1',
      tour_id: 't1',
      total_amount: 50000,
      paid_amount: 50000,
      remaining_amount: 0,
      payment_status: 'paid',
    })
    db.receipts.push(
      {
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 30000,
        deleted_at: null,
      },
      {
        id: 'r2',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 20000,
        deleted_at: null,
      }
    )

    // 刪除 r2
    db.receipts[1].deleted_at = new Date().toISOString()
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].paid_amount).toBe(30000)
    expect(db.orders[0].payment_status).toBe('partial')
    expect(db.tours[0].total_revenue).toBe(30000)
    expect(db.tours[0].profit).toBe(10000) // 30000 - 20000
  })

  it('刪除訂單成員 → 金額與人數同步更新', () => {
    const db = createDB()
    db.tours.push({
      id: 't1',
      code: 'CNX260301A',
      current_participants: 0,
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
    })
    db.orders.push({
      id: 'o1',
      tour_id: 't1',
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      payment_status: 'unpaid',
    })
    db.order_members.push(
      { id: 'm1', order_id: 'o1', total_payable: 25000 },
      { id: 'm2', order_id: 'o1', total_payable: 30000 }
    )
    recalculateOrderTotal(db, 'o1')
    recalculateParticipants(db, 't1')

    expect(db.orders[0].total_amount).toBe(55000)
    expect(db.tours[0].current_participants).toBe(2)

    // 刪除 m2
    db.order_members.splice(1, 1)
    recalculateOrderTotal(db, 'o1')
    recalculateParticipants(db, 't1')

    expect(db.orders[0].total_amount).toBe(25000)
    expect(db.tours[0].current_participants).toBe(1)
  })

  it('多訂單獨立核算', () => {
    const db = createDB()
    db.tours.push({
      id: 't1',
      code: 'CNX260301A',
      current_participants: 0,
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
    })
    db.orders.push(
      {
        id: 'o1',
        tour_id: 't1',
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid',
      },
      {
        id: 'o2',
        tour_id: 't1',
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid',
      }
    )
    db.order_members.push(
      { id: 'm1', order_id: 'o1', total_payable: 25000 },
      { id: 'm2', order_id: 'o2', total_payable: 40000 }
    )

    recalculateOrderTotal(db, 'o1')
    recalculateOrderTotal(db, 'o2')
    recalculateParticipants(db, 't1')

    expect(db.orders[0].total_amount).toBe(25000)
    expect(db.orders[1].total_amount).toBe(40000)
    expect(db.tours[0].current_participants).toBe(2)

    // 只有 o1 收款
    db.receipts.push({
      id: 'r1',
      order_id: 'o1',
      tour_id: 't1',
      status: '1',
      actual_amount: 25000,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].payment_status).toBe('paid')
    expect(db.orders[1].payment_status).toBe('unpaid')
    expect(db.tours[0].total_revenue).toBe(25000)
  })
})
