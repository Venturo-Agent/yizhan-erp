'use client'

/**
 * useCountryAirports — 某國所有機場 + 該國沒機場的城市（陸路）
 *
 * 設計理念：同城多機場分開列（台北 TPE / TSA、東京 NRT / HND）
 * 陸路案（無機場的城市）也列出來（京都（陸路）、華欣（陸路））
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

interface AirportOption {
  value: string // IATA code 或 city slug
  label: string // "台北 (TPE)" 或 "華欣（陸路）"
  type: 'airport' | 'city'
  iata_code?: string
  city_name?: string
}

export function useCountryAirports(countryCode: string | null | undefined) {
  const cacheKey = countryCode ? `country_airports:${countryCode}` : null

  const { data, isLoading } = useSWR<AirportOption[]>(cacheKey, async () => {
    if (!countryCode) return []

    // 從 ref_airports（SSOT、6075 筆乾淨資料、PK iata_code 已去重）取該國所有機場
    const { data: airports } = await supabase
      .from('ref_airports')
      .select('iata_code, city_name_zh, city_name_en, name_en, usage_count')
      .eq('country_code', countryCode)
      .not('iata_code', 'is', null)

    const airportOpts: AirportOption[] = (airports ?? [])
      .sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
      .map(a => ({
        value: a.iata_code,
        label: `${a.city_name_zh || a.city_name_en || a.iata_code} (${a.iata_code})`,
        type: 'airport' as const,
        iata_code: a.iata_code,
        city_name: a.city_name_zh || a.city_name_en || undefined,
      }))

    // 決定：下拉只列機場（維持原邏輯）、city 層保留 ref_cities 但不列入下拉
    //   - 業務選無機場城市（京都/宜蘭等）→ 選最近機場 + 團名寫清楚
    //   - tours.airport_code 繼續存 IATA、代號格式統一、未來接 GDS 也乾淨
    return airportOpts
  })

  return {
    options: data ?? [],
    loading: isLoading,
  }
}
