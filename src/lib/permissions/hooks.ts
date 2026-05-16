'use client'

import { useMemo, useCallback } from 'react'
import { useLayoutContext, invalidateLayoutContext } from '@/lib/auth/useLayoutContext'
import { getFeaturesByRoute } from './features'
import { getModuleByCode } from './module-tabs'

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

interface RolePermission {
  route: string
  can_read: boolean
  can_write: boolean
}

/**
 * 取得當前租戶的功能權限
 *
 * 內部走 useLayoutContext()、所有 capability 從 /api/auth/layout-context 拿
 */
// 付費功能 gate 已停用（William 2026-05-11 拍板）：
// 統一規則 = workspace_features.{code}=true 就生效、不再要 premium_enabled 大開關
// DB column workspaces.premium_enabled 仍保留、之後若要分付費 / 免費版再重啟這層 gate

/**
 * 強制清快取、下次 useWorkspaceFeatures 會重 fetch
 * 用途：寫入 workspace_features 後呼叫、讓其他頁面立即看到最新狀態
 */
export function invalidateFeatureCache() {
  // 走 layout-context 全域 invalidate；features 跟 capabilities 共用同一份 cache、一次清乾淨
  void invalidateLayoutContext()
}

export function useWorkspaceFeatures() {
  const { payload, featuresSet, loading } = useLayoutContext()

  // features list（保留 row shape 給既有 caller 用）
  const features = useMemo<WorkspaceFeature[]>(
    () => payload.features.map(code => ({ feature_code: code, enabled: true })),
    [payload.features]
  )
  const premiumEnabled = payload.premium_enabled

  // 檢查功能是否啟用（單一規則：workspace_features 開了就算）
  const isFeatureEnabled = useCallback(
    (featureCode: string): boolean => featuresSet.has(featureCode),
    [featuresSet]
  )

  // 檢查路由是否可用（根據功能權限）
  const isRouteAvailable = useCallback(
    (route: string): boolean => {
      const routeFeatures = getFeaturesByRoute(route)
      if (routeFeatures.length === 0) return true // 無需特殊功能的路由
      return routeFeatures.some(f => isFeatureEnabled(f.code))
    },
    [isFeatureEnabled]
  )

  /**
   * 檢查 tab 是否啟用（workspace 級、細粒度）
   * - category='premium'：需要 workspace 付費大開關 + `{module}.{tab}` 明確 enabled=true
   * - category='basic' / undefined：必須有 row 且 enabled=true
   *
   * 嚴格 default-deny：workspace 沒有明確 enabled=true 的 row 一律不開。
   * 新 workspace 建立時必須自動 seed 所有 tab row（trigger 處理）。
   */
  const isTabEnabled = useCallback(
    (moduleCode: string, tabCode: string, category?: 'basic' | 'premium'): boolean => {
      const key = `${moduleCode}.${tabCode}`
      const featureOn = featuresSet.has(key)
      if (category === 'premium') {
        return premiumEnabled && featureOn
      }
      return featureOn
    },
    [featuresSet, premiumEnabled]
  )

  // 已啟用的功能代碼列表（直接從 layout context 拿、避免再次過濾）
  const enabledFeatures = useMemo(() => payload.features, [payload.features])

  return {
    features,
    loading,
    isFeatureEnabled,
    isTabEnabled,
    isRouteAvailable,
    enabledFeatures,
  }
}

/**
 * 過濾頁面 tab 列表、只保留當前租戶可見的（考慮 basic / premium 分類與付費大開關）
 *
 * 用法：
 * ```tsx
 * const TOUR_TABS = [{ value: 'contract', label: '合約' }, ...] as const
 * const visibleTabs = useVisibleModuleTabs('tours', TOUR_TABS)
 * ```
 *
 * 規則：
 * - tab 在 module-tabs.ts 中沒定義 → 視為一律可見（例如自訂 tab）
 * - 定義為 `category: 'premium'` → 需要付費大開關 + 功能小開關
 * - 其他（basic）→ 預設開，只有 workspace 明確關才隱藏
 * - `isEligibility: true` 的 tab（下拉資格類）→ 不受功能門檻管制、一律可見
 */
export function useVisibleModuleTabs<T extends { value: string }>(
  moduleCode: string,
  tabs: readonly T[]
): T[] {
  const { isTabEnabled } = useWorkspaceFeatures()

  return useMemo(() => {
    const moduleDef = getModuleByCode(moduleCode)
    if (!moduleDef) return [...tabs]

    return tabs.filter(tab => {
      const moduleTab = moduleDef.tabs.find(t => t.code === tab.value)
      if (!moduleTab) return true
      if (moduleTab.isEligibility) return true
      return isTabEnabled(moduleCode, tab.value, moduleTab.category)
    })
  }, [moduleCode, tabs, isTabEnabled])
}
