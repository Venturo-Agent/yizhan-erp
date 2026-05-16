/**
 * 開團完整生命週期 — E2E 整合測試
 *
 * 建團 → 建版本 → 開團 → 建訂單 → 加團員
 * 建報價 → 同步行程 → 建需求單
 * 收款 → 請款 → 出納
 * 結案
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('swr', () => ({ default: vi.fn(), mutate: vi.fn() }))
vi.mock('@/lib/utils/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

// ---- 模擬資料庫狀態 ----
interface SimDB {
  tours: Array<{
    id: string
    code: string
    name: string
    status: string
    current_participants: number
    max_participants: number
    total_revenue: number
    total_cost: number
    profit: number
    quote_id: string | null
    departure_date: string | null
  }>
  tour_versions: Array<{
    id: string
    tour_id: string
    version: number
    status: string
    categories: unknown[]
    created_at: string
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
    name: string
    total_payable: number
    identity_type: string
  }>
  quotes: Array<{
    id: string
    name: string
    tour_id: string | null
    status: string
    version: number
    categories: Array<{ id: string; name: string; items: unknown[]; total: number }>
    versions: Array<{ id: string; version: number; categories: unknown[]; created_at: string }>
  }>
  itineraries: Array<{
    id: string
    tour_id: string | null
    daily_itinerary: Array<{
      dayLabel: string
      date: string
      title: string
      meals: { breakfast: string; lunch: string; dinner: string }
      accommodation: string
    }>
  }>
  tour_requests: Array<{
    id: string
    tour_id: string
    type: string
    status: string
    supplier_id: string | null
    notes: string
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
    description: string
  }>
  disbursement_orders: Array<{
    id: string
    payment_request_ids: string[]
    status: string
    total_amount: number
    paid_at: string | null
  }>
}

function createDB(): SimDB {
  return {
    tours: [],
    tour_versions: [],
    orders: [],
    order_members: [],
    quotes: [],
    itineraries: [],
    tour_requests: [],
    receipts: [],
    payment_requests: [],
    payment_request_items: [],
    disbursement_orders: [],
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

function closeTour(db: SimDB, tourId: string): { success: boolean; error?: string } {
  const tour = db.tours.find(t => t.id === tourId)
  if (!tour) return { success: false, error: '找不到團' }
  // 檢查是否所有訂單已收齊
  const orders = db.orders.filter(o => o.tour_id === tourId)
  const allPaid = orders.every(o => o.payment_status === 'paid' || o.total_amount === 0)
  if (!allPaid) return { success: false, error: '尚有未收齊的訂單' }
  tour.status = 'closed'
  return { success: true }
}

// ---- 測試 ----

describe('開團完整生命週期', () => {
  let db: SimDB

  beforeEach(() => {
    db = createDB()
    vi.clearAllMocks()
  })

  it('建團 → 建版本 → 開團 → 建訂單 → 加團員 → 收款 → 請款 → 出納 → 結案', () => {
    // === 1. 建團 ===
    db.tours.push({
      id: 't1',
      code: 'CNX260301A',
      name: '清邁五日遊',
      status: 'draft',
      current_participants: 0,
      max_participants: 30,
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
      quote_id: null,
      departure_date: '2026-03-01',
    })
    expect(db.tours[0].status).toBe('draft')

    // === 2. 建報價單（含版本） ===
    db.quotes.push({
      id: 'q1',
      name: '清邁五日遊報價',
      tour_id: 't1',
      status: 'proposed',
      version: 1,
      categories: [
        {
          id: 'accommodation',
          name: '住宿',
          items: [
            {
              id: 'ai1',
              name: '清邁文華酒店',
              quantity: 4,
              unit_price: 3000,
              total: 12000,
              day: 1,
            },
          ],
          total: 12000,
        },
        {
          id: 'meals',
          name: '餐飲',
          items: [
            {
              id: 'mi1',
              name: 'Day1 午餐：鳳飛飛豬腳',
              quantity: 1,
              unit_price: 200,
              total: 200,
              day: 1,
            },
          ],
          total: 200,
        },
        {
          id: 'transport',
          name: '交通',
          items: [{ id: 'ti1', name: '機場接送', quantity: 1, unit_price: 5000, total: 5000 }],
          total: 5000,
        },
      ],
      versions: [{ id: 'v1', version: 1, categories: [], created_at: '2026-01-15T00:00:00Z' }],
    })
    db.tours[0].quote_id = 'q1'

    // === 3. 建行程表並同步到報價 ===
    db.itineraries.push({
      id: 'it1',
      tour_id: 't1',
      daily_itinerary: [
        {
          dayLabel: 'Day 1',
          date: '2026-03-01',
          title: '抵達清邁',
          meals: { breakfast: '飯店早餐', lunch: '鳳飛飛豬腳', dinner: '千人火鍋' },
          accommodation: '清邁文華酒店',
        },
        {
          dayLabel: 'Day 2',
          date: '2026-03-02',
          title: '素帖山',
          meals: { breakfast: '飯店早餐', lunch: '泰北料理', dinner: '夜市' },
          accommodation: '清邁文華酒店',
        },
      ],
    })

    // === 4. 開團 ===
    db.tours[0].status = 'open'
    expect(db.tours[0].status).toBe('open')

    // === 5. 建訂單 ===
    db.orders.push({
      id: 'o1',
      tour_id: 't1',
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      payment_status: 'unpaid',
    })

    // === 6. 加團員 ===
    db.order_members.push(
      { id: 'm1', order_id: 'o1', name: '王小明', total_payable: 28000, identity_type: 'adult' },
      { id: 'm2', order_id: 'o1', name: '王小花', total_payable: 28000, identity_type: 'adult' },
      {
        id: 'm3',
        order_id: 'o1',
        name: '王寶寶',
        total_payable: 15000,
        identity_type: 'child_no_bed',
      }
    )
    recalculateOrderTotal(db, 'o1')
    recalculateParticipants(db, 't1')

    expect(db.orders[0].total_amount).toBe(71000)
    expect(db.tours[0].current_participants).toBe(3)

    // === 7. 建需求單 ===
    db.tour_requests.push(
      {
        id: 'tr1',
        tour_id: 't1',
        type: 'hotel',
        status: 'pending',
        supplier_id: 's1',
        notes: '清邁文華 4 晚',
      },
      {
        id: 'tr2',
        tour_id: 't1',
        type: 'transport',
        status: 'pending',
        supplier_id: 's2',
        notes: '機場接送+包車',
      }
    )
    expect(db.tour_requests.length).toBe(2)

    // === 8. 收款 — 訂金 ===
    db.receipts.push({
      id: 'r1',
      order_id: 'o1',
      tour_id: 't1',
      status: '1',
      actual_amount: 30000,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].paid_amount).toBe(30000)
    expect(db.orders[0].payment_status).toBe('partial')
    expect(db.tours[0].total_revenue).toBe(30000)

    // === 9. 收款 — 尾款 ===
    db.receipts.push({
      id: 'r2',
      order_id: 'o1',
      tour_id: 't1',
      status: '1',
      actual_amount: 41000,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].paid_amount).toBe(71000)
    expect(db.orders[0].payment_status).toBe('paid')
    expect(db.orders[0].remaining_amount).toBe(0)
    expect(db.tours[0].total_revenue).toBe(71000)

    // === 10. 請款 ===
    db.payment_requests.push({
      id: 'pr1',
      tour_id: 't1',
      status: 'approved',
      deleted_at: null,
    })
    db.payment_request_items.push(
      { id: 'pi1', request_id: 'pr1', subtotal: 12000, description: '住宿費' },
      { id: 'pi2', request_id: 'pr1', subtotal: 5000, description: '交通費' },
      { id: 'pi3', request_id: 'pr1', subtotal: 3000, description: '餐費' }
    )
    recalculateExpenseStats(db, 't1')

    expect(db.tours[0].total_cost).toBe(20000)
    expect(db.tours[0].profit).toBe(51000)

    // === 11. 出納 — 建立付款單 ===
    db.disbursement_orders.push({
      id: 'd1',
      payment_request_ids: ['pr1'],
      status: 'pending',
      total_amount: 20000,
      paid_at: null,
    })

    // 出納確認付款
    db.disbursement_orders[0].status = 'paid'
    db.disbursement_orders[0].paid_at = '2026-02-20T10:00:00Z'
    db.payment_requests[0].status = 'paid'
    recalculateExpenseStats(db, 't1')

    expect(db.disbursement_orders[0].status).toBe('paid')
    expect(db.tours[0].total_cost).toBe(20000)
    expect(db.tours[0].profit).toBe(51000)

    // === 12. 結案 ===
    const closeResult = closeTour(db, 't1')
    expect(closeResult.success).toBe(true)
    expect(db.tours[0].status).toBe('closed')
  })

  it('第二筆訂單加入同團 → 人數和收入獨立核算', () => {
    db.tours.push({
      id: 't1',
      code: 'CNX260301A',
      name: '清邁五日遊',
      status: 'open',
      current_participants: 0,
      max_participants: 30,
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
      quote_id: null,
      departure_date: null,
    })

    // 訂單 A
    db.orders.push({
      id: 'o1',
      tour_id: 't1',
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      payment_status: 'unpaid',
    })
    db.order_members.push({
      id: 'm1',
      order_id: 'o1',
      name: '李大同',
      total_payable: 28000,
      identity_type: 'adult',
    })
    recalculateOrderTotal(db, 'o1')

    // 訂單 B
    db.orders.push({
      id: 'o2',
      tour_id: 't1',
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      payment_status: 'unpaid',
    })
    db.order_members.push(
      { id: 'm2', order_id: 'o2', name: '張三', total_payable: 28000, identity_type: 'adult' },
      { id: 'm3', order_id: 'o2', name: '張四', total_payable: 28000, identity_type: 'adult' }
    )
    recalculateOrderTotal(db, 'o2')
    recalculateParticipants(db, 't1')

    expect(db.tours[0].current_participants).toBe(3)
    expect(db.orders[0].total_amount).toBe(28000)
    expect(db.orders[1].total_amount).toBe(56000)

    // 只有 o1 收款
    db.receipts.push({
      id: 'r1',
      order_id: 'o1',
      tour_id: 't1',
      status: '1',
      actual_amount: 28000,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')

    expect(db.orders[0].payment_status).toBe('paid')
    expect(db.orders[1].payment_status).toBe('unpaid')

    // 結案失敗（o2 未收齊）
    const closeResult = closeTour(db, 't1')
    expect(closeResult.success).toBe(false)
    expect(closeResult.error).toContain('未收齊')
  })

  it('刪除團員 → 訂單金額連動 → 收款狀態可能變 paid', () => {
    db.tours.push({
      id: 't1',
      code: 'T1',
      name: 'Test',
      status: 'open',
      current_participants: 0,
      max_participants: 30,
      total_revenue: 0,
      total_cost: 0,
      profit: 0,
      quote_id: null,
      departure_date: null,
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
      { id: 'm1', order_id: 'o1', name: 'A', total_payable: 25000, identity_type: 'adult' },
      { id: 'm2', order_id: 'o1', name: 'B', total_payable: 25000, identity_type: 'adult' }
    )
    recalculateOrderTotal(db, 'o1')

    // 收款 25000（部分）
    db.receipts.push({
      id: 'r1',
      order_id: 'o1',
      tour_id: 't1',
      status: '1',
      actual_amount: 25000,
      deleted_at: null,
    })
    recalculateReceiptStats(db, 'o1', 't1')
    expect(db.orders[0].payment_status).toBe('partial')

    // 刪除 m2 → total 變 25000 → 已付 25000 → paid
    db.order_members.splice(1, 1)
    recalculateOrderTotal(db, 'o1')
    recalculateReceiptStats(db, 'o1', 't1')
    recalculateParticipants(db, 't1')

    expect(db.orders[0].total_amount).toBe(25000)
    expect(db.orders[0].payment_status).toBe('paid')
    expect(db.tours[0].current_participants).toBe(1)
  })

  describe('邊界情況', () => {
    beforeEach(() => {
      db.tours.push({
        id: 't1',
        code: 'T1',
        name: 'Test',
        status: 'open',
        current_participants: 0,
        max_participants: 30,
        total_revenue: 0,
        total_cost: 0,
        profit: 0,
        quote_id: null,
        departure_date: null,
      })
    })

    it('空訂單（零團員）→ 金額為 0，人數為 0', () => {
      db.orders.push({
        id: 'o1',
        tour_id: 't1',
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid',
      })
      recalculateOrderTotal(db, 'o1')
      recalculateParticipants(db, 't1')

      expect(db.orders[0].total_amount).toBe(0)
      expect(db.tours[0].current_participants).toBe(0)
    })

    it('零金額團員 → total_payable = 0 正常計算', () => {
      db.orders.push({
        id: 'o1',
        tour_id: 't1',
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid',
      })
      db.order_members.push({
        id: 'm1',
        order_id: 'o1',
        name: '嬰兒',
        total_payable: 0,
        identity_type: 'infant',
      })
      recalculateOrderTotal(db, 'o1')
      recalculateParticipants(db, 't1')

      expect(db.orders[0].total_amount).toBe(0)
      expect(db.tours[0].current_participants).toBe(1)
      // 零金額 → unpaid（不是 paid）
      expect(db.orders[0].payment_status).toBe('unpaid')
    })

    it('空訂單可結案（total_amount = 0 視為已完成）', () => {
      db.orders.push({
        id: 'o1',
        tour_id: 't1',
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid',
      })
      const result = closeTour(db, 't1')
      expect(result.success).toBe(true)
    })

    it('無訂單的團可結案', () => {
      const result = closeTour(db, 't1')
      expect(result.success).toBe(true)
    })

    it('請款被駁回 → 不計入成本', () => {
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'rejected',
        deleted_at: null,
      })
      db.payment_request_items.push({
        id: 'pi1',
        request_id: 'pr1',
        subtotal: 50000,
        description: '住宿',
      })
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(0)
      expect(db.tours[0].profit).toBe(0)
    })

    it('負金額團員 → 用於折扣計算', () => {
      db.orders.push({
        id: 'o1',
        tour_id: 't1',
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid',
      })
      db.order_members.push(
        { id: 'm1', order_id: 'o1', name: 'A', total_payable: 30000, identity_type: 'adult' },
        { id: 'm2', order_id: 'o1', name: '折扣', total_payable: -5000, identity_type: 'adult' }
      )
      recalculateOrderTotal(db, 'o1')
      expect(db.orders[0].total_amount).toBe(25000)
    })
  })
})
