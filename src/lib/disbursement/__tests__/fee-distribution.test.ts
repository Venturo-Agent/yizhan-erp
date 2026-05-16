/**
 * fee-distribution unit tests
 *
 * QDF Round 4 — 出納單手續費分攤算法 SSOT 測試
 */

import { describe, it, expect } from 'vitest'
import { distributeFees, type DistributionItem } from '../fee-distribution'

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
