'use client'

/**
 * Client-side session context hook（仿 venturo-app 的 layout context 模式）
 *
 * 一次 fetch /api/auth/layout-context、整個 session cache 一份、所有
 * 「我的權限 / 我的功能 / 我的 workspace」hook 都從這份共享資料拿。
 *
 * 取代登入後第一次 page 多次獨立 fetch：
 *   舊：role_capabilities query + /api/permissions/features + /api/workspaces/[id]
 *       + (個別 page 自己再打的 capability check) = 4–5 次
 *   新：/api/auth/layout-context = 1 次
 *
 * SWR 設定：
 *   - revalidateOnFocus: false（session 內不要重抓、避免 tab 切換閃爍）
 *   - dedupingInterval: 5min（避免短時間重複呼叫）
 *   - refreshInterval: 0（不自動刷新；mutate 由 invalidateLayoutContext() 手動觸發）
 */

import useSWR from 'swr'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { useMemo } from 'react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'

const SWR_KEY = '/api/auth/layout-context'

export interface LayoutContextPayload {
  ok: boolean
  user: { id: string; email: string | null } | null
  employee: {
    id: string
    employee_number: string
    display_name: string | null
    english_name: string | null
    role_id: string | null
    workspace_id: string | null
    status: string | null
    branch_id?: string | null
  } | null
  workspace: {
    id: string
    code: string
    name: string
    type: string | null
    is_active: boolean | null
    premium_enabled: boolean | null
    /** 預設出帳日期（0=週日 ... 4=週四 ... 6=週六）— 請款 dialog 用此判斷「特殊出帳」 */
    default_billing_day_of_week: number | null
  } | null
  role_id: string | null
  workspace_id: string | null
  capabilities: string[]
  features: string[]
  premium_enabled: boolean
}

const EMPTY_PAYLOAD: LayoutContextPayload = {
  ok: false,
  user: null,
  employee: null,
  workspace: null,
  role_id: null,
  workspace_id: null,
  capabilities: [],
  features: [],
  premium_enabled: false,
}

async function fetcher(url: string): Promise<LayoutContextPayload> {
  let res = await fetch(url, { credentials: 'include' })

  // 401 = 可能是複製分頁 / 快速 navigation 撞到 Supabase token refresh race。
  // 最多一次 retry（300ms），retry 前先檢查 session 是否存在。
  if (res.status === 401) {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      // session 根本不存在、不用等 refresh、直接失敗
      return EMPTY_PAYLOAD
    }
    // session 存在、等 supabase refresh 寫回 cookies 後再試一次
    await new Promise(r => setTimeout(r, 300))
    res = await fetch(url, { credentials: 'include' })
  }

  if (!res.ok) return EMPTY_PAYLOAD
  return (await res.json()) as LayoutContextPayload
}

export interface UseLayoutContextResult {
  payload: LayoutContextPayload
  capabilitiesSet: Set<string>
  featuresSet: Set<string>
  loading: boolean
  /** 強制重抓 layout context（如：權限變更、workspace 設定變更後） */
  refresh: () => Promise<void>
}

export function useLayoutContext(): UseLayoutContextResult {
  const {
    isAuthenticated,
    _hasHydrated,
    capabilities: storedCaps,
    premium_enabled: storedPremium,
  } = useAuthStore()

  // 未登入 / 還沒 hydrate 不發 request
  const shouldFetch = _hasHydrated && isAuthenticated

  // 從 zustand persist 拿 fallback、解 hydration race
  // capabilities + premium 仍 fallback（解 ModuleGuard race / sidebar premium feature gate）
  // features 寫死空陣列、不讀 storedFeatures：避免 localStorage 殘留 features 跟 server 不一致時、
  // sidebar 重整先閃舊狀態（顯示已關閉的 tours / orders）再縮回。SSOT 是 server 那份。
  const fallback = useMemo<LayoutContextPayload>(
    () => ({
      ...EMPTY_PAYLOAD,
      capabilities: storedCaps ?? [],
      features: [],
      premium_enabled: storedPremium ?? false,
    }),
    [storedCaps, storedPremium],
  )

  const { data, isLoading } = useSWR<LayoutContextPayload>(
    shouldFetch ? SWR_KEY : null,
    fetcher,
    {
      revalidateOnFocus: false,
      // mount 時必 revalidate、fallback 寫死空 features 是「等 server 回」用、不能永遠 stuck 在 fallback
      revalidateOnMount: true,
      dedupingInterval: 5 * 60 * 1000,
      refreshInterval: 0,
      fallbackData: fallback,
    },
  )

  const payload = data ?? fallback

  const capabilitiesSet = useMemo(() => new Set(payload.capabilities), [payload.capabilities])
  const featuresSet = useMemo(() => new Set(payload.features), [payload.features])

  // 拿掉之前的 hasFallbackCaps fast-path：capabilities cache 在不代表 features 也載好
  // sidebar 跟其他 hook 走同一個 loading=true、SWR fetch 完才算就緒、避免閃舊狀態
  const loading = !_hasHydrated || (shouldFetch && isLoading)

  return {
    payload,
    capabilitiesSet,
    featuresSet,
    loading,
    refresh: async () => {
      await globalMutate(SWR_KEY)
    },
  }
}

/**
 * 強制清空 layout context cache（讓下次 hook 用戶重 fetch）
 *
 * 適合在以下時機呼叫：
 *   - 角色 / 權限變更後
 *   - workspace_features 寫入後
 *   - 切換 workspace（雖然 ERP 一個 user 通常綁一個 workspace）
 */
export async function invalidateLayoutContext() {
  await globalMutate(SWR_KEY)
}
