import { describe, it, expect } from 'vitest'
import { buildQuoteDraft, formatTwd } from '@/lib/cis/quote-draft'
import type { CisPricingItem, CisVisit } from '@/types/cis.types'

/**
 * buildQuoteDraft / formatTwd 為純函式、無 IO。
 * 重點：
 *   - mergeNeeds：跨多次 visits 累積、去重
 *   - matchItem 三段式：name 包含 → code 包含 → keywords
 *   - is_active=false 不參與 match
 *   - 找不到的 need 進 unmatched_needs（去重）
 *   - 只算 must_do 的金額區間
 */

function makeItem(p: Partial<CisPricingItem>): CisPricingItem {
  return {
    id: 'i1',
    code: 'X',
    category: 'identity',
    name: '商品 X',
    unit: '件',
    price_low: 0,
    price_high: 0,
    match_keywords: [],
    sort_order: 0,
    is_active: true,
    ...p,
  } as CisPricingItem
}

function makeVisit(needs: {
  must_do?: string[]
  suggested?: string[]
  optional?: string[]
}): CisVisit {
  return {
    id: 'v1',
    client_id: 'C1',
    visited_at: '2026-01-01',
    stage: 'design',
    brand_card: { priority_needs: needs },
  } as CisVisit
}

describe('buildQuoteDraft', () => {
  describe('match：name 包含', () => {
    it('need 包含 item.name → 命中', () => {
      const items = [makeItem({ id: 'a', name: 'logo', price_low: 1000, price_high: 2000 })]
      const visits = [makeVisit({ must_do: ['新做一個 logo'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toHaveLength(1)
      expect(r.must_do[0].item.id).toBe('a')
      expect(r.must_do[0].matched_need).toBe('新做一個 logo')
    })

    it('case-insensitive', () => {
      const items = [makeItem({ name: 'LOGO' })]
      const visits = [makeVisit({ must_do: ['做 logo'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toHaveLength(1)
    })
  })

  describe('match：code 包含（name 沒中時 fallback）', () => {
    it('need 包含 item.code → 命中', () => {
      const items = [makeItem({ name: '無關名稱', code: 'BC-01' })]
      const visits = [makeVisit({ suggested: ['加做 bc-01 的東西'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.suggested).toHaveLength(1)
    })
  })

  describe('match：keywords fallback', () => {
    it('name / code 都沒中、靠 match_keywords 命中', () => {
      const items = [
        makeItem({
          name: '名片',
          code: 'NC',
          match_keywords: ['business card', 'card'],
        }),
      ]
      const visits = [makeVisit({ optional: ['給員工的 business card'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.optional).toHaveLength(1)
    })

    it('空 keyword 不會誤命中（loose includes("") 防呆）', () => {
      const items = [makeItem({ name: '無關', code: 'XX', match_keywords: [''] })]
      const visits = [makeVisit({ must_do: ['我有 logo 需求'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toEqual([])
      expect(r.unmatched_needs).toContain('我有 logo 需求')
    })
  })

  describe('is_active 過濾', () => {
    it('inactive item 即使 name 中也不命中', () => {
      const items = [
        makeItem({ id: 'a', name: 'logo', is_active: false, price_low: 999 }),
        makeItem({ id: 'b', name: '完全無關', code: 'ZZ' }),
      ]
      const visits = [makeVisit({ must_do: ['新做 logo'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toHaveLength(0)
      expect(r.unmatched_needs).toContain('新做 logo')
    })
  })

  describe('mergeNeeds：跨 visits 累積、去重', () => {
    it('多次 visit 同 need 只算一次', () => {
      const items = [makeItem({ name: 'logo', price_low: 5000, price_high: 8000 })]
      const visits = [
        makeVisit({ must_do: ['做 logo'] }),
        makeVisit({ must_do: ['做 logo'] }),
      ]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toHaveLength(1)
      expect(r.total_low).toBe(5000)
      expect(r.total_high).toBe(8000)
    })

    it('沒有 brand_card 的 visit 直接 skip', () => {
      const items = [makeItem({ name: 'logo' })]
      const visits = [
        { id: 'v', client_id: 'C', visited_at: 'x', stage: 'design' } as unknown as CisVisit,
        makeVisit({ must_do: ['做 logo'] }),
      ]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toHaveLength(1)
    })

    it('空白 trim 後為空的 need 不被收錄', () => {
      const items = [makeItem({ name: 'logo' })]
      const visits = [makeVisit({ must_do: ['   ', '做 logo'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.must_do).toHaveLength(1)
    })
  })

  describe('unmatched_needs', () => {
    it('找不到 item 的 need 進 unmatched、去重', () => {
      const items = [makeItem({ name: '完全不相關', code: 'ZZ' })]
      const visits = [
        makeVisit({ must_do: ['做 logo'] }),
        makeVisit({ suggested: ['做 logo'] }),
      ]
      const r = buildQuoteDraft(visits, items)
      expect(r.unmatched_needs).toEqual(['做 logo'])
    })
  })

  describe('總金額 (僅 must_do 計算)', () => {
    it('加總 must_do 的 price_low / price_high', () => {
      const items = [
        makeItem({ id: 'a', name: 'logo', price_low: 5000, price_high: 10000 }),
        makeItem({ id: 'b', name: '名片', price_low: 1000, price_high: 2000 }),
      ]
      const visits = [makeVisit({ must_do: ['做 logo', '印名片'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.total_low).toBe(6000)
      expect(r.total_high).toBe(12000)
    })

    it('suggested / optional 不計入金額', () => {
      const items = [makeItem({ name: 'logo', price_low: 5000, price_high: 10000 })]
      const visits = [makeVisit({ suggested: ['做 logo'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.suggested).toHaveLength(1)
      expect(r.total_low).toBe(0)
      expect(r.total_high).toBe(0)
    })

    it('null / undefined price 視為 0', () => {
      const items = [
        makeItem({ name: 'logo', price_low: null, price_high: null }),
      ]
      const visits = [makeVisit({ must_do: ['做 logo'] })]
      const r = buildQuoteDraft(visits, items)
      expect(r.total_low).toBe(0)
      expect(r.total_high).toBe(0)
    })
  })

  describe('空輸入', () => {
    it('沒 visits 也沒 items', () => {
      const r = buildQuoteDraft([], [])
      expect(r).toEqual({
        must_do: [],
        suggested: [],
        optional: [],
        unmatched_needs: [],
        total_low: 0,
        total_high: 0,
      })
    })
  })
})

describe('formatTwd', () => {
  it('0 / 沒值 → "NT$ 0"', () => {
    expect(formatTwd(0)).toBe('NT$ 0')
    expect(formatTwd(undefined as unknown as number)).toBe('NT$ 0')
  })

  it('整數加千分位', () => {
    expect(formatTwd(1000)).toBe('NT$ 1,000')
    expect(formatTwd(1234567)).toBe('NT$ 1,234,567')
  })

  it('小數會四捨五入', () => {
    expect(formatTwd(1234.4)).toBe('NT$ 1,234')
    expect(formatTwd(1234.6)).toBe('NT$ 1,235')
  })
})
