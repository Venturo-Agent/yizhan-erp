'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Search, MapPin, Building2, UtensilsCrossed } from 'lucide-react'

import { ResourceDetailDialog } from './ResourceDetailDialog'
import { CountryDropdown } from './CountryDropdown'
import { ResourceList } from './ResourceList'
import { useResourceSearch } from './useResourceSearch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAttractions, useHotels, useRestaurants } from '@/data'
import { ResourceType, ResourceItem } from './types'

const COMPONENT_LABELS = {
  ATTRACTION_LIBRARY: '景點庫',
} as const

// ============================================
// 資源庫面板主元件
// ============================================
//
// Phase A.6（5/20 William 拍板「根治」）：
// - 砍 useState<Record<ResourceType, ResourceItem[]>> 自管 cache（紅線 F 違反）
// - 改用 entity hook（useAttractions / useHotels / useRestaurants）→ SWR cache + realtime + invalidate 全內建
// - 砍 A.5 兜底：onNewItem push local state / onAfterCreate 清搜尋
// - 搜尋仍保留 raw（useResourceSearch）— entity hook usePaginated 沒 bigram fallback、不擴 entity hook
// - 預設顯示前 20 筆：在 component 層 slice(0, 20)，不動 entity hook signature
//
// Phase A.7（5/20 收尾）：
// - useResourceActions 5 條 raw 改 entity hook（updateXxx / softDelete + invalidateXxx）
// - 砍 A.6 的 onSave 邊界兜底（entity hook 內建 invalidate、不需要)

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

  // 選項列表（countries 用 raw、跟症狀 #1 無關、保留）
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])

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

  // ── 第二步：載入資源（走 entity hook + filter）──
  // 等國家解析完再 enable、避免列全世界景點（egress 殺手）
  const isResolving = (!!countryId || !!tourCode) && !resolvedCountryId
  const hookEnabled = !isResolving
  // entity hook filter：resolvedCountryId 存在才掛 country_id eq filter
  const filter = useMemo<Record<string, string | number | boolean | null>>(() => {
    const f: Record<string, string | number | boolean | null> = { is_active: true }
    if (resolvedCountryId) f.country_id = resolvedCountryId
    return f
  }, [resolvedCountryId])

  // 紅線 F：使用 entity hook 讀取、不自己 useSWR / useState 管 cache
  const { items: attractionsRaw, loading: attractionsLoading } = useAttractions({ enabled: hookEnabled, filter })
  const { items: hotelsRaw, loading: hotelsLoading } = useHotels({ enabled: hookEnabled, filter })
  const { items: restaurantsRaw, loading: restaurantsLoading } = useRestaurants({ enabled: hookEnabled, filter })

  // 把 entity row 映射成 ResourceItem（hotel star_rating 不在 hotels entity select、簡化掉）
  // 預設只顯示前 20 筆（保持原 UX，避免一次渲染上千張卡）
  const resources: Record<ResourceType, ResourceItem[]> = useMemo(
    () => ({
      attraction: (attractionsRaw || [])
        .slice(0, 20)
        .map(r => toResourceItem('attraction')(r as unknown as Record<string, unknown>)),
      hotel: (hotelsRaw || [])
        .slice(0, 20)
        .map(r => toResourceItem('hotel')(r as unknown as Record<string, unknown>)),
      restaurant: (restaurantsRaw || [])
        .slice(0, 20)
        .map(r => toResourceItem('restaurant')(r as unknown as Record<string, unknown>)),
    }),
    [attractionsRaw, hotelsRaw, restaurantsRaw]
  )

  const loading: Record<ResourceType, boolean> = {
    attraction: attractionsLoading,
    hotel: hotelsLoading,
    restaurant: restaurantsLoading,
  }

  // 搜尋結果（委托給 useResourceSearch hook、保留 raw ilike + bigram fallback）
  // 把 entity hook items 當依賴：寫入任何路徑（新增/刪除/編輯/驗證/圖片）
  // → entity hook items 變動 → 搜尋機自動重撈、不需手動接線
  const currentTabItems =
    activeTab === 'attraction' ? attractionsRaw : activeTab === 'hotel' ? hotelsRaw : restaurantsRaw
  const { searchResults, isSearching } = useResourceSearch({
    searchQuery,
    activeTab,
    resolvedCountryId,
    entityItems: currentTabItems,
  })

  // 顯示的資源：有搜尋時用搜尋結果，沒搜尋時用 entity hook 預載資料
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
          // 不再手動接線：useResourceSearch 已綁 entity items、寫入任何路徑自動觸發
        />
      </div>

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
        // 2026-05-20 Phase A.7：砍 A.6 加的 onSave 兜底
        //   - useResourceActions 5 條已全改 entity hook（handleSave/handleToggleVerify/
        //     handleImageUpload/handleDeleteImage/handleSetCover 走 updateXxx；
        //     handleDelete 保留 softDelete + invalidate）
        //   - 內建 invalidate 後、ResourcePanel 邊界處的兜底已多餘、紅線 F 達標
      />
    </div>
  )
}

// ============================================
// helper：entity row → ResourceItem
// ============================================
function toResourceItem(type: ResourceType) {
  return (row: Record<string, unknown>): ResourceItem => {
    const category = (row.category as string | null) ?? null
    return {
      id: row.id as string,
      name: row.name as string,
      type,
      category,
      images: (row.images as string[]) || [],
      data_verified: row.data_verified as boolean | undefined,
      latitude: (row.latitude as number | null) ?? null,
      longitude: (row.longitude as number | null) ?? null,
      address: (row.address as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      region_id: (row.region_id as string | null) ?? null,
    }
  }
}
