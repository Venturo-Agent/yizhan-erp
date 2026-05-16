'use client'

/**
 * RegionsTab - 地區管理標籤頁
 *
 * 按子區域（東北亞/東南亞/西歐…）分組顯示國家。
 * 資料來自 countries 表 + ref_countries.sub_region 合併。
 * Stage 4a：可切換國家啟用/停用（workspace_countries overlay）。
 */

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { EmptyValue } from '@/components/ui/empty-value'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { useCountries, useRegions, useCities } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const COMPONENT_LABELS = {
  TOAST_UPDATE_FAILED: '更新失敗',
  LOADING: '載入中...',
} as const

type Country = NonNullable<ReturnType<typeof useCountries>['items']>[number]
type City = NonNullable<ReturnType<typeof useCities>['items']>[number]

const SUB_REGION_ORDER = [
  '東北亞',
  '東南亞',
  '中東',
  '西歐',
  '南歐',
  '北歐',
  '中東歐',
  '北美',
  '南美',
  '大洋洲',
  '非洲',
  '其他',
]

interface RefCountryInfo {
  sub_region: string
  is_enabled: boolean
}

const WC_CACHE_KEY = 'workspace_countries:map'

async function fetchRefAndWorkspaceCountries(): Promise<Record<string, RefCountryInfo>> {
  const [refRes, wcRes] = await Promise.all([
    supabase.from('ref_countries').select('code, sub_region'),
    supabase.from('workspace_countries').select('country_code, is_enabled'),
  ])

  const map: Record<string, RefCountryInfo> = {}
  for (const row of refRes.data || []) {
    map[row.code] = {
      sub_region: row.sub_region || '其他',
      is_enabled: true,
    }
  }
  for (const row of wcRes.data || []) {
    if (map[row.country_code]) {
      map[row.country_code].is_enabled = row.is_enabled
    }
  }
  return map
}

export default function RegionsTab() {
  const t = useTranslations('library')
  const { items: countries = [], loading: countriesLoading } = useCountries({ all: true })
  const { items: regions = [] } = useRegions({ all: true })
  const { items: cities = [] } = useCities({ all: true })

  const { data: refMap = {} } = useSWR(WC_CACHE_KEY, fetchRefAndWorkspaceCountries, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(new Set())
  const [isCitiesDialogOpen, setIsCitiesDialogOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const toggleRegion = (region: string) => {
    setCollapsedRegions(prev => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region)
      else next.add(region)
      return next
    })
  }

  const handleToggleCountry = useCallback(async (countryCode: string, currentEnabled: boolean) => {
    setToggling(countryCode)
    try {
      const { error } = await supabase
        .from('workspace_countries')
        .update({ is_enabled: !currentEnabled })
        .eq('country_code', countryCode)

      if (error) throw error
      await mutate(WC_CACHE_KEY)
    } catch {
      toast.error(COMPONENT_LABELS.TOAST_UPDATE_FAILED)
    } finally {
      setToggling(null)
    }
  }, [])

  const grouped = useMemo(() => {
    const groups: Record<string, Country[]> = {}
    for (const c of countries) {
      const info = c.code ? refMap[c.code] : undefined
      const sub = info?.sub_region || '其他'
      if (!groups[sub]) groups[sub] = []
      groups[sub].push(c)
    }
    return SUB_REGION_ORDER.filter(r => groups[r]?.length).map(r => ({
      region: r,
      countries: groups[r].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW')),
    }))
  }, [countries, refMap])

  const getCityCount = (countryId: string) => cities.filter(c => c.country_id === countryId).length

  const handleOpenCitiesDialog = (country: Country) => {
    setSelectedCountry(country)
    setIsCitiesDialogOpen(true)
  }

  const countryCities = useMemo(() => {
    if (!selectedCountry) return []
    return cities.filter(c => c.country_id === selectedCountry.id)
  }, [cities, selectedCountry])

  const citiesByRegion = useMemo(() => {
    const grouped: Record<string, City[]> = { '': [] }
    countryCities.forEach(city => {
      const regionId = city.region_id || ''
      if (!grouped[regionId]) grouped[regionId] = []
      grouped[regionId].push(city)
    })
    return grouped
  }, [countryCities])

  const getRegionName = (regionId: string) => {
    if (!regionId) return t('regionsTabUnclassified')
    const region = regions.find(r => r.id === regionId)
    return region?.name || regionId
  }

  if (countriesLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">{COMPONENT_LABELS.LOADING}</div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border/40">
          {grouped.map(({ region, countries: regionCountries }) => {
            const isCollapsed = collapsedRegions.has(region)
            const enabledCount = regionCountries.filter(
              c => c.code && refMap[c.code]?.is_enabled !== false
            ).length
            return (
              <div key={region}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-morandi-container/30 hover:bg-morandi-container/50 transition-colors text-left"
                  onClick={() => toggleRegion(region)}
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} className="text-morandi-muted" />
                  ) : (
                    <ChevronDown size={16} className="text-morandi-muted" />
                  )}
                  <span className="text-sm font-semibold text-morandi-primary">{region}</span>
                  <span className="text-xs text-morandi-secondary">
                    {enabledCount}/{regionCountries.length} {t('regionsTabEnable')}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-border/20">
                    {regionCountries.map(country => {
                      const cityCount = getCityCount(country.id)
                      const info = country.code ? refMap[country.code] : undefined
                      const isEnabled = info?.is_enabled !== false
                      return (
                        <div
                          key={country.id}
                          className={`flex items-center px-4 py-2.5 transition-colors ${
                            isEnabled ? 'hover:bg-muted/30' : 'opacity-50 bg-muted/10'
                          }`}
                        >
                          <div className="w-10">
                            <Switch
                              checked={isEnabled}
                              disabled={toggling === country.code}
                              onCheckedChange={() =>
                                country.code && handleToggleCountry(country.code, isEnabled)
                              }
                            />
                          </div>
                          <div className="flex-1 min-w-0 ml-2">
                            <div className="font-medium text-sm text-foreground">
                              {country.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{country.name_en}</div>
                          </div>
                          <div className="w-16 text-center">
                            <span className="text-xs font-mono text-muted-foreground">
                              {country.code || <EmptyValue />}
                            </span>
                          </div>
                          <div className="w-24 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCitiesDialog(country)}
                              className="h-7 px-2 text-xs"
                            >
                              {cityCount} {t('regionsTabCityUnit')}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={isCitiesDialogOpen} onOpenChange={setIsCitiesDialogOpen}>
        <DialogContent level={1} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCountry?.name} {t('regionsTabCityList')}</DialogTitle>
          </DialogHeader>

          {countryCities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('regionsTabNoCitiesData')}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(citiesByRegion).map(([regionId, regionCities]) => (
                <div key={regionId || 'no-region'}>
                  <div className="text-sm font-medium text-muted-foreground mb-2 pb-1 border-b">
                    {getRegionName(regionId)} ({regionCities.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {regionCities.map(city => (
                      <div key={city.id} className="px-2 py-1.5 text-sm">
                        {city.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsCitiesDialogOpen(false)} className="gap-2">
              <Check size={16} />
              {t('regionsTabClose')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
