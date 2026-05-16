'use client'

/**
 * Employee Eligibilities — 員工資格 hook
 *
 * 5/13 William 拍板：資格不是 role capability、是員工個人屬性。
 * 用 plain SWR（composite PK 不適合 createEntityHook、需 surrogate id）
 *
 * 資格 codes 來源：modules/* isEligibility=true tabs
 *   - tours.as_sales / tours.as_assistant / tours.as_controller
 *   - finance.advance_payment
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export interface EmployeeEligibility {
  employee_id: string
  eligibility_code: string
  workspace_id: string
  created_at: string
  created_by?: string | null
}

const CACHE_KEY = 'employee_eligibilities:list'

async function fetchEligibilities(): Promise<EmployeeEligibility[]> {
  const { data, error } = await (supabase as ReturnType<typeof supabase.from> extends infer _ ? typeof supabase : never)
    .from('employee_eligibilities' as never)
    .select('employee_id,eligibility_code,workspace_id,created_at,created_by')
  if (error) throw error
  return (data || []) as unknown as EmployeeEligibility[]
}

/** 列當前 workspace 所有 employee_eligibilities（RLS 自動 scope）*/
export function useEmployeeEligibilities() {
  const { data, error, isLoading, mutate } = useSWR(CACHE_KEY, fetchEligibilities, {
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

/** 失效 cache（寫操作後 call）*/
export async function invalidateEmployeeEligibilities() {
  const { mutate } = await import('swr')
  await mutate(CACHE_KEY)
}
