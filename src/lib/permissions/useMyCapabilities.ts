'use client'

/**
 * 權限系統 hook
 *
 * 介面對外不變、內部統一從 useLayoutContext() 拿 capabilities Set。
 * 所有「登入後查 role_capabilities」散落 fetch 都收斂到 /api/auth/layout-context 一次。
 */

import { useEffect, useMemo, useCallback } from 'react'
import { useLayoutContext } from '@/lib/auth/useLayoutContext'

// 模組級 sync cache、給 hasCapabilitySync 用（zustand store helpers / 工具函式 fallback）
// 由 useMyCapabilities() 載入後寫入、整 session 共用
const syncCache = {
  codes: new Set<string>(),
}

/**
 * 同步查 cache（給 non-React 模組用、如 zustand store helpers / 工具函式）
 * 警告：cache 還沒載入時會回 false。React 元件請用 useMyCapabilities() 拿 reactive 值。
 */
export function hasCapabilitySync(code: string): boolean {
  return syncCache.codes.has(code)
}

/**
 * 強制清空 capability cache（讓下次 hook 用戶重 fetch）
 * 包到 useLayoutContext 後、實際清的是底層 SWR cache
 */
export function invalidateCapabilityCache() {
  syncCache.codes = new Set()
  // SWR 端的 invalidate 透過 useLayoutContext 的 refresh / 全域 mutate 處理
  // 這裡留 stub 介面、避免大量 caller 改動
}

export function useMyCapabilities() {
  const { capabilitiesSet, loading } = useLayoutContext()

  // 同步寫入 sync cache（給 non-React 取用）
  useEffect(() => {
    syncCache.codes = capabilitiesSet
  }, [capabilitiesSet])

  // 精準檢查：擁有特定 capability code
  const has = useCallback((code: string): boolean => capabilitiesSet.has(code), [capabilitiesSet])

  // 模組層任一資格：用於 sidebar / route guard 的「至少能看到這模組」判斷
  // 規則：codes 中存在任一以 `${module}.` 開頭、以 `.read` 結尾的 code 就算
  // 也包含 `${module}.read`（tab=null 的模組級資格）
  const canReadAnyInModule = useCallback(
    (moduleCode: string): boolean => {
      const prefix = `${moduleCode}.`
      const moduleRead = `${moduleCode}.read`
      for (const c of capabilitiesSet) {
        if (c === moduleRead) return true
        if (c.startsWith(prefix) && c.endsWith('.read')) return true
      }
      return false
    },
    [capabilitiesSet]
  )

  const canWriteAnyInModule = useCallback(
    (moduleCode: string): boolean => {
      const prefix = `${moduleCode}.`
      const moduleWrite = `${moduleCode}.write`
      for (const c of capabilitiesSet) {
        if (c === moduleWrite) return true
        if (c.startsWith(prefix) && c.endsWith('.write')) return true
      }
      return false
    },
    [capabilitiesSet]
  )

  return useMemo(
    () => ({
      codes: capabilitiesSet,
      loading,
      has,
      canReadAnyInModule,
      canWriteAnyInModule,
    }),
    [capabilitiesSet, loading, has, canReadAnyInModule, canWriteAnyInModule]
  )
}
