import { useMemo } from 'react'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'

/**
 * 各公司「常用國家」使用次數（即時統計該 workspace 的 tours + quotes 各國家次數）。
 * 走 DB 函式 get_workspace_country_usage()（scoped by workspace）。
 * cache key 帶 workspace_id（紅線 G）；讀失敗回空 Map → 呼叫端退回字母排序。
 * 回傳 Map<country_code(ISO 2碼), 次數>。
 */
export function useCountryUsage(): Map<string, number> {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  const { data } = useSWR(
    workspaceId ? `country-usage-${workspaceId}` : null,
    async () => {
      const { data, error } = await supabase.rpc('get_workspace_country_usage')
      if (error) return [] as { country_code: string; usage_count: number }[]
      return data ?? []
    },
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
  )

  return useMemo(
    () => new Map((data ?? []).map(r => [r.country_code, Number(r.usage_count)])),
    [data]
  )
}
