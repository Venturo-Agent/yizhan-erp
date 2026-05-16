import { describe, it, expect } from 'vitest'
import {
  getModuleFromRoute,
  getPermissionCategories,
  getPermissionsByCategory,
  FEATURE_PERMISSIONS,
} from '@/lib/permissions'

/**
 * 權限 SSOT 的 pure helper 測試
 * 對應 src/lib/permissions/index.ts
 *
 * 鐵律：系統內沒有 user 特權概念、所有路由統一吃 workspace_features + role_capabilities。
 * 原本的 isPlatformCapabilityRoute / PLATFORM_CAPABILITY_ROUTES 已廢、測試移除。
 */

describe('getModuleFromRoute', () => {
  it('已知路由回傳對應 module code', () => {
    expect(getModuleFromRoute('/tours')).toBe('tours')
    expect(getModuleFromRoute('/orders')).toBe('orders')
    expect(getModuleFromRoute('/finance')).toBe('finance')
    expect(getModuleFromRoute('/accounting')).toBe('accounting')
    expect(getModuleFromRoute('/hr')).toBe('hr')
    expect(getModuleFromRoute('/settings')).toBe('settings')
    expect(getModuleFromRoute('/calendar')).toBe('calendar')
  })

  it('已知路由的子路由也走同一 module', () => {
    expect(getModuleFromRoute('/tours/CNX250128A')).toBe('tours')
    expect(getModuleFromRoute('/finance/payments')).toBe('finance')
    expect(getModuleFromRoute('/hr/roles')).toBe('hr')
  })

  it('/library/customers / /data-management / /library 都對應到 database module', () => {
    expect(getModuleFromRoute('/library/customers')).toBe('database')
    expect(getModuleFromRoute('/data-management')).toBe('database')
    expect(getModuleFromRoute('/library')).toBe('database')
  })

  it('未知路由回 null', () => {
    expect(getModuleFromRoute('/unknown')).toBeNull()
    expect(getModuleFromRoute('/foo/bar')).toBeNull()
  })

  it('沒前綴 / 也能 normalize 識別', () => {
    expect(getModuleFromRoute('tours')).toBe('tours')
    expect(getModuleFromRoute('finance/payments')).toBe('finance')
  })

  it('空字串回 null', () => {
    expect(getModuleFromRoute('')).toBeNull()
  })
})

describe('getPermissionCategories', () => {
  it('回傳唯一的 category 清單', () => {
    const cats = getPermissionCategories()
    expect(cats).toEqual(Array.from(new Set(cats))) // unique
    expect(cats.length).toBeGreaterThan(0)
  })

  it('包含 FEATURE_PERMISSIONS 內所有 category', () => {
    const cats = getPermissionCategories()
    const expected = new Set(FEATURE_PERMISSIONS.map(p => p.category))
    for (const c of expected) {
      expect(cats).toContain(c)
    }
  })
})

describe('getPermissionsByCategory', () => {
  it('回傳屬於指定 category 的 permission', () => {
    const cats = getPermissionCategories()
    for (const cat of cats) {
      const items = getPermissionsByCategory(cat)
      expect(items.length).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.category).toBe(cat)
      }
    }
  })

  it('未知 category 回空陣列', () => {
    expect(getPermissionsByCategory('does-not-exist')).toEqual([])
  })

  it('「核心」分類至少包含 tours / orders / finance', () => {
    const items = getPermissionsByCategory('核心').map(p => p.id)
    expect(items).toContain('tours')
    expect(items).toContain('orders')
    expect(items).toContain('finance')
  })
})
