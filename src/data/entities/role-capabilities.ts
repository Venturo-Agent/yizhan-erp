'use client'

/**
 * Role Capabilities — 職務能力 hook
 *
 * 5/24 William 拍板：純角色 SSOT、能力一律從 role_capabilities 來（不再有個人能力 / eligibility 旗標）。
 * 用來把「指派候選池」（業務 / 團控 / 代墊）改成「看誰的職務有對應能力」。
 *
 * RLS：workspace 成員可讀全 workspace 的 role_capabilities（rc_select policy）。
 * 用 plain SWR（composite key、不走 createEntityHook）。
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export interface RoleCapability {
  role_id: string
  capability_code: string
  enabled: boolean
}

const CACHE_KEY = 'role_capabilities:list'

async function fetchRoleCapabilities(): Promise<RoleCapability[]> {
  const { data, error } = await supabase
    .from('role_capabilities')
    .select('role_id,capability_code,enabled')
  if (error) throw error
  return (data || []) as RoleCapability[]
}

/** 列當前 workspace 所有 role_capabilities（RLS 自動 scope）*/
export function useRoleCapabilities() {
  const { data, error, isLoading, mutate } = useSWR(CACHE_KEY, fetchRoleCapabilities, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  })
  return {
    items: data || [],
    loading: isLoading,
    error,
    refresh: () => mutate(),
  }
}

/** 失效 cache（職務權限變更後 call）*/
export async function invalidateRoleCapabilities() {
  const { mutate } = await import('swr')
  await mutate(CACHE_KEY)
}
