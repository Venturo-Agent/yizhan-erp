import { describe, it, expect } from 'vitest'
import {
  FEATURES,
  getFeatureByCode,
  getFeatureByRoute,
  getFeaturesByRoute,
  getBasicFeatures,
  getPremiumFeatures,
  getEnterpriseFeatures,
  getAddonFeatures,
} from '@/lib/permissions/features'

/**
 * features.ts 是 workspace_features 的 SSOT
 * 對應 CLAUDE.md「路由連結」第 1 大方向 → 租戶開通層
 */

describe('getFeatureByCode', () => {
  it('已知 code 回對應 feature', () => {
    const feature = getFeatureByCode('tours')
    expect(feature).toBeDefined()
    expect(feature?.code).toBe('tours')
    expect(feature?.name).toBe('旅遊團管理')
  })

  it('未知 code 回 undefined', () => {
    expect(getFeatureByCode('not-a-feature')).toBeUndefined()
    expect(getFeatureByCode('')).toBeUndefined()
  })

  // CIS feature 已於 2026-05-19 砍除（DB schema 移除、前端殘留也清乾淨）
})

describe('getFeatureByRoute', () => {
  it('精確路由匹配', () => {
    expect(getFeatureByRoute('/tours')?.code).toBe('tours')
    expect(getFeatureByRoute('/orders')?.code).toBe('orders')
    expect(getFeatureByRoute('/calendar')?.code).toBe('calendar')
  })

  it('子路由也能對應到同一 feature', () => {
    // /tours/CNX250128A → tours
    expect(getFeatureByRoute('/tours/CNX250128A')?.code).toBe('tours')
    // /finance/payments → finance
    expect(getFeatureByRoute('/finance/payments')?.code).toBe('finance')
    // /accounting/vouchers → accounting
    expect(getFeatureByRoute('/accounting/vouchers')?.code).toBe('accounting')
  })

  it('未知路由回 undefined', () => {
    expect(getFeatureByRoute('/totally-not-a-route')).toBeUndefined()
  })

  it('動態路由 [param] 也能匹配', () => {
    // /tours/[code] 在 features.ts 中是 normalizedRoute pattern
    const f = getFeatureByRoute('/tours/abc')
    expect(f?.code).toBe('tours')
  })
})

describe('getFeaturesByRoute', () => {
  it('回傳所有匹配的 feature（複數）', () => {
    const features = getFeaturesByRoute('/tours')
    const codes = features.map(f => f.code)
    expect(codes).toContain('tours')
    // tours 路由也可能對應 tour_attributes（features.ts 有 routes: ['/tours']）
    expect(codes).toContain('tour_attributes')
  })

  it('未知路由回空陣列', () => {
    expect(getFeaturesByRoute('/totally-not-a-route')).toEqual([])
  })

  it('結果都是 FEATURES 中的 entry', () => {
    const features = getFeaturesByRoute('/finance')
    const allCodes = new Set(FEATURES.map(f => f.code))
    for (const f of features) {
      expect(allCodes.has(f.code)).toBe(true)
    }
  })
})

describe('getBasicFeatures / getPremiumFeatures / getEnterpriseFeatures', () => {
  it('basic 全為 category=basic', () => {
    const basics = getBasicFeatures()
    expect(basics.length).toBeGreaterThan(0)
    for (const f of basics) {
      expect(f.category).toBe('basic')
    }
  })

  it('premium 全為 category=premium', () => {
    const premiums = getPremiumFeatures()
    expect(premiums.length).toBeGreaterThan(0)
    for (const f of premiums) {
      expect(f.category).toBe('premium')
    }
  })

  it('enterprise 全為 category=enterprise', () => {
    const enterprises = getEnterpriseFeatures()
    expect(enterprises.length).toBeGreaterThan(0)
    for (const f of enterprises) {
      expect(f.category).toBe('enterprise')
    }
  })

  it('四個分類加總 = FEATURES 總數（沒有漏分類也沒有重複）', () => {
    const total =
      getBasicFeatures().length +
      getPremiumFeatures().length +
      getEnterpriseFeatures().length +
      getAddonFeatures().length
    expect(total).toBe(FEATURES.length)
  })

  it('分類沒有交集（每個 feature 只屬於一個分類）', () => {
    const basicCodes = new Set(getBasicFeatures().map(f => f.code))
    const premiumCodes = new Set(getPremiumFeatures().map(f => f.code))
    const enterpriseCodes = new Set(getEnterpriseFeatures().map(f => f.code))

    for (const c of basicCodes) {
      expect(premiumCodes.has(c)).toBe(false)
      expect(enterpriseCodes.has(c)).toBe(false)
    }
    for (const c of premiumCodes) {
      expect(enterpriseCodes.has(c)).toBe(false)
    }
  })
})

describe('FEATURES 資料完整性', () => {
  it('每個 feature 有必要欄位', () => {
    // 例外：純 capability feature 允許 routes 為空、靠 capability 守門
    // - shared_data_management: 跨 workspace 能力、UI 入口未開放
    // - office: 文件管理、5/13 從 module-tabs.ts 拉進 modules/ 但暫無實際路由（WIP）
    // - addon_data_*: 漫途共享資料 addon、購買 capability 後讀公共池、無獨立路由
    const FEATURES_WITHOUT_ROUTES = new Set([
      'shared_data_management',
      'office',
      'addon_data_attractions',
      'addon_data_hotels',
      'addon_data_restaurants',
    ])
    for (const f of FEATURES) {
      expect(f.code).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(['basic', 'premium', 'enterprise', 'addon']).toContain(f.category)
      expect(Array.isArray(f.routes)).toBe(true)
      if (!FEATURES_WITHOUT_ROUTES.has(f.code)) {
        expect(f.routes.length).toBeGreaterThan(0)
      }
    }
  })

  it('feature code 不重複', () => {
    const codes = FEATURES.map(f => f.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
