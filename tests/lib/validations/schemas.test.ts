import { describe, it, expect } from 'vitest'
import {
  createProposalSchema,
  updateProposalSchema,
  createTourSchema,
  createPaymentRequestSchema,
  createDisbursementSchema,
  addManualRequestSchema,
  createPackageSchema,
} from '@/lib/validations/schemas'

describe('createProposalSchema', () => {
  it('通過：有效版本名稱', () => {
    const result = createProposalSchema.safeParse({ versionName: '版本一' })
    expect(result.success).toBe(true)
  })

  it('失敗：空字串', () => {
    const result = createProposalSchema.safeParse({ versionName: '' })
    expect(result.success).toBe(false)
  })

  it('失敗：缺少欄位', () => {
    const result = createProposalSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('失敗：非字串', () => {
    const result = createProposalSchema.safeParse({ versionName: 123 })
    expect(result.success).toBe(false)
  })
})

describe('updateProposalSchema', () => {
  it('通過：空物件（所有欄位 optional）', () => {
    const result = updateProposalSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('通過：只有 title', () => {
    const result = updateProposalSchema.safeParse({ title: '新提案' })
    expect(result.success).toBe(true)
  })

  it('通過：只有日期', () => {
    const result = updateProposalSchema.safeParse({ expectedStartDate: '2026-03-01' })
    expect(result.success).toBe(true)
  })
})

describe('createTourSchema', () => {
  it('通過：有效資料', () => {
    const result = createTourSchema.safeParse({
      name: '清邁五日遊',
      departure_date: '2026-03-01',
      return_date: '2026-03-05',
    })
    expect(result.success).toBe(true)
  })

  it('失敗：團名為空', () => {
    const result = createTourSchema.safeParse({
      name: '',
      departure_date: '2026-03-01',
      return_date: '2026-03-05',
    })
    expect(result.success).toBe(false)
  })

  it('失敗：缺少出發日期', () => {
    const result = createTourSchema.safeParse({
      name: '清邁五日遊',
      departure_date: '',
      return_date: '2026-03-05',
    })
    expect(result.success).toBe(false)
  })

  it('失敗：回程早於出發', () => {
    const result = createTourSchema.safeParse({
      name: '清邁五日遊',
      departure_date: '2026-03-05',
      return_date: '2026-03-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('return_date')
    }
  })

  it('通過：出發等於回程（當日來回）', () => {
    const result = createTourSchema.safeParse({
      name: '一日遊',
      departure_date: '2026-03-01',
      return_date: '2026-03-01',
    })
    expect(result.success).toBe(true)
  })

  it('失敗：缺少所有欄位', () => {
    const result = createTourSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('createPaymentRequestSchema', () => {
  it('通過：有效資料', () => {
    const result = createPaymentRequestSchema.safeParse({
      selectedTourId: 'tour-123',
      amount: 50000,
    })
    expect(result.success).toBe(true)
  })

  it('失敗：金額為 0', () => {
    const result = createPaymentRequestSchema.safeParse({
      selectedTourId: 'tour-123',
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('失敗：金額為負數', () => {
    const result = createPaymentRequestSchema.safeParse({
      selectedTourId: 'tour-123',
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('失敗：未選擇旅遊團', () => {
    const result = createPaymentRequestSchema.safeParse({
      selectedTourId: '',
      amount: 50000,
    })
    expect(result.success).toBe(false)
  })
})

describe('createDisbursementSchema', () => {
  it('通過：有效資料', () => {
    const result = createDisbursementSchema.safeParse({
      selectedRequestIds: ['req-1', 'req-2'],
      disbursementDate: '2026-03-01',
    })
    expect(result.success).toBe(true)
  })

  it('失敗：空陣列', () => {
    const result = createDisbursementSchema.safeParse({
      selectedRequestIds: [],
      disbursementDate: '2026-03-01',
    })
    expect(result.success).toBe(false)
  })

  it('失敗：缺少日期', () => {
    const result = createDisbursementSchema.safeParse({
      selectedRequestIds: ['req-1'],
      disbursementDate: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('addManualRequestSchema', () => {
  it('通過：有效資料', () => {
    const result = addManualRequestSchema.safeParse({
      title: '額外行程費用',
      category: 'transportation',
    })
    expect(result.success).toBe(true)
  })

  it('失敗：空標題', () => {
    const result = addManualRequestSchema.safeParse({
      title: '',
      category: 'transportation',
    })
    expect(result.success).toBe(false)
  })

  it('失敗：缺少類別', () => {
    const result = addManualRequestSchema.safeParse({
      title: '額外費用',
      category: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('createPackageSchema', () => {
  it('通過：有效版本名稱', () => {
    const result = createPackageSchema.safeParse({ version_name: 'V1' })
    expect(result.success).toBe(true)
  })

  it('失敗：空字串', () => {
    const result = createPackageSchema.safeParse({ version_name: '' })
    expect(result.success).toBe(false)
  })
})
