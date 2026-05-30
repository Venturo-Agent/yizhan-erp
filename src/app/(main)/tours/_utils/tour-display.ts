/**
 * tour-display — 旅遊團顯示用衍生資料的 SSOT helper
 *
 * 設計原則：
 * - tour 的「目的地」展示字串、「是否國內團」等屬性，全部從 tours.country_id /
 *   airport_code 衍生，不從 tours.location 字串猜
 * - 提供 pure 函數版（給 server-side / 非 React 環境）和 hook 版（給 client component）
 * - countries 表目前有 slug / UUID 兩種 id 並存、本層用 name 比對；dedupe 完成後可改成 id 比對
 */

import { useMemo } from 'react'
import { useCountries } from '@/data'
import { useAirports } from '@/app/(main)/tours/_hooks/useAirports'
import type { Tour } from '@/types/tour'

interface CountryLite {
  id: string
  name: string
}

interface AirportLite {
  iata_code: string
  city_name_zh: string | null
  city_name_en: string | null
}

/** 從 country_id 解析國家中文名 */
function getTourCountryName(
  tour: Pick<Tour, 'country_id'> | null | undefined,
  countries: CountryLite[]
): string {
  if (!tour?.country_id) return ''
  return countries.find(c => c.id === tour.country_id)?.name || ''
}

/** 從 airport_code 解析城市中文名（PVG → 上海） */
function getTourCityName(
  tour: Pick<Tour, 'airport_code'> | null | undefined,
  airports: AirportLite[]
): string {
  if (!tour?.airport_code) return ''
  return airports.find(a => a.iata_code === tour.airport_code)?.city_name_zh || ''
}

/**
 * 旅遊團「目的地」顯示字串。
 * 優先順序：城市名 → 國家名 → 機場代碼 → 空字串
 * 例如「上海」、「日本」、「PVG」
 */
export function getTourDestinationDisplay(
  tour: Pick<Tour, 'country_id' | 'airport_code'> | null | undefined,
  countries: CountryLite[],
  airports: AirportLite[]
): string {
  if (!tour) return ''
  const city = getTourCityName(tour, airports)
  if (city) return city
  const country = getTourCountryName(tour, countries)
  if (country) return country
  return tour.airport_code || ''
}

/**
 * 是否為國內團（台灣團）。
 * 規則：tour.country_id 對應的國家名稱為「台灣」
 */
export function isDomesticTour(
  tour: Pick<Tour, 'country_id'> | null | undefined,
  countries: CountryLite[]
): boolean {
  return getTourCountryName(tour, countries) === '台灣'
}

// ============================================================
// React Hook 版本
// ============================================================

/** 取得旅遊團「目的地」顯示字串 + 是否國內團的 hook */
export function useTourDisplay(tour: Pick<Tour, 'country_id' | 'airport_code'> | null | undefined) {
  const { items: countries } = useCountries({ all: true })
  const { airports } = useAirports()

  return useMemo(() => {
    const countryName = getTourCountryName(tour, countries as CountryLite[])
    const cityName = getTourCityName(tour, airports as AirportLite[])
    const displayString = cityName || countryName || tour?.airport_code || ''
    const isDomestic = countryName === '台灣'
    return { countryName, cityName, displayString, isDomestic }
  }, [tour, countries, airports])
}

/**
 * 給 list 渲染用：載入 countries / airports 一次後回傳 resolver function。
 * 在 list iteration 內呼叫 resolver(tour) 取得每一筆的 displayString，
 * 不需要 per-row 呼叫 hook。
 */
export function useTourDisplayResolver() {
  const { items: countries } = useCountries({ all: true })
  const { airports } = useAirports()

  return useMemo(() => {
    const c = countries as CountryLite[]
    const a = airports as AirportLite[]
    return (tour: Pick<Tour, 'country_id' | 'airport_code'> | null | undefined) => {
      if (!tour) return { countryName: '', cityName: '', displayString: '', isDomestic: false }
      const countryName = getTourCountryName(tour, c)
      const cityName = getTourCityName(tour, a)
      const displayString = cityName || countryName || tour.airport_code || ''
      return { countryName, cityName, displayString, isDomestic: countryName === '台灣' }
    }
  }, [countries, airports])
}
