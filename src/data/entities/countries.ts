'use client'

/**
 * Countries Entity — 改用 ref_countries（shared data SSOT）
 *
 * 5/12 William 拍板：國家資料移到 shared data、useCountries 改撈 ref_countries
 * 舊 countries 表保留 schema 不再讀寫、之後 cleanup
 *
 * - ref_countries：86 個 ISO 標準國家、平台共用、不分 workspace
 * - 內部 transform 把 ref_countries 欄位 alias 成 Country 介面、所有 caller 不用改
 */

import useSWR from 'swr'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import type { Country } from '@/stores/region-store'

interface UseCountriesOptions {
  all?: boolean
  enabled?: boolean
  filter?: Record<string, unknown>
}

interface ListResult {
  items: Country[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const CACHE_KEY = 'countries:list:ref_countries'

interface RefCountryRow {
  code: string
  name_zh: string | null
  name_en: string | null
  continent: string | null
  is_active: boolean | null
  created_at: string
}

function transformToCountry(row: RefCountryRow): Country {
  return {
    id: (row.code || '').toLowerCase(),
    name: row.name_zh || row.name_en || row.code,
    name_en: row.name_en || row.code,
    code: row.code,
    has_regions: false,
    display_order: 0,
    is_active: row.is_active ?? true,
    usage_count: 0,
    workspace_id: undefined,
    created_at: row.created_at,
    updated_at: row.created_at,
  }
}

async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await dynamicFrom('ref_countries')
    .select('code,name_zh,name_en,continent,is_active,created_at')
    .order('name_zh', { ascending: true })

  if (error) {
    logger.error('useCountries: ref_countries query failed', error)
    throw error
  }
  return (data as RefCountryRow[]).map(transformToCountry)
}

export function useCountries(_options?: UseCountriesOptions): ListResult {
  const { data, error, isLoading, mutate } = useSWR<Country[]>(CACHE_KEY, fetchCountries, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  })
  return {
    items: data ?? [],
    loading: isLoading,
    error: error ? String((error as Error).message ?? error) : null,
    refresh: async () => {
      await mutate()
    },
  }
}

export const invalidateCountries = async (): Promise<void> => {
  await globalMutate(CACHE_KEY, undefined, { revalidate: true })
}

// ref_countries 是 ISO 標準表、不該由 user 端 create / update / delete
// 保留 stub 是因為舊 caller (CountryAirportSelector / useTourOperations) 還在 import
// 5/12 拍板：拿掉「新增國家」UI + usage_count 統計、排序改 alphabetical (name_zh)
export const createCountry = async (_payload: Partial<Country>): Promise<Country | null> => {
  logger.warn('createCountry 已 stub、ref_countries 不允許 user-level 新增')
  return null
}

export const updateCountry = async (_id: string, _patch: Partial<Country>): Promise<void> => {
  // ref_countries 是只讀 SSOT、usage_count 等 user-tracking 暫拿掉
  // 之後若要做使用統計、走獨立的 user_country_usage 表
}

export const deleteCountry = async (_id: string): Promise<void> => {
  logger.warn('deleteCountry 已 stub、ref_countries 是只讀 SSOT')
}
