'use client'

import React, { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Search, MapPin, Building2, UtensilsCrossed } from 'lucide-react'

import { ResourceDetailDialog } from './ResourceDetailDialog'
import { CountryDropdown } from './CountryDropdown'
import { ResourceList } from './ResourceList'
import { useResourceSearch } from './useResourceSearch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { ResourceType, ResourceItem } from './types'

const COMPONENT_LABELS = {
  ATTRACTION_LIBRARY: '景點庫',
} as const

// ============================================
// 資源庫面板主元件
// ============================================

interface TourItineraryItem {
  id: string
  resource_id?: string | null
  resource_type?: string | null
  override_description?: string | null
}

interface ResourcePanelProps {
  className?: string
  countryId?: string // 行程目的地國家 ID 或名稱
  cityId?: string // 行程目的地城市
  locationName?: string // 團的目的地名稱（用於反查地區，如「名古屋」）
  tourId?: string // 團 ID（用於地圖偏好儲存）
  tourCode?: string // 團代碼（用於推斷機場座標，如 FUK260702A）
  canEditDatabase?: boolean // 是否可以編輯資料庫
  coreItems?: TourItineraryItem[] // 行程中的項目（用於判斷景點是否已加入）
  onOverrideSave?: () => void // 覆蓋儲存後的 callback
}

export function ResourcePanel({
  className,
  countryId,
  locationName,
  tourCode,
  canEditDatabase = false,
  coreItems = [],
  onOverrideSave,
}: ResourcePanelProps) {
  const [activeTab, setActiveTab] = useState<ResourceType>('attraction')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false) // 防止重複點擊

  // 編輯 Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null)

  // 篩選：只用國家（簡化版）
  const [resolvedCountryId, setResolvedCountryId] = useState<string | undefined>(undefined)

  // 選項列表
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])

  const [resources, setResources] = useState<Record<ResourceType, ResourceItem[]>>({
    attraction: [],
    hotel: [],
    restaurant: [],
  })
  const [loading, setLoading] = useState<Record<ResourceType, boolean>>({
    attraction: true,
    hotel: true,
    restaurant: true,
  })

  // ── 第一步：解析 countryId prop → resolvedCountryId ──
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const resolve = async () => {
      // 總是載入所有國家供選擇（支援跨國旅遊）
      const { data: allCountries } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (allCountries) setCountries(allCountries)

      if (!countryId) {
        // 沒有預設國家，完成
        return
      }

      // 嘗試直接匹配
      const { data: direct } = await supabase
        .from('countries')
        .select('id, name')
        .eq('id', countryId)
        .limit(1)

      if (direct && direct.length > 0) {
        setResolvedCountryId(direct[0].id)
        return
      }

      // 嘗試名稱匹配
      const { data: byName } = await supabase
        .from('countries')
        .select('id, name')
        .or(`name.eq.${countryId},english_name.ilike.${countryId}`)
        .limit(1)

      if (byName && byName.length > 0) {
        setResolvedCountryId(byName[0].id)
        return
      }

      // 嘗試用城市名反查
      const { data: byCity } = await supabase
        .from('cities')
        .select('country_id, region_id')
        .or(`name.eq.${countryId},id.eq.${countryId}`)
        .limit(1)

      if (byCity && byCity.length > 0) {
        const cid = byCity[0].country_id
        setResolvedCountryId(cid)
        return
      }

      // 5/13 W 反饋：景點庫沒按國家篩、可能 tour.country_id 空、用 tour.tourCode IATA 反查
      // tourCode 格式 'OKA261223A'、前 3 字 = IATA airport code → ref_airports.country_code → countries.id
      if (tourCode) {
        const iata = tourCode.substring(0, 3).toUpperCase()
        const { data: airport } = await supabase
          .from('ref_airports')
          .select('country_code')
          .eq('iata_code', iata)
          .limit(1)
        if (airport && airport[0]?.country_code) {
          const { data: country } = await supabase
            .from('countries')
            .select('id')
            .eq('code', airport[0].country_code)
            .limit(1)
          if (country && country[0]?.id) {
            setResolvedCountryId(country[0].id)
            return
          }
        }
      }

      // 都找不到，不設定預設國家
    }
    void resolve()
  }, [countryId, locationName, tourCode])

  // ── 第二步：載入資源（等國家解析完再查、避免列全世界景點）──
  const isResolving = (!!countryId || !!tourCode) && !resolvedCountryId
  useEffect(() => {
    if (isResolving) return // 等待國家解析完成

    const supabase = createSupabaseBrowserClient()

    const fetchResources = async (
      table: 'attractions' | 'hotels' | 'restaurants',
      type: ResourceType,
      extraSelect = ''
    ) => {
      const selectStr = `id, name, category, images, data_verified, latitude, longitude, address, description, region_id${extraSelect}`
      let query = supabase
        .from(table)
        .select(selectStr as 'id, name, category, images')
        .eq('is_active', true)

      // 簡化版：只用國家篩選
      if (resolvedCountryId) query = query.eq('country_id', resolvedCountryId)

      // 只載入前 20 筆作為預設顯示，搜尋時會重新查詢
      const { data, error } = await query.order('name').limit(20)

      if (error) {
        logger.error(`[ResourcePanel] 載入${type}失敗:`, error)
      }

      setResources(prev => ({
        ...prev,
        [type]: (data || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          name: item.name as string,
          type,
          category:
            type === 'hotel' && item.star_rating
              ? `${item.star_rating}星`
              : (item.category as string | null),
          images: (item.images as string[]) || [],
          data_verified: item.data_verified as boolean | undefined,
          latitude: item.latitude as number | null,
          longitude: item.longitude as number | null,
          address: item.address as string | null,
          description: item.description as string | null,
          region_id: item.region_id as string | null,
        })),
      }))
      setLoading(prev => ({ ...prev, [type]: false }))
    }

    setLoading({ attraction: true, hotel: true, restaurant: true })
    void Promise.all([
      fetchResources('attractions', 'attraction'),
      fetchResources('hotels', 'hotel', ', star_rating'),
      fetchResources('restaurants', 'restaurant'),
    ])
  }, [resolvedCountryId, isResolving])

  // 搜尋結果（委托給 useResourceSearch hook）
  const { searchResults, isSearching } = useResourceSearch({ searchQuery, activeTab, resolvedCountryId })

  // 顯示的資源：有搜尋時用搜尋結果，沒搜尋時用預載資料
  const filteredResources = searchQuery.trim() ? searchResults : resources[activeTab]

  const tabs: { key: ResourceType; label: string; icon: React.ReactNode }[] = [
    { key: 'attraction', label: '景點', icon: <MapPin size="0.875em" /> },
    { key: 'hotel', label: '酒店', icon: <Building2 size="0.875em" /> },
    { key: 'restaurant', label: '餐廳', icon: <UtensilsCrossed size="0.875em" /> },
  ]

  return (
    <div className={cn('flex flex-col bg-card border-b border-border', className)}>
      {/* 大標題：景點庫 */}
      <div className="h-9 bg-morandi-gold-header px-3 flex items-center border-b border-border">
        <h2 className="text-sm font-semibold">{COMPONENT_LABELS.ATTRACTION_LIBRARY}</h2>
      </div>

      {/* 地區篩選 + 類型分頁（4欄平均） */}
      <div className="grid grid-cols-4 border-b-2 border-border bg-card">
        {/* 地區篩選 - 下拉選單 */}
        <CountryDropdown
          countries={countries}
          resolvedCountryId={resolvedCountryId}
          onCountryChange={setResolvedCountryId}
        />

        {/* 景點/酒店/餐廳分頁 */}
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setSearchQuery('')
            }}
            className={cn(
              'flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
              index < tabs.length - 1 && 'border-r border-border',
              activeTab === tab.key
                ? 'text-morandi-primary bg-morandi-gold/10 border-b-2 border-morandi-gold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            <div className="flex items-center gap-1">
              {tab.icon}
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* 搜尋框 */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search
            size="0.875em"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`搜尋${tabs.find(t => t.key === activeTab)?.label}...`}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* 資源列表（雙欄佈局）*/}
      <div className="flex-1 overflow-y-auto p-2">
        <ResourceList
          activeTab={activeTab}
          filteredResources={filteredResources}
          loading={loading[activeTab]}
          isSearching={isSearching}
          searchQuery={searchQuery}
          isCreating={isCreating}
          resolvedCountryId={resolvedCountryId}
          countryId={countryId}
          onEdit={r => {
            setEditingResource(r)
            setEditDialogOpen(true)
          }}
          onCreatingChange={setIsCreating}
          onNewItem={newItem => {
            setResources(prev => ({
              ...prev,
              [activeTab]: [newItem, ...(prev[activeTab] || [])],
            }))
          }}
          // 新增成功後清搜尋 → filteredResources 切回 resources[activeTab]
          // 用戶才能立刻看到剛建的那筆（搜「大黃」沒結果時、按 + 新增、清搜尋即顯示）
          onAfterCreate={() => setSearchQuery('')}
        />
      </div>

      {/* 地圖面板（可收合）- 暫時隱藏 */}
      {/* <ResourceMapPanel
        tourId={tourId || null}
        tourCode={tourCode || null}
        countryId={resolvedCountryId || null}
      /> */}

      {/* 資源詳情 Dialog */}
      <ResourceDetailDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        resource={editingResource}
        canEditDatabase={canEditDatabase}
        // 查找這個景點是否已在行程中
        tourItineraryItemId={
          editingResource
            ? coreItems.find(
                item =>
                  item.resource_id === editingResource.id &&
                  item.resource_type === editingResource.type
              )?.id
            : undefined
        }
        currentOverride={
          editingResource
            ? coreItems.find(
                item =>
                  item.resource_id === editingResource.id &&
                  item.resource_type === editingResource.type
              )?.override_description
            : undefined
        }
        onOverrideSave={() => {
          onOverrideSave?.()
        }}
        onSave={updated => {
          // 更新列表中的資源名稱
          setResources(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].map(r =>
              r.id === updated.id ? { ...r, name: updated.name } : r
            ),
          }))
        }}
      />
    </div>
  )
}
