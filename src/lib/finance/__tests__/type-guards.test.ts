/**
 * type-guards unit tests
 *
 * QDF Round 42 — finance type-guards SSOT 測試覆蓋
 */

import { describe, it, expect } from 'vitest'
import {
  isTourReceipt,
  isCompanyReceipt,
  isSalaryRequest,
  isCompanyRequest,
  isTourRequest,
} from '../type-guards'
import type { Receipt } from '@/types/receipt.types'
import type { PaymentRequest } from '@/stores/types'

function r(over: Partial<Receipt>): Receipt {
  return {
    id: 'r1',
    workspace_id: 'w1',
    tour_id: null,
    order_id: null,
    actual_amount: 100,
    receipt_amount: 100,
    status: 'pending',
    ...over,
  } as Receipt
}

function pr(over: Partial<PaymentRequest>): PaymentRequest {
  return {
    id: 'p1',
    workspace_id: 'w1',
    tour_id: null,
    request_type: '',
    amount: 100,
    total_amount: 100,
    status: 'pending',
    ...over,
  } as PaymentRequest
}

describe('isTourReceipt', () => {
  it('有 tour_id → true', () => {
    expect(isTourReceipt(r({ tour_id: 't1' }))).toBe(true)
  })

  it('有 order_id（綁團 via order）→ true', () => {
    expect(isTourReceipt(r({ order_id: 'o1' }))).toBe(true)
  })

  it('純 company receipt → false', () => {
    expect(isTourReceipt(r({}))).toBe(false)
  })
})

describe('isCompanyReceipt', () => {
  it('沒綁 tour 也沒綁 order → true', () => {
    expect(isCompanyReceipt(r({}))).toBe(true)
  })

  it('有 tour_id → false', () => {
    expect(isCompanyReceipt(r({ tour_id: 't1' }))).toBe(false)
  })

  it('有 order_id → false', () => {
    expect(isCompanyReceipt(r({ order_id: 'o1' }))).toBe(false)
  })
})

describe('isSalaryRequest', () => {
  it('request_type = "薪資" → true', () => {
    expect(isSalaryRequest(pr({ request_type: '薪資' }))).toBe(true)
  })

  it('request_type = "薪資結算" → true', () => {
    expect(isSalaryRequest(pr({ request_type: '薪資結算' }))).toBe(true)
  })

  it('request_type = "salary" (lower) → true', () => {
    expect(isSalaryRequest(pr({ request_type: 'salary' }))).toBe(true)
  })

  it('request_type = "Salary" (mixed case) → true', () => {
    expect(isSalaryRequest(pr({ request_type: 'Salary' }))).toBe(true)
  })

  it('request_type = "獎金" → false', () => {
    expect(isSalaryRequest(pr({ request_type: '獎金' }))).toBe(false)
  })

  it('空 request_type → false', () => {
    expect(isSalaryRequest(pr({ request_type: '' }))).toBe(false)
  })
})

describe('isCompanyRequest', () => {
  it('沒 tour_id + 不是薪資 → true', () => {
    expect(isCompanyRequest(pr({ request_type: '辦公用品' }))).toBe(true)
  })

  it('沒 tour_id + 是薪資 → false', () => {
    expect(isCompanyRequest(pr({ request_type: '薪資' }))).toBe(false)
  })

  it('有 tour_id → false', () => {
    expect(isCompanyRequest(pr({ request_type: '辦公', tour_id: 't1' }))).toBe(false)
  })
})

describe('isTourRequest', () => {
  it('有 tour_id + 不是薪資 → true', () => {
    expect(isTourRequest(pr({ request_type: '住宿', tour_id: 't1' }))).toBe(true)
  })

  it('有 tour_id + 是薪資 → false（薪資不算 tour）', () => {
    expect(isTourRequest(pr({ request_type: '薪資', tour_id: 't1' }))).toBe(false)
  })

  it('沒 tour_id → false', () => {
    expect(isTourRequest(pr({ request_type: '住宿' }))).toBe(false)
  })
})

describe('edge cases', () => {
  it('isSalaryRequest 含「薪資結算」也算', () => {
    expect(isSalaryRequest(pr({ request_type: '員工薪資結算' }))).toBe(true)
  })

  it('isCompanyRequest 跟 isTourRequest 互斥', () => {
    const noTourNoSalary = pr({ request_type: '辦公', tour_id: null })
    const tourNoSalary = pr({ request_type: '住宿', tour_id: 't1' })
    expect(isCompanyRequest(noTourNoSalary)).toBe(true)
    expect(isTourRequest(noTourNoSalary)).toBe(false)
    expect(isCompanyRequest(tourNoSalary)).toBe(false)
    expect(isTourRequest(tourNoSalary)).toBe(true)
  })
})
