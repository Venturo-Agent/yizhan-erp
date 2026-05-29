import { describe, it, expect } from 'vitest'
import { getModuleFromRoute } from '@/lib/permissions'

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

  it('/library/customers / /library 都對應到 database module', () => {
    expect(getModuleFromRoute('/library/customers')).toBe('database')
    expect(getModuleFromRoute('/library')).toBe('database')
    // B6 (2026-05-29): /data-management 已廢、不在 features.ts 真相、test 移除
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

// B6 (2026-05-29): getPermissionCategories / getPermissionsByCategory / FEATURE_PERMISSIONS / PermissionConfig 已砍
// 路由真相收斂到 @generated features.ts、不再手寫 permission 分類
