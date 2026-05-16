/**
 * useIsIntegrationEnabled — 前端判斷某 integration 在當前 workspace 是否啟用
 *
 * 用途：取代舊 `useWorkspaceFeatures().isFeatureEnabled('passport_ocr')` 之類的呼叫
 *      改成讀 workspace_integrations.enabled
 *
 * 設計：SWR cache 全 workspace 共享、避免每個 component 各自 fetch
 *
 * Returns:
 *   - true: integration 已存在且 enabled=true
 *   - false: 不存在、未啟用、或載入中（fail-safe default、按鈕不顯示）
 *   - loading: 還在拉的時候 = true、避免閃爍
 */

'use client'

import useSWR from 'swr'
import { useAuthStore } from '@/stores'

interface IntegrationStatus {
  code: string
  enabled: boolean
}

const fetcher = async (url: string): Promise<IntegrationStatus[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * 拿到當前 workspace 所有 integrations 的 enabled 狀態（SWR cache）
 */
function useAllIntegrations(): {
  data: IntegrationStatus[]
  loading: boolean
} {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const key = workspaceId ? `/api/workspace-integrations?workspace_id=${workspaceId}` : null
  const { data, isLoading } = useSWR<IntegrationStatus[]>(key, fetcher, {
    revalidateOnFocus: false,
  })
  return {
    data: data ?? [],
    loading: isLoading,
  }
}

/**
 * 檢查指定 integration 是否啟用
 *
 * @param code  integration_code（'flight_search' / 'passport_ocr' / 'line_oa' / ...）
 * @returns     { enabled, loading }
 */
export function useIsIntegrationEnabled(code: string): {
  enabled: boolean
  loading: boolean
} {
  const { data, loading } = useAllIntegrations()
  const row = data.find(r => r.code === code)
  return {
    enabled: !!row?.enabled,
    loading,
  }
}
