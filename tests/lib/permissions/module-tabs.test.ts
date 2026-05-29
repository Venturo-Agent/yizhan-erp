import { describe, it, expect } from 'vitest'
import {
  MODULES,
  getModuleByCode,
  getModulesWithTabs,
  getModulesWithoutTabs,
  getAllModulesSorted,
} from '@/lib/permissions/module-tabs'

/**
 * module-tabs.ts 是 role_capabilities 的 SSOT
 * 對應 CLAUDE.md「路由連結」第 1 大方向 → HR 顆粒度層
 */

describe('getModuleByCode', () => {
  it('已知 module code 回對應定義', () => {
    const tours = getModuleByCode('tours')
    expect(tours).toBeDefined()
    expect(tours?.code).toBe('tours')
    expect(tours?.name).toBe('旅遊團管理')
    expect(tours?.tabs.length).toBeGreaterThan(0)
  })

  it('未知 code 回 undefined', () => {
    expect(getModuleByCode('not-a-module')).toBeUndefined()
    expect(getModuleByCode('')).toBeUndefined()
  })

  it('finance 模組包含核心 tab', () => {
    const finance = getModuleByCode('finance')
    expect(finance).toBeDefined()
    const codes = finance?.tabs.map(t => t.code) ?? []
    expect(codes).toContain('payments')
    expect(codes).toContain('requests')
    expect(codes).toContain('disbursement')
    // 2026-05-24 金庫總覽(treasury) tab 已移除（該頁無人使用）；撥款(disbursement)保留
    expect(codes).not.toContain('treasury')
  })

  it('hr 模組只有 employees + roles（HR 已砍剩這兩個）', () => {
    const hr = getModuleByCode('hr')
    const codes = hr?.tabs.map(t => t.code).sort() ?? []
    expect(codes).toEqual(['employees', 'roles'])
  })
})

describe('getModulesWithTabs', () => {
  it('全部 module 都有 tab', () => {
    const withTabs = getModulesWithTabs()
    expect(withTabs.length).toBeGreaterThan(0)
    for (const m of withTabs) {
      expect(m.tabs.length).toBeGreaterThan(0)
    }
  })

  it('包含 tours / orders / finance / hr', () => {
    const codes = getModulesWithTabs().map(m => m.code)
    expect(codes).toContain('tours')
    expect(codes).toContain('orders')
    expect(codes).toContain('finance')
    expect(codes).toContain('hr')
  })
})

describe('getModulesWithoutTabs', () => {
  it('全部 module 都沒 tab', () => {
    const withoutTabs = getModulesWithoutTabs()
    for (const m of withoutTabs) {
      expect(m.tabs.length).toBe(0)
    }
  })
})

describe('getAllModulesSorted', () => {
  it('總數等於 MODULES', () => {
    expect(getAllModulesSorted().length).toBe(MODULES.length)
  })

  it('有 tab 的排前面、沒 tab 的排後面', () => {
    const sorted = getAllModulesSorted()
    let lastWithTabsIndex = -1
    let firstWithoutTabsIndex = -1

    sorted.forEach((m, i) => {
      if (m.tabs.length > 0) lastWithTabsIndex = i
      if (m.tabs.length === 0 && firstWithoutTabsIndex === -1) {
        firstWithoutTabsIndex = i
      }
    })

    if (lastWithTabsIndex !== -1 && firstWithoutTabsIndex !== -1) {
      expect(lastWithTabsIndex).toBeLessThan(firstWithoutTabsIndex)
    }
  })

  it('沒漏 module、沒重複', () => {
    const sorted = getAllModulesSorted()
    const codes = sorted.map(m => m.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(codes)).toEqual(new Set(MODULES.map(m => m.code)))
  })
})

describe('MODULES 資料完整性', () => {
  it('每個 module 有必要欄位', () => {
    for (const m of MODULES) {
      expect(m.code).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(Array.isArray(m.tabs)).toBe(true)
    }
  })

  it('module code 不重複', () => {
    const codes = MODULES.map(m => m.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('每個 module 內的 tab code 不重複', () => {
    for (const m of MODULES) {
      const tabCodes = m.tabs.map(t => t.code)
      expect(new Set(tabCodes).size).toBe(tabCodes.length)
    }
  })

  it('tab category 只能是 basic / premium / undefined', () => {
    for (const m of MODULES) {
      for (const t of m.tabs) {
        if (t.category !== undefined) {
          expect(['basic', 'premium']).toContain(t.category)
        }
      }
    }
  })

  // 5/13 William 拍板：isEligibility tab 改員工編輯頁勾、不在 HR /hr/roles
  // module-tabs.ts 不再含 isEligibility tab、改去 src/modules/* source 找
  it('module-tabs.ts 不含 isEligibility tab（5/13、改員工編輯頁勾）', () => {
    for (const m of MODULES) {
      for (const t of m.tabs) {
        // codegen 過濾 isEligibility、module-tabs.ts 不該出現
        expect(t.isEligibility).toBeUndefined()
      }
    }
  })

  it('tours 有 premium 級 tab（contract / display-itinerary）', () => {
    const tours = getModuleByCode('tours')
    const premiumCodes = tours?.tabs.filter(t => t.category === 'premium').map(t => t.code) ?? []
    expect(premiumCodes).toContain('contract')
    expect(premiumCodes).toContain('display-itinerary')
  })
})
