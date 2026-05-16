/**
 * useWorkspaceFeatures + useVisibleModuleTabs unit tests
 *
 * 租戶功能開關 hook、所有 sidebar / tab 顯示判斷的入口。
 * 對應 CLAUDE.md「路由連結」第 1 大方向 → 租戶開通層
 *
 * 涵蓋：
 *   - isFeatureEnabled：basic 功能 / premium 功能（需付費大開關）
 *   - isRouteAvailable：route → feature 解析、無 feature 視為公開
 *   - isTabEnabled：basic 預設嚴格（必須 row 存在）/ premium 需 premium_enabled
 *   - useVisibleModuleTabs：過濾 tab 列表、isEligibility tab 一律可見、未定義 tab 一律可見
 *
 * Mock 策略：
 *   - mock useLayoutContext 回 fake { featuresSet, payload.features, payload.premium_enabled }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ============================================================
// Mock useLayoutContext
// ============================================================

const layoutCtx = {
  features: [] as string[],
  premium_enabled: false,
  loading: false,
}

vi.mock('@/lib/auth/useLayoutContext', () => ({
  useLayoutContext: () => ({
    payload: {
      ok: true,
      user: null,
      employee: null,
      workspace: null,
      role_id: null,
      workspace_id: null,
      capabilities: [],
      features: layoutCtx.features,
      premium_enabled: layoutCtx.premium_enabled,
    },
    capabilitiesSet: new Set<string>(),
    featuresSet: new Set(layoutCtx.features),
    loading: layoutCtx.loading,
    refresh: vi.fn(),
  }),
  invalidateLayoutContext: vi.fn(),
}))

// ============================================================
// Load SUT
// ============================================================

import {
  useWorkspaceFeatures,
  useVisibleModuleTabs,
} from '@/lib/permissions/hooks'

// ============================================================
// Helpers
// ============================================================

function setFeatures(opts: { features?: string[]; premium?: boolean } = {}) {
  layoutCtx.features = opts.features ?? []
  layoutCtx.premium_enabled = opts.premium ?? false
}

beforeEach(() => {
  setFeatures()
  layoutCtx.loading = false
})

// ============================================================
// isFeatureEnabled
// ============================================================

describe('useWorkspaceFeatures — isFeatureEnabled', () => {
  it('basic 功能：featuresSet 有就是開', () => {
    setFeatures({ features: ['tours'] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isFeatureEnabled('tours')).toBe(true)
    expect(result.current.isFeatureEnabled('orders')).toBe(false)
  })

  it('accounting feature 開 → true（William 2026-05-11 拍板砍 premium gate、feature on 即生效）', () => {
    setFeatures({ features: ['accounting'], premium: false })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isFeatureEnabled('accounting')).toBe(true)
  })

  it('accounting feature 開 + premium 也開 → true（同上、不再因 premium 影響結果）', () => {
    setFeatures({ features: ['accounting'], premium: true })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isFeatureEnabled('accounting')).toBe(true)
  })

  it('premium 功能：付費大開關開、但 feature row 不存在 → false', () => {
    setFeatures({ features: [], premium: true })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isFeatureEnabled('accounting')).toBe(false)
    expect(result.current.isFeatureEnabled('customers')).toBe(false)
  })

  // TODO: PREMIUM_FEATURE_CODES list 變動、tenants 不再強制 premium-only、待對齊新 spec
  it.skip('PREMIUM_FEATURE_CODES 全套：customers / itinerary / office / accounting / tenants 都受付費控管', () => {
    setFeatures({
      features: ['customers', 'itinerary', 'office', 'accounting', 'tenants'],
      premium: false,
    })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isFeatureEnabled('customers')).toBe(false)
    expect(result.current.isFeatureEnabled('itinerary')).toBe(false)
    expect(result.current.isFeatureEnabled('office')).toBe(false)
    expect(result.current.isFeatureEnabled('accounting')).toBe(false)
    expect(result.current.isFeatureEnabled('tenants')).toBe(false)
  })
})

// ============================================================
// isRouteAvailable
// ============================================================

describe('useWorkspaceFeatures — isRouteAvailable', () => {
  it('已知路由 + feature 開 → true', () => {
    setFeatures({ features: ['tours'] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isRouteAvailable('/tours')).toBe(true)
    expect(result.current.isRouteAvailable('/tours/CNX250128A')).toBe(true)
  })

  it('已知路由 + feature 關 → false', () => {
    setFeatures({ features: [] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isRouteAvailable('/tours')).toBe(false)
  })

  it('未知路由（無對應 feature）→ true（視為公開）', () => {
    setFeatures({ features: [] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isRouteAvailable('/some-public-route')).toBe(true)
  })

  it('accounting feature 開 + premium 關 → 路由 true（premium gate 已砍）', () => {
    setFeatures({ features: ['accounting'], premium: false })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isRouteAvailable('/accounting/vouchers')).toBe(true)
  })

  it('accounting feature 開 + premium 也開 → 路由 true', () => {
    setFeatures({ features: ['accounting'], premium: true })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isRouteAvailable('/accounting/vouchers')).toBe(true)
  })
})

// ============================================================
// isTabEnabled — workspace 級嚴格、default-deny
// ============================================================

describe('useWorkspaceFeatures — isTabEnabled', () => {
  it('basic tab：feature row 存在 → true', () => {
    setFeatures({ features: ['tours.overview'] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isTabEnabled('tours', 'overview', 'basic')).toBe(true)
  })

  it('basic tab：feature row 不存在 → false（default-deny）', () => {
    setFeatures({ features: [] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isTabEnabled('tours', 'overview', 'basic')).toBe(false)
  })

  it('premium tab：付費關 → false（即使 row 存在）', () => {
    setFeatures({ features: ['tours.contract'], premium: false })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isTabEnabled('tours', 'contract', 'premium')).toBe(false)
  })

  it('premium tab：付費開 + row 存在 → true', () => {
    setFeatures({ features: ['tours.contract'], premium: true })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isTabEnabled('tours', 'contract', 'premium')).toBe(true)
  })

  it('premium tab：付費開、但 row 不存在 → false', () => {
    setFeatures({ features: [], premium: true })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isTabEnabled('tours', 'contract', 'premium')).toBe(false)
  })

  it('未指定 category（undefined）→ 等同 basic 處理', () => {
    setFeatures({ features: ['tours.overview'] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.isTabEnabled('tours', 'overview')).toBe(true)
    expect(result.current.isTabEnabled('tours', 'unknown')).toBe(false)
  })
})

// ============================================================
// enabledFeatures
// ============================================================

describe('useWorkspaceFeatures — enabledFeatures', () => {
  it('回傳 payload.features 原樣', () => {
    setFeatures({ features: ['tours', 'orders', 'calendar'] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.enabledFeatures).toEqual(['tours', 'orders', 'calendar'])
  })

  it('空 features → 空陣列', () => {
    setFeatures({ features: [] })
    const { result } = renderHook(() => useWorkspaceFeatures())

    expect(result.current.enabledFeatures).toEqual([])
  })
})

// ============================================================
// useVisibleModuleTabs — 過濾 tab 列表
// ============================================================

describe('useVisibleModuleTabs', () => {
  it('isEligibility=true 的 tab（as_sales / as_assistant）一律可見、不受 feature 控管', () => {
    setFeatures({ features: [] })
    const tabs = [
      { value: 'as_sales', label: '可當承辦業務' },
      { value: 'as_assistant', label: '可當助理' },
    ] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current).toHaveLength(2)
    expect(result.current.map(t => t.value)).toEqual(['as_sales', 'as_assistant'])
  })

  it('未在 module-tabs.ts 定義的 tab → 一律可見（自訂 tab fallback）', () => {
    setFeatures({ features: [] })
    const tabs = [{ value: 'custom-tab', label: '自訂' }] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current).toHaveLength(1)
  })

  it('basic tab：workspace 沒開 → 隱藏', () => {
    setFeatures({ features: [] })
    const tabs = [{ value: 'overview', label: '總覽' }] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current).toHaveLength(0)
  })

  it('basic tab：workspace 開了 → 可見', () => {
    setFeatures({ features: ['tours.overview'] })
    const tabs = [{ value: 'overview', label: '總覽' }] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].value).toBe('overview')
  })

  it('premium tab（contract）：付費關 → 隱藏', () => {
    setFeatures({ features: ['tours.contract'], premium: false })
    const tabs = [{ value: 'contract', label: '合約' }] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current).toHaveLength(0)
  })

  it('premium tab（contract）：付費開 + row 存在 → 可見', () => {
    setFeatures({ features: ['tours.contract'], premium: true })
    const tabs = [{ value: 'contract', label: '合約' }] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current).toHaveLength(1)
  })

  it('module 不存在於 module-tabs.ts → 全保留（fallback）', () => {
    setFeatures({ features: [] })
    const tabs = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ] as const

    const { result } = renderHook(() =>
      useVisibleModuleTabs('not-a-real-module', tabs),
    )

    expect(result.current).toHaveLength(2)
  })

  it('混合：basic 開 + premium 關 + isEligibility → 過濾正確', () => {
    setFeatures({
      features: ['tours.overview', 'tours.contract'],
      premium: false, // contract 是 premium、付費關 → 應隱藏
    })
    const tabs = [
      { value: 'overview', label: '總覽' }, // basic 開、可見
      { value: 'contract', label: '合約' }, // premium 關、隱藏
      { value: 'as_sales', label: '可當承辦業務' }, // isEligibility、永遠可見
    ] as const

    const { result } = renderHook(() => useVisibleModuleTabs('tours', tabs))

    expect(result.current.map(t => t.value)).toEqual(['overview', 'as_sales'])
  })
})
