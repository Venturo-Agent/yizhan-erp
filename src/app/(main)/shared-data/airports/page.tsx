'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dynamicFrom } from '@/lib/supabase/typed-client'

interface Airport {
  iata_code: string
  icao_code: string | null
  name_en: string | null
  name_zh: string | null
  city_code: string | null
  city_name_en: string | null
  city_name_zh: string | null
  country_code: string | null
  timezone: string | null
}

interface CountryRef {
  code: string
  name_zh: string | null
  name_en: string | null
  continent: string | null
}

async function fetchAirports(): Promise<Airport[]> {
  // 6075 筆、一次抓進來、用 client-side 篩選（每筆小、不會慢）
  const { data, error } = await dynamicFrom('ref_airports')
    .select(
      'iata_code, icao_code, name_en, name_zh, city_code, city_name_en, city_name_zh, country_code, timezone'
    )
    .order('iata_code', { ascending: true })
    .limit(10000)
  if (error) throw error
  return (data ?? []) as Airport[]
}

async function fetchCountries(): Promise<CountryRef[]> {
  const { data, error } = await dynamicFrom('ref_countries')
    .select('code, name_zh, name_en, continent')
    .order('name_zh', { ascending: true })
  if (error) throw error
  return (data ?? []) as CountryRef[]
}

export default function SharedDataAirportsPage() {
  const t = useTranslations('sharedData')
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('') // 空字串 = 全部
  const { data: airports = [], isLoading } = useSWR<Airport[]>(
    'shared-data:airports',
    fetchAirports,
    { revalidateOnFocus: false, dedupingInterval: 60 * 60 * 1000 }
  )
  const { data: countries = [] } = useSWR<CountryRef[]>(
    'shared-data:airports:countries',
    fetchCountries,
    { revalidateOnFocus: false, dedupingInterval: 60 * 60 * 1000 }
  )

  // 國家 code → 中文名 lookup
  const countryNameByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of countries) {
      if (c.code) map[c.code] = c.name_zh || c.name_en || c.code
    }
    return map
  }, [countries])

  // 篩選後機場
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return airports.filter(a => {
      // 國家篩選
      if (countryFilter && a.country_code !== countryFilter) return false
      if (!q) return true
      return (
        a.iata_code.toLowerCase().includes(q) ||
        (a.icao_code?.toLowerCase().includes(q) ?? false) ||
        (a.name_en?.toLowerCase().includes(q) ?? false) ||
        (a.name_zh?.toLowerCase().includes(q) ?? false) ||
        (a.city_name_en?.toLowerCase().includes(q) ?? false) ||
        (a.city_name_zh?.toLowerCase().includes(q) ?? false) ||
        (a.country_code?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [airports, search, countryFilter])

  // 按國家分組（依該國機場數量排序、有多→少）
  const grouped = useMemo(() => {
    const map: Record<string, Airport[]> = {}
    for (const a of filtered) {
      const key = a.country_code ?? '__no_country'
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    // 排序：依機場數量降序
    return Object.entries(map).sort(([, ax], [, bx]) => bx.length - ax.length)
  }, [filtered])

  return (
    <ContentPageLayout title={t('moduleAirports')}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholderAirports')}
            className="max-w-sm"
          />
          <Select
            value={countryFilter || 'all'}
            onValueChange={v => setCountryFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部國家" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部國家</SelectItem>
              {countries.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name_zh || c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">
            {t('totalRows', { n: filtered.length })}
          </span>
        </div>

        {isLoading && (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            {t('loading')}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            {t('noData')}
          </div>
        )}

        {!isLoading &&
          grouped.map(([countryCode, list]) => (
            <div key={countryCode} className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-morandi-primary">
                    {countryCode === '__no_country' ? '未設定國家' : countryCode}
                  </span>
                  <span className="text-sm text-morandi-secondary">
                    {countryNameByCode[countryCode] ??
                      (countryCode === '__no_country' ? '' : countryCode)}
                  </span>
                </div>
                <span className="text-xs text-morandi-muted">{list.length} 個機場</span>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-1.5 text-left text-xs font-medium">
                      {t('colNameZh')}
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-medium">
                      {t('colIata')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(a => (
                    <tr key={a.iata_code} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-1.5">{a.name_zh ?? '—'}</td>
                      <td className="px-4 py-1.5 font-mono font-semibold">{a.iata_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </ContentPageLayout>
  )
}
