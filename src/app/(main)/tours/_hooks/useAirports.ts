/**
 * useAirports - 統一「交通節點 + 目的地」資料來源
 *
 * 讀取：
 *   - ref_airports（全域 IATA 機場，Stage 1 起去除 workspace_id）
 *   - ref_destinations（全域非機場目的地，如 宜蘭 YLN、墾丁 KTG）
 *
 * 兩者在回傳的 airports 陣列中以 iata_code 作為 key 混排，
 * 使 CountryAirportSelector / generateTourCode 等呼叫端無需修改。
 */

import { useCallback, useMemo } from 'react'
// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- ref_airports / ref_countries 是全域 reference table，非 workspace-scoped entity；createEntityHook 不適用
import useSWR from 'swr'
import { mutate } from '@/lib/swr/scoped-mutate'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import { apiPost, extractHttpErrorMessage } from '@/lib/api/client'

interface Airport {
  iata_code: string
  icao_code: string | null
  name_en: string | null
  name_zh: string | null
  city_name_en: string | null
  city_name_zh: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  is_favorite: boolean
  usage_count: number
  /** true 表示來自 ref_destinations（非機場目的地） */
  is_destination?: boolean
}

interface CountryInfo {
  name: string
  code: string
}

const AIRPORTS_CACHE_KEY = 'entity:ref_airports+destinations:list'
const COUNTRIES_CACHE_KEY = 'entity:countries:slim'

const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000,
}

async function fetchAirports(): Promise<Airport[]> {
  const [airportsRes, destinationsRes] = await Promise.all([
    supabase
      .from('ref_airports')
      .select(
        'iata_code, icao_code, name_en, name_zh, city_code, city_name_en, city_name_zh, country_code, timezone, latitude, longitude, is_favorite, usage_count'
      )
      .order('usage_count', { ascending: false, nullsFirst: true })
      .order('city_name_zh', { ascending: true })
      .limit(1000),
    supabase
      .from('ref_destinations')
      .select('code, short_alias, country_code, name_zh, name_en, latitude, longitude'),
  ])

  if (airportsRes.error) {
    logger.error('載入機場資料失敗:', airportsRes.error)
    throw airportsRes.error
  }
  if (destinationsRes.error) {
    logger.error('載入目的地資料失敗:', destinationsRes.error)
  }

  const airports: Airport[] = ((airportsRes.data || []) as Array<Partial<Airport>>).map(a => ({
    iata_code: a.iata_code as string,
    icao_code: a.icao_code ?? null,
    name_en: a.name_en ?? null,
    name_zh: a.name_zh ?? null,
    city_name_en: a.city_name_en ?? null,
    city_name_zh: a.city_name_zh ?? null,
    country_code: a.country_code ?? null,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    timezone: a.timezone ?? null,
    is_favorite: a.is_favorite ?? false,
    usage_count: a.usage_count ?? 0,
    is_destination: false,
  }))

  const destinations: Airport[] = (
    (destinationsRes.data || []) as Array<{
      code: string
      short_alias: string | null
      country_code: string
      name_zh: string | null
      name_en: string | null
      latitude: number | null
      longitude: number | null
    }>
  )
    .filter(d => !!d.short_alias)
    .map(d => ({
      iata_code: d.short_alias as string,
      icao_code: null,
      name_en: d.name_en,
      name_zh: d.name_zh,
      city_name_en: d.name_en,
      city_name_zh: d.name_zh,
      country_code: d.country_code,
      latitude: d.latitude,
      longitude: d.longitude,
      timezone: null,
      is_favorite: false,
      usage_count: 0,
      is_destination: true,
    }))

  // iata_code 去重（機場優先於目的地）
  const byCode = new Map<string, Airport>()
  for (const a of airports) byCode.set(a.iata_code, a)
  for (const d of destinations) if (!byCode.has(d.iata_code)) byCode.set(d.iata_code, d)
  return Array.from(byCode.values())
}

// 5/12 William 拍板：國家移到 shared data、撈 ref_countries（SSOT、平台共用）
// 之前撈 countries（per-workspace）、已 TRUNCATE 廢棄
async function fetchCountries(): Promise<CountryInfo[]> {
  const { data, error } = await dynamicFrom('ref_countries')
    .select('name_zh, name_en, code')
    .eq('is_active', true)
    .order('name_zh', { ascending: true })

  if (error) {
    logger.error('載入國家列表失敗:', error)
    throw error
  }

  // map ref_countries 欄位到 CountryInfo（{ name, code }）
  return (data || []).map(
    (c: { name_zh: string | null; name_en: string | null; code: string }) => ({
      name: c.name_zh || c.name_en || c.code,
      code: c.code,
    })
  ) as CountryInfo[]
}

interface UseAirportsOptions {
  enabled?: boolean
}

export function useAirports(options: UseAirportsOptions = {}) {
  const { enabled = true } = options

  // 載入所有機場
  const {
    data: airports = [],
    isLoading: airportsLoading,
    error: airportsError,
  } = useSWR<Airport[]>(enabled ? AIRPORTS_CACHE_KEY : null, fetchAirports, SWR_CONFIG)

  // 載入國家列表（RLS 自動根據 auth session 過濾 workspace）
  const { data: countriesData = [], isLoading: countriesLoading } = useSWR<CountryInfo[]>(
    enabled ? COUNTRIES_CACHE_KEY : null,
    fetchCountries,
    SWR_CONFIG
  )

  const loading = airportsLoading || countriesLoading
  const error = airportsError

  // 建立 name → code 對照表（從 DB 讀取，非硬編碼）
  const countryNameToCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of countriesData) {
      map[c.name] = c.code
    }
    return map
  }, [countriesData])

  // 建立 code → name 對照表
  const countryCodeToName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of countriesData) {
      map[c.code] = c.name
    }
    return map
  }, [countriesData])

  // 返回國家名稱陣列（保持向後相容）
  const countries = useMemo(() => countriesData.map(c => c.name), [countriesData])

  // 根據國家名稱取得機場列表（按使用次數排序）
  const getAirportsByCountry = useCallback(
    (countryName: string): Airport[] => {
      const countryCode = countryNameToCode[countryName]
      if (!countryCode) return []

      return airports
        .filter(a => a.country_code === countryCode)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    },
    [airports, countryNameToCode]
  )

  // 取得機場詳細資訊
  const getAirport = useCallback(
    (iataCode: string): Airport | null => {
      return airports.find(a => a.iata_code === iataCode) || null
    },
    [airports]
  )

  // 取得機場顯示名稱
  const getAirportDisplayName = useCallback(
    (iataCode: string): string => {
      const airport = airports.find(a => a.iata_code === iataCode)
      if (!airport) return iataCode
      return airport.city_name_zh || airport.city_name_en || iataCode
    },
    [airports]
  )

  // 新增機場到 ref_airports（透過 API route 使用 admin client 繞過 RLS）
  const addAirport = useCallback(
    async (params: { iata_code: string; city_name_zh: string; country_code: string }) => {
      try {
        await apiPost('/api/airports', params)
      } catch (err) {
        logger.error('新增機場失敗:', err)
        throw new Error(extractHttpErrorMessage(err, '新增機場失敗'))
      }
      await mutate(AIRPORTS_CACHE_KEY)
      return params.iata_code
    },
    []
  )

  // Stage 1：ref_airports 全域化後、usage_count 寫入需擁有平台管理資格；
  // 一般業務的「常用」計次會在 Stage 1.5 以 workspace_airports overlay 表重做。
  // 目前保留 markAsUsed 介面為 no-op，避免破壞呼叫端。
  const markAsUsed = useCallback(async (_iataCode: string) => {
    // intentionally no-op — see comment above
  }, [])

  // 轉換格式：相容舊的 TourDestination 格式（用過的機場）
  const destinations = useMemo(() => {
    return airports
      .filter(a => (a.usage_count || 0) > 0)
      .map(a => ({
        id: a.iata_code,
        country: countryCodeToName[a.country_code || ''] || a.country_code || '',
        city: a.city_name_zh || a.city_name_en || '',
        airport_code: a.iata_code,
        created_at: null,
      }))
  }, [airports, countryCodeToName])

  return {
    airports,
    countries,
    countryNameToCode,
    destinations, // 相容舊格式
    loading,
    error,
    getAirportsByCountry,
    getAirport,
    getAirportDisplayName,
    addAirport,
    markAsUsed,
    refresh: () => mutate(AIRPORTS_CACHE_KEY),
  }
}
