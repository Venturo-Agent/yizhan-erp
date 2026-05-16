/**
 * 財務完整流程 — E2E 整合測試
 *
 * 收款：建立 → 確認 → 統計更新
 * 請款：建立 → 審核 → 出納 → 付款
 * 團損益計算正確性
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
  receipts: Array<{
    id: string
    order_id: string
    tour_id: string
    status: string
    actual_amount: number | null
    deleted_at: string | null
    payment_method: string
    notes: string
  }>
  payment_requests: Array<{
    id: string
    tour_id: string
    status: string
    deleted_at: string | null
    approved_by: string | null
    approved_at: string | null
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
    payment_method: string | null
  }>
}

function createDB(): SimDB {
  return {
    tours: [],
    orders: [],
    receipts: [],
    payment_requests: [],
    payment_request_items: [],
    disbursement_orders: [],
  }
}

// ---- 核心計算邏輯 ----

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
  const validStatuses = ['pending', 'approved', 'confirmed', 'paid']
  const validRequests = db.payment_requests.filter(
    r => r.tour_id === tourId && !r.deleted_at && validStatuses.includes(r.status)
  )
  const validIds = new Set(validRequests.map(r => r.id))
  const totalCost = db.payment_request_items
    .filter(i => validIds.has(i.request_id))
    .reduce((s, i) => s + (i.subtotal || 0), 0)
  tour.total_cost = totalCost
  tour.profit = tour.total_revenue - totalCost
}

function approvePaymentRequest(db: SimDB, requestId: string, approver: string): boolean {
  const req = db.payment_requests.find(r => r.id === requestId)
  if (!req || req.status !== 'pending') return false
  req.status = 'approved'
  req.approved_by = approver
  req.approved_at = new Date().toISOString()
  return true
}

function createDisbursement(
  db: SimDB,
  requestIds: string[]
): { success: boolean; disbursementId?: string; error?: string } {
  const requests = db.payment_requests.filter(r => requestIds.includes(r.id))
  if (requests.some(r => r.status !== 'approved')) {
    return { success: false, error: '有未審核的請款單' }
  }
  const itemTotal = db.payment_request_items
    .filter(i => requestIds.includes(i.request_id))
    .reduce((s, i) => s + i.subtotal, 0)

  const id = `d${db.disbursement_orders.length + 1}`
  db.disbursement_orders.push({
    id,
    payment_request_ids: requestIds,
    status: 'pending',
    total_amount: itemTotal,
    paid_at: null,
    payment_method: null,
  })
  requests.forEach(r => (r.status = 'confirmed'))
  return { success: true, disbursementId: id }
}

function payDisbursement(db: SimDB, disbursementId: string, method: string): boolean {
  const disb = db.disbursement_orders.find(d => d.id === disbursementId)
  if (!disb || disb.status !== 'pending') return false
  disb.status = 'paid'
  disb.paid_at = new Date().toISOString()
  disb.payment_method = method
  // 更新關聯的請款單狀態
  const requests = db.payment_requests.filter(r => disb.payment_request_ids.includes(r.id))
  requests.forEach(r => (r.status = 'paid'))
  return true
}

// ---- 測試 ----

describe('財務完整流程', () => {
  let db: SimDB

  beforeEach(() => {
    db = createDB()
    db.tours.push({ id: 't1', total_revenue: 0, total_cost: 0, profit: 0 })
    db.orders.push({
      id: 'o1',
      tour_id: 't1',
      total_amount: 100000,
      paid_amount: 0,
      remaining_amount: 100000,
      payment_status: 'unpaid',
    })
    vi.clearAllMocks()
  })

  describe('收款：建立 → 確認 → 統計更新', () => {
    it('建立未確認收款 → 不影響統計', () => {
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '0',
        actual_amount: null,
        deleted_at: null,
        payment_method: 'bank_transfer',
        notes: '訂金',
      })
      recalculateReceiptStats(db, 'o1', 't1')

      expect(db.orders[0].paid_amount).toBe(0)
      expect(db.orders[0].payment_status).toBe('unpaid')
      expect(db.tours[0].total_revenue).toBe(0)
    })

    it('確認收款 → 訂單和團統計更新', () => {
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 50000,
        deleted_at: null,
        payment_method: 'bank_transfer',
        notes: '訂金',
      })
      recalculateReceiptStats(db, 'o1', 't1')

      expect(db.orders[0].paid_amount).toBe(50000)
      expect(db.orders[0].remaining_amount).toBe(50000)
      expect(db.orders[0].payment_status).toBe('partial')
      expect(db.tours[0].total_revenue).toBe(50000)
    })

    it('多筆收款確認 → 累加', () => {
      db.receipts.push(
        {
          id: 'r1',
          order_id: 'o1',
          tour_id: 't1',
          status: '1',
          actual_amount: 50000,
          deleted_at: null,
          payment_method: 'bank_transfer',
          notes: '',
        },
        {
          id: 'r2',
          order_id: 'o1',
          tour_id: 't1',
          status: '1',
          actual_amount: 50000,
          deleted_at: null,
          payment_method: 'cash',
          notes: '',
        }
      )
      recalculateReceiptStats(db, 'o1', 't1')

      expect(db.orders[0].paid_amount).toBe(100000)
      expect(db.orders[0].payment_status).toBe('paid')
      expect(db.orders[0].remaining_amount).toBe(0)
    })

    it('刪除收款 → 統計扣回', () => {
      db.receipts.push(
        {
          id: 'r1',
          order_id: 'o1',
          tour_id: 't1',
          status: '1',
          actual_amount: 60000,
          deleted_at: null,
          payment_method: '',
          notes: '',
        },
        {
          id: 'r2',
          order_id: 'o1',
          tour_id: 't1',
          status: '1',
          actual_amount: 40000,
          deleted_at: null,
          payment_method: '',
          notes: '',
        }
      )
      recalculateReceiptStats(db, 'o1', 't1')
      expect(db.orders[0].payment_status).toBe('paid')

      // 刪除 r2
      db.receipts[1].deleted_at = new Date().toISOString()
      recalculateReceiptStats(db, 'o1', 't1')

      expect(db.orders[0].paid_amount).toBe(60000)
      expect(db.orders[0].payment_status).toBe('partial')
      expect(db.tours[0].total_revenue).toBe(60000)
    })

    it('超額收款 → paid 且 remaining = 0', () => {
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 120000,
        deleted_at: null,
        payment_method: '',
        notes: '含退費',
      })
      recalculateReceiptStats(db, 'o1', 't1')

      expect(db.orders[0].paid_amount).toBe(120000)
      expect(db.orders[0].payment_status).toBe('paid')
      expect(db.orders[0].remaining_amount).toBe(0) // Math.max(0, ...) 保護
    })
  })

  describe('請款：建立 → 審核 → 出納 → 付款', () => {
    it('完整請款流程：pending → approved → confirmed → paid', () => {
      // 1. 建立請款
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'pending',
        deleted_at: null,
        approved_by: null,
        approved_at: null,
      })
      db.payment_request_items.push(
        { id: 'pi1', request_id: 'pr1', subtotal: 30000, description: '住宿費' },
        { id: 'pi2', request_id: 'pr1', subtotal: 10000, description: '交通費' }
      )
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(40000)

      // 2. 審核
      const approved = approvePaymentRequest(db, 'pr1', 'manager-1')
      expect(approved).toBe(true)
      expect(db.payment_requests[0].status).toBe('approved')
      expect(db.payment_requests[0].approved_by).toBe('manager-1')

      // 3. 建立出納單
      const disbResult = createDisbursement(db, ['pr1'])
      expect(disbResult.success).toBe(true)
      expect(db.payment_requests[0].status).toBe('confirmed')

      // 4. 付款
      const paid = payDisbursement(db, disbResult.disbursementId!, 'bank_transfer')
      expect(paid).toBe(true)
      expect(db.payment_requests[0].status).toBe('paid')
      expect(db.disbursement_orders[0].status).toBe('paid')
      expect(db.disbursement_orders[0].paid_at).not.toBeNull()

      // 成本不變
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(40000)
    })

    it('未審核的請款不能建出納單', () => {
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'pending',
        deleted_at: null,
        approved_by: null,
        approved_at: null,
      })
      const result = createDisbursement(db, ['pr1'])
      expect(result.success).toBe(false)
      expect(result.error).toContain('未審核')
    })

    it('多筆請款合併出納', () => {
      db.payment_requests.push(
        {
          id: 'pr1',
          tour_id: 't1',
          status: 'approved',
          deleted_at: null,
          approved_by: 'mgr',
          approved_at: '2026-01-01',
        },
        {
          id: 'pr2',
          tour_id: 't1',
          status: 'approved',
          deleted_at: null,
          approved_by: 'mgr',
          approved_at: '2026-01-02',
        }
      )
      db.payment_request_items.push(
        { id: 'pi1', request_id: 'pr1', subtotal: 20000, description: '住宿' },
        { id: 'pi2', request_id: 'pr2', subtotal: 15000, description: '餐費' }
      )

      const result = createDisbursement(db, ['pr1', 'pr2'])
      expect(result.success).toBe(true)
      expect(db.disbursement_orders[0].total_amount).toBe(35000)
      expect(db.disbursement_orders[0].payment_request_ids).toEqual(['pr1', 'pr2'])
    })

    it('刪除請款 → 成本扣回', () => {
      db.payment_requests.push(
        {
          id: 'pr1',
          tour_id: 't1',
          status: 'approved',
          deleted_at: null,
          approved_by: null,
          approved_at: null,
        },
        {
          id: 'pr2',
          tour_id: 't1',
          status: 'approved',
          deleted_at: null,
          approved_by: null,
          approved_at: null,
        }
      )
      db.payment_request_items.push(
        { id: 'pi1', request_id: 'pr1', subtotal: 30000, description: '' },
        { id: 'pi2', request_id: 'pr2', subtotal: 20000, description: '' }
      )
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(50000)

      db.payment_requests[1].deleted_at = new Date().toISOString()
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(30000)
    })

    it('駁回請款 → 不計入成本', () => {
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'rejected',
        deleted_at: null,
        approved_by: null,
        approved_at: null,
      })
      db.payment_request_items.push({
        id: 'pi1',
        request_id: 'pr1',
        subtotal: 50000,
        description: '',
      })
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(0)
    })

    it('重複審核（已 approved 再 approve）→ 失敗', () => {
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'approved',
        deleted_at: null,
        approved_by: 'mgr',
        approved_at: '2026-01-01',
      })
      const result = approvePaymentRequest(db, 'pr1', 'mgr2')
      expect(result).toBe(false) // status !== 'pending'
    })
  })

  describe('團損益計算正確性', () => {
    it('利潤 = 總收入 - 總成本', () => {
      // 收入
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 100000,
        deleted_at: null,
        payment_method: '',
        notes: '',
      })
      recalculateReceiptStats(db, 'o1', 't1')

      // 成本
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'approved',
        deleted_at: null,
        approved_by: null,
        approved_at: null,
      })
      db.payment_request_items.push({
        id: 'pi1',
        request_id: 'pr1',
        subtotal: 60000,
        description: '',
      })
      recalculateExpenseStats(db, 't1')

      expect(db.tours[0].total_revenue).toBe(100000)
      expect(db.tours[0].total_cost).toBe(60000)
      expect(db.tours[0].profit).toBe(40000)
    })

    it('多訂單收入合併到團', () => {
      db.orders.push({
        id: 'o2',
        tour_id: 't1',
        total_amount: 80000,
        paid_amount: 0,
        remaining_amount: 80000,
        payment_status: 'unpaid',
      })
      db.receipts.push(
        {
          id: 'r1',
          order_id: 'o1',
          tour_id: 't1',
          status: '1',
          actual_amount: 100000,
          deleted_at: null,
          payment_method: '',
          notes: '',
        },
        {
          id: 'r2',
          order_id: 'o2',
          tour_id: 't1',
          status: '1',
          actual_amount: 80000,
          deleted_at: null,
          payment_method: '',
          notes: '',
        }
      )
      recalculateReceiptStats(db, 'o1', 't1')
      recalculateReceiptStats(db, 'o2', 't1')

      expect(db.tours[0].total_revenue).toBe(180000)
    })

    it('虧損團 → 利潤為負數', () => {
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 30000,
        deleted_at: null,
        payment_method: '',
        notes: '',
      })
      recalculateReceiptStats(db, 'o1', 't1')

      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'approved',
        deleted_at: null,
        approved_by: null,
        approved_at: null,
      })
      db.payment_request_items.push({
        id: 'pi1',
        request_id: 'pr1',
        subtotal: 50000,
        description: '',
      })
      recalculateExpenseStats(db, 't1')

      expect(db.tours[0].profit).toBe(-20000)
    })

    it('收入成本都為零 → 利潤為零', () => {
      recalculateReceiptStats(db, null, 't1')
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].profit).toBe(0)
    })
  })

  describe('邊界情況', () => {
    it('零金額收款 → actual_amount = 0 不影響狀態', () => {
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: 0,
        deleted_at: null,
        payment_method: '',
        notes: '',
      })
      recalculateReceiptStats(db, 'o1', 't1')
      expect(db.orders[0].payment_status).toBe('unpaid') // 0 不算 partial
    })

    it('null actual_amount → 視為 0', () => {
      db.receipts.push({
        id: 'r1',
        order_id: 'o1',
        tour_id: 't1',
        status: '1',
        actual_amount: null,
        deleted_at: null,
        payment_method: '',
        notes: '',
      })
      recalculateReceiptStats(db, 'o1', 't1')
      expect(db.orders[0].paid_amount).toBe(0)
    })

    it('請款項目 subtotal 為 0 → 不影響成本', () => {
      db.payment_requests.push({
        id: 'pr1',
        tour_id: 't1',
        status: 'approved',
        deleted_at: null,
        approved_by: null,
        approved_at: null,
      })
      db.payment_request_items.push({
        id: 'pi1',
        request_id: 'pr1',
        subtotal: 0,
        description: '免費項目',
      })
      recalculateExpenseStats(db, 't1')
      expect(db.tours[0].total_cost).toBe(0)
    })

    it('多團互不干擾', () => {
      db.tours.push({ id: 't2', total_revenue: 0, total_cost: 0, profit: 0 })
      db.orders.push({
        id: 'o2',
        tour_id: 't2',
        total_amount: 50000,
        paid_amount: 0,
        remaining_amount: 50000,
        payment_status: 'unpaid',
      })

      db.receipts.push(
        {
          id: 'r1',
          order_id: 'o1',
          tour_id: 't1',
          status: '1',
          actual_amount: 100000,
          deleted_at: null,
          payment_method: '',
          notes: '',
        },
        {
          id: 'r2',
          order_id: 'o2',
          tour_id: 't2',
          status: '1',
          actual_amount: 50000,
          deleted_at: null,
          payment_method: '',
          notes: '',
        }
      )
      recalculateReceiptStats(db, 'o1', 't1')
      recalculateReceiptStats(db, 'o2', 't2')

      expect(db.tours[0].total_revenue).toBe(100000)
      expect(db.tours[1].total_revenue).toBe(50000)

      db.payment_requests.push(
        {
          id: 'pr1',
          tour_id: 't1',
          status: 'approved',
          deleted_at: null,
          approved_by: null,
          approved_at: null,
        },
        {
          id: 'pr2',
          tour_id: 't2',
          status: 'approved',
          deleted_at: null,
          approved_by: null,
          approved_at: null,
        }
      )
      db.payment_request_items.push(
        { id: 'pi1', request_id: 'pr1', subtotal: 60000, description: '' },
        { id: 'pi2', request_id: 'pr2', subtotal: 30000, description: '' }
      )
      recalculateExpenseStats(db, 't1')
      recalculateExpenseStats(db, 't2')

      expect(db.tours[0].profit).toBe(40000) // 100000 - 60000
      expect(db.tours[1].profit).toBe(20000) // 50000 - 30000
    })
  })
})
