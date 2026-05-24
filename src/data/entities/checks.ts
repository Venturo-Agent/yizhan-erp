'use client'

/**
 * Checks Entity（票據 / 支票）
 *
 * 2026-05-24 建：② 散刻寫入統一配套（checks 表原本無 entity hook、CreateCheckDialog 直接 supabase.insert）。
 * 對應表：public.checks。RLS pattern：workspace_scoped。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type Check = Database['public']['Tables']['checks']['Row']

const checkEntity = createEntityHook<Check>('checks', {
  list: {
    select: '*',
    orderBy: { column: 'check_date', ascending: false },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useChecks = checkEntity.useList
export const useCheck = checkEntity.useDetail
export const invalidateChecks = checkEntity.invalidate
export const createCheck = checkEntity.create
export const updateCheck = checkEntity.update
export const deleteCheck = checkEntity.delete
export type { Check }
