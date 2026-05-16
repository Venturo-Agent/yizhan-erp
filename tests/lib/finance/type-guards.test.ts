import { describe, it, expect } from 'vitest'
import {
  isTourReceipt,
  isCompanyReceipt,
  isSalaryRequest,
  isCompanyRequest,
  isTourRequest,
} from '@/lib/finance/type-guards'
import type { Receipt } from '@/types/receipt.types'
import type { PaymentRequest } from '@/types/finance.types'

/**
 * 業務 risk:
 *   這些 type guard 是 finance/payments 與 finance/requests 列表頁的分流 SSOT。
 *   分錯邊 = 團體收款被算進公司收款（或反之）= 對帳金額錯、損益表錯。
 *   薪資判斷錯 = 薪資被算進公司營業費用、稅務申報失真。
 *   覆蓋目標：tour_id / order_id / request_type 各種組合 + 空字串 / null / undefined boundary。
 */

// ============================================
// Helpers — 最小化 fixture、只填 type guard 會讀的欄位
// ============================================

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    tour_id: null,
    order_id: null,
    // 其餘欄位 type guard 不讀、用 cast 補齊
    ...overrides,
  } as Receipt
}

function makeRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    tour_id: null,
    request_type: '',
    ...overrides,
  } as PaymentRequest
}

// ============================================
// Receipt 分流（團體 vs 公司）
// ============================================

describe('isTourReceipt', () => {
  it('returns true when tour_id present', () => {
    expect(isTourReceipt(makeReceipt({ tour_id: 'tour-001' }))).toBe(true)
  })

  it('returns true when order_id present (透過 order 綁團)', () => {
    expect(isTourReceipt(makeReceipt({ order_id: 'order-001' }))).toBe(true)
  })

  it('returns true when both tour_id and order_id present', () => {
    expect(
      isTourReceipt(makeReceipt({ tour_id: 'tour-001', order_id: 'order-001' }))
    ).toBe(true)
  })

  it('returns false when both null (= 公司進帳)', () => {
    expect(isTourReceipt(makeReceipt({ tour_id: null, order_id: null }))).toBe(false)
  })

  it('returns false when both undefined', () => {
    expect(
      isTourReceipt(makeReceipt({ tour_id: undefined as never, order_id: undefined }))
    ).toBe(false)
  })

  it('returns false when both empty string (空字串應視為未綁)', () => {
    expect(isTourReceipt(makeReceipt({ tour_id: '', order_id: '' }))).toBe(false)
  })
})

describe('isCompanyReceipt', () => {
  it('returns true when both tour_id and order_id null', () => {
    expect(isCompanyReceipt(makeReceipt({ tour_id: null, order_id: null }))).toBe(true)
  })

  it('returns true when both undefined', () => {
    expect(
      isCompanyReceipt(makeReceipt({ tour_id: undefined as never, order_id: undefined }))
    ).toBe(true)
  })

  it('returns true when both empty string', () => {
    expect(isCompanyReceipt(makeReceipt({ tour_id: '', order_id: '' }))).toBe(true)
  })

  it('returns false when tour_id present', () => {
    expect(isCompanyReceipt(makeReceipt({ tour_id: 'tour-001' }))).toBe(false)
  })

  it('returns false when only order_id present', () => {
    expect(isCompanyReceipt(makeReceipt({ order_id: 'order-001' }))).toBe(false)
  })
})

describe('isTourReceipt + isCompanyReceipt 互斥性', () => {
  // 業務不變式：任一 receipt 必恰好屬一邊、不能兩邊都中、不能兩邊都不中
  const cases: Array<{ tour_id: Receipt['tour_id']; order_id: Receipt['order_id'] }> = [
    { tour_id: 'tour-1', order_id: null },
    { tour_id: null, order_id: 'order-1' },
    { tour_id: 'tour-1', order_id: 'order-1' },
    { tour_id: null, order_id: null },
    { tour_id: '', order_id: '' },
    { tour_id: undefined as never, order_id: undefined },
  ]

  it.each(cases)('一筆 receipt 必恰好屬於團體或公司其中一邊 (%j)', (fields) => {
    const r = makeReceipt(fields)
    const tour = isTourReceipt(r)
    const company = isCompanyReceipt(r)
    expect(tour).not.toBe(company) // XOR
  })
})

// ============================================
// PaymentRequest 分流（薪資 / 團體 / 公司）
// ============================================

describe('isSalaryRequest', () => {
  it('returns true for 中文「薪資」', () => {
    expect(isSalaryRequest(makeRequest({ request_type: '薪資' }))).toBe(true)
  })

  it('returns true for 含「薪資」子字串（例：員工薪資、薪資補貼）', () => {
    expect(isSalaryRequest(makeRequest({ request_type: '員工薪資' }))).toBe(true)
    expect(isSalaryRequest(makeRequest({ request_type: '薪資補貼' }))).toBe(true)
  })

  it('returns true for "salary" (lowercase)', () => {
    expect(isSalaryRequest(makeRequest({ request_type: 'salary' }))).toBe(true)
  })

  it('returns true for "Salary" / "SALARY" (大小寫不敏感)', () => {
    expect(isSalaryRequest(makeRequest({ request_type: 'Salary' }))).toBe(true)
    expect(isSalaryRequest(makeRequest({ request_type: 'SALARY' }))).toBe(true)
  })

  it('returns true for "Monthly Salary Payment"', () => {
    expect(isSalaryRequest(makeRequest({ request_type: 'Monthly Salary Payment' }))).toBe(true)
  })

  it('returns false for 一般供應商支出', () => {
    expect(isSalaryRequest(makeRequest({ request_type: '供應商支出' }))).toBe(false)
  })

  it('returns false for 員工代墊（非薪資）', () => {
    expect(isSalaryRequest(makeRequest({ request_type: '員工代墊' }))).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSalaryRequest(makeRequest({ request_type: '' }))).toBe(false)
  })

  it('returns false when request_type is null/undefined (defensive)', () => {
    // 雖 type 寫 string、實際 DB 可能空、guard 內用 || "" 兜底
    expect(isSalaryRequest(makeRequest({ request_type: null as never }))).toBe(false)
    expect(isSalaryRequest(makeRequest({ request_type: undefined as never }))).toBe(false)
  })
})

describe('isCompanyRequest', () => {
  it('returns true 當無 tour_id 且非薪資（公司營業費用）', () => {
    expect(
      isCompanyRequest(makeRequest({ tour_id: null, request_type: '辦公用品' }))
    ).toBe(true)
  })

  it('returns false 當薪資（薪資自成一類、不算公司請款）', () => {
    expect(
      isCompanyRequest(makeRequest({ tour_id: null, request_type: '薪資' }))
    ).toBe(false)
  })

  it('returns false 當有 tour_id（屬於團體）', () => {
    expect(
      isCompanyRequest(makeRequest({ tour_id: 'tour-001', request_type: '住宿' }))
    ).toBe(false)
  })

  it('returns false 當 tour_id + 薪資（罕見、應歸薪資不歸公司）', () => {
    expect(
      isCompanyRequest(makeRequest({ tour_id: 'tour-001', request_type: '薪資' }))
    ).toBe(false)
  })

  it('treats empty-string tour_id as 未綁團 (= 公司請款)', () => {
    expect(
      isCompanyRequest(makeRequest({ tour_id: '', request_type: '辦公用品' }))
    ).toBe(true)
  })
})

describe('isTourRequest', () => {
  it('returns true 當有 tour_id 且非薪資', () => {
    expect(
      isTourRequest(makeRequest({ tour_id: 'tour-001', request_type: '住宿' }))
    ).toBe(true)
  })

  it('returns false 當無 tour_id', () => {
    expect(
      isTourRequest(makeRequest({ tour_id: null, request_type: '住宿' }))
    ).toBe(false)
  })

  it('returns false 當 tour_id + 薪資（薪資優先、不算團體）', () => {
    expect(
      isTourRequest(makeRequest({ tour_id: 'tour-001', request_type: '薪資' }))
    ).toBe(false)
  })

  it('returns false 當 empty-string tour_id', () => {
    expect(
      isTourRequest(makeRequest({ tour_id: '', request_type: '住宿' }))
    ).toBe(false)
  })
})

describe('PaymentRequest 三向分流互斥性 (salary / tour / company)', () => {
  // 業務不變式：每筆請款必恰好落入「薪資」「團體」「公司」三類其中一個
  // （頁面 tab 切換靠這個、不能同時中兩類也不能三類都不中）
  const cases: Array<{
    tour_id: PaymentRequest['tour_id']
    request_type: string
    expected: 'salary' | 'tour' | 'company'
  }> = [
    { tour_id: null, request_type: '薪資', expected: 'salary' },
    { tour_id: 'tour-1', request_type: '薪資', expected: 'salary' }, // 薪資優先
    { tour_id: 'tour-1', request_type: 'salary', expected: 'salary' },
    { tour_id: 'tour-1', request_type: '住宿', expected: 'tour' },
    { tour_id: 'tour-1', request_type: '門票', expected: 'tour' },
    { tour_id: null, request_type: '辦公用品', expected: 'company' },
    { tour_id: '', request_type: '辦公用品', expected: 'company' },
    { tour_id: null, request_type: '', expected: 'company' }, // 空 type 默認公司
  ]

  it.each(cases)(
    'tour_id=%s / type=%s → expected %s',
    ({ tour_id, request_type, expected }) => {
      const r = makeRequest({ tour_id, request_type })
      const salary = isSalaryRequest(r)
      const tour = isTourRequest(r)
      const company = isCompanyRequest(r)

      // 三類必恰好命中一類
      const hits = [salary, tour, company].filter(Boolean).length
      expect(hits).toBe(1)

      if (expected === 'salary') expect(salary).toBe(true)
      if (expected === 'tour') expect(tour).toBe(true)
      if (expected === 'company') expect(company).toBe(true)
    }
  )
})
