/**
 * fee-distribution unit tests
 *
 * QDF Round 4 — 出納單手續費分攤算法 SSOT 測試
 */

import { describe, it, expect } from 'vitest'
import {
  distributeFees,
  isCrossBankTransfer,
  computeBatchFees,
  type DistributionItem,
  type ComputeBatchFeesItem,
  type ComputeBatchFeesLookups,
} from '../fee-distribution'

const itemsCross = (count: number, amount = 1000): DistributionItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    amount,
    is_cross_bank: true,
  }))

describe('distributeFees - average mode / equal strategy', () => {
  it('15 / 10 筆 = 9×1 + 1×6（最後一筆吃尾）', () => {
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 15,
      items: itemsCross(10),
      average_strategy: 'equal',
    })
    const fees = Array.from(result.per_item_fees.values())
    expect(fees.length).toBe(10)
    expect(fees.slice(0, 9).every(f => f === 1)).toBe(true)
    expect(fees[9]).toBe(6)
    expect(fees.reduce((s, f) => s + f, 0)).toBe(15) // 總和 = 銀行扣
  })

  it('30 / 5 筆 = 平均 6 / 6 / 6 / 6 / 6', () => {
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 30,
      items: itemsCross(5),
      average_strategy: 'equal',
    })
    expect(Array.from(result.per_item_fees.values())).toEqual([6, 6, 6, 6, 6])
  })

  it('0 元手續費：全 empty map', () => {
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 0,
      items: itemsCross(5),
    })
    expect(result.per_item_fees.size).toBe(0)
  })

  it('全同行（無跨行）：全 empty map', () => {
    const items: DistributionItem[] = [
      { id: 'a', amount: 1000, is_cross_bank: false },
      { id: 'b', amount: 2000, is_cross_bank: false },
    ]
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 15,
      items,
    })
    expect(result.per_item_fees.size).toBe(0)
  })

  it('混合（部分同行部分跨行）：只分給跨行', () => {
    const items: DistributionItem[] = [
      { id: 'same1', amount: 1000, is_cross_bank: false },
      { id: 'cross1', amount: 1000, is_cross_bank: true },
      { id: 'cross2', amount: 1000, is_cross_bank: true },
    ]
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 30,
      items,
    })
    expect(result.per_item_fees.has('same1')).toBe(false)
    expect(result.per_item_fees.get('cross1')).toBe(15)
    expect(result.per_item_fees.get('cross2')).toBe(15)
  })
})

describe('distributeFees - average mode / proportional strategy', () => {
  it('按金額比例分攤', () => {
    const items: DistributionItem[] = [
      { id: 'a', amount: 1000, is_cross_bank: true },
      { id: 'b', amount: 3000, is_cross_bank: true },
    ]
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 100,
      items,
      average_strategy: 'proportional',
    })
    // 比例：1000:3000 = 1:3、分 25 vs 75
    expect(result.per_item_fees.get('a')).toBeCloseTo(25, 1)
    expect(result.per_item_fees.get('b')).toBeCloseTo(75, 1)
  })

  it('跨行金額和為 0、退回 equal', () => {
    const items: DistributionItem[] = [
      { id: 'a', amount: 0, is_cross_bank: true },
      { id: 'b', amount: 0, is_cross_bank: true },
    ]
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 30,
      items,
      average_strategy: 'proportional',
    })
    expect(result.per_item_fees.get('a')).toBe(15)
    expect(result.per_item_fees.get('b')).toBe(15)
  })
})

describe('distributeFees - unified mode', () => {
  it('每筆收 30、5 筆、銀行扣 15、公司賺 135', () => {
    const result = distributeFees({
      mode: 'unified',
      bank_actual_fee: 15,
      unified_amount_per_item: 30,
      items: itemsCross(5),
    })
    expect(result.per_item_fees.size).toBe(5)
    for (const fee of result.per_item_fees.values()) {
      expect(fee).toBe(30)
    }
    expect(result.total_collected).toBe(150)
    expect(result.overflow).toBe(135)
  })

  it('unified 不管 is_cross_bank（同行也收）', () => {
    const items: DistributionItem[] = [
      { id: 'same1', amount: 1000, is_cross_bank: false },
      { id: 'cross1', amount: 1000, is_cross_bank: true },
    ]
    const result = distributeFees({
      mode: 'unified',
      bank_actual_fee: 15,
      unified_amount_per_item: 30,
      items,
    })
    expect(result.per_item_fees.get('same1')).toBe(30)
    expect(result.per_item_fees.get('cross1')).toBe(30)
    expect(result.total_collected).toBe(60)
    expect(result.overflow).toBe(45)
  })

  it('unified 公司虧（收 < 銀行扣）：overflow 為負', () => {
    const result = distributeFees({
      mode: 'unified',
      bank_actual_fee: 100,
      unified_amount_per_item: 10,
      items: itemsCross(3),
    })
    expect(result.total_collected).toBe(30)
    expect(result.overflow).toBe(-70)
  })

  it('unified_amount = 0：每筆 0、total 0', () => {
    const result = distributeFees({
      mode: 'unified',
      bank_actual_fee: 15,
      unified_amount_per_item: 0,
      items: itemsCross(5),
    })
    for (const fee of result.per_item_fees.values()) {
      expect(fee).toBe(0)
    }
    expect(result.total_collected).toBe(0)
    expect(result.overflow).toBe(-15)
  })

  it('unified mode + 0 items：empty Map / 0 collected / -fee overflow', () => {
    const result = distributeFees({
      mode: 'unified',
      bank_actual_fee: 15,
      unified_amount_per_item: 30,
      items: [],
    })
    expect(result.per_item_fees.size).toBe(0)
    expect(result.total_collected).toBe(0)
    expect(result.overflow).toBe(-15)
  })
})

describe('distributeFees - edge cases', () => {
  it('average mode + 1 cross item：全 fee 在唯一一筆', () => {
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 30,
      items: itemsCross(1),
      average_strategy: 'equal',
    })
    expect(result.per_item_fees.get('item-0')).toBe(30)
  })

  it('average mode + 大 fee + 整數除得盡', () => {
    const result = distributeFees({
      mode: 'average',
      bank_actual_fee: 100,
      items: itemsCross(10),
      average_strategy: 'equal',
    })
    const fees = Array.from(result.per_item_fees.values())
    expect(fees).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10])
  })
})

// ─── concept A SSOT：同行/跨行判定（2026-05-27 William 拍板）───────────────────

describe('isCrossBankTransfer - 同行/跨行判定', () => {
  it('收款對象與公司同一家銀行 → 同行、不收費', () => {
    expect(isCrossBankTransfer({ payeeBankCode: '013', fromBankCode: '013' })).toBe(false)
  })

  it('收款對象與公司不同銀行 → 跨行、收費（員工開別家也算）', () => {
    expect(isCrossBankTransfer({ payeeBankCode: '822', fromBankCode: '013' })).toBe(true)
  })

  it('收款對象沒填銀行 → 視同跨行照收（選項 A、保守）', () => {
    expect(isCrossBankTransfer({ payeeBankCode: null, fromBankCode: '013' })).toBe(true)
  })

  it('公司帳戶沒 bank_code → 視同跨行照收', () => {
    expect(isCrossBankTransfer({ payeeBankCode: '013', fromBankCode: null })).toBe(true)
  })

  it('cash / check 不走轉帳 → 一律不收（即使跨行）', () => {
    expect(
      isCrossBankTransfer({ payeeBankCode: '822', fromBankCode: '013', itemKind: 'cash' })
    ).toBe(false)
    expect(
      isCrossBankTransfer({ payeeBankCode: '822', fromBankCode: '013', itemKind: 'check' })
    ).toBe(false)
  })
})

// ─── computeBatchFees SSOT（batch-create 與 [id] PATCH 共用、2026-05-27）──────────────

describe('computeBatchFees - is_cross_bank 收款對象真實銀行優先序', () => {
  const baseLookups = (over: Partial<ComputeBatchFeesLookups> = {}): ComputeBatchFeesLookups => ({
    fromBankCode: '013', // 公司轉出帳戶 = 國泰
    fromBankUnifiedAmount: 30, // 每筆跨行 30
    supplierBankById: new Map(),
    employeeBankById: new Map(),
    pmKindById: new Map(),
    feeMode: 'average',
    ...over,
  })

  const item = (over: Partial<ComputeBatchFeesItem> = {}): ComputeBatchFeesItem => ({
    id: 'i1',
    amount: 1000,
    supplier_id: null,
    advanced_by: null,
    payee_employee_id: null,
    payment_method_id: null,
    ...over,
  })

  it('代墊員工銀行優先：員工開玉山(跨)、供應商開國泰(同) → 看員工=跨行收費', () => {
    const r = computeBatchFees(
      [item({ advanced_by: 'EMP1', supplier_id: 'SUP1' })],
      baseLookups({
        employeeBankById: new Map([['EMP1', '822']]), // 玉山、跨行
        supplierBankById: new Map([['SUP1', '013']]), // 國泰、同行（但代墊優先、不看這個）
      })
    )
    expect(r.perItem.get('i1')?.is_cross_bank).toBe(true)
    expect(r.perItem.get('i1')?.fee_amount).toBe(30)
  })

  it('受款員工(payee_employee_id)同行 → 免費（不誤收）', () => {
    const r = computeBatchFees(
      [item({ payee_employee_id: 'EMP2' })],
      baseLookups({ employeeBankById: new Map([['EMP2', '013']]) }) // 員工=國泰、同行
    )
    expect(r.perItem.get('i1')?.is_cross_bank).toBe(false)
    expect(r.perItem.get('i1')?.fee_amount).toBe(0)
    expect(r.total_fee).toBe(0)
  })

  it('純供應商跨行 → 收費', () => {
    const r = computeBatchFees(
      [item({ supplier_id: 'SUP1' })],
      baseLookups({ supplierBankById: new Map([['SUP1', '822']]) })
    )
    expect(r.perItem.get('i1')?.is_cross_bank).toBe(true)
    expect(r.perItem.get('i1')?.fee_amount).toBe(30)
  })

  it('cash 付款 → 不收（即使收款對象跨行）', () => {
    const r = computeBatchFees(
      [item({ supplier_id: 'SUP1', payment_method_id: 'PM_CASH' })],
      baseLookups({
        supplierBankById: new Map([['SUP1', '822']]),
        pmKindById: new Map([['PM_CASH', 'cash']]),
      })
    )
    expect(r.perItem.get('i1')?.is_cross_bank).toBe(false)
    expect(r.perItem.get('i1')?.fee_amount).toBe(0)
  })

  it('per-payer 合併：同一供應商 2 筆 → 只收 1 筆 30（組內 equal 平均餘加最後）', () => {
    const r = computeBatchFees(
      [item({ id: 'a', supplier_id: 'SUP1' }), item({ id: 'b', supplier_id: 'SUP1' })],
      baseLookups({ supplierBankById: new Map([['SUP1', '822']]) })
    )
    // 30 / 2 = 15 + 15
    expect(r.perItem.get('a')?.fee_amount).toBe(15)
    expect(r.perItem.get('b')?.fee_amount).toBe(15)
    expect(r.total_fee).toBe(30) // 合併成 1 筆收款對象、只收 30
  })

  it('per-payer 分組：2 個不同供應商各跨行 → 各收 1 筆、共 60', () => {
    const r = computeBatchFees(
      [item({ id: 'a', supplier_id: 'SUP1' }), item({ id: 'b', supplier_id: 'SUP2' })],
      baseLookups({
        supplierBankById: new Map([
          ['SUP1', '822'],
          ['SUP2', '700'],
        ]),
      })
    )
    expect(r.perItem.get('a')?.fee_amount).toBe(30)
    expect(r.perItem.get('b')?.fee_amount).toBe(30)
    expect(r.total_fee).toBe(60)
  })
})
