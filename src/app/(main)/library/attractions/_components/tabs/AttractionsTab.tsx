'use client'

/**
 * AttractionsTab - 景點管理分頁
 *
 * [Refactored] 使用 @/data hooks 取代直接 Supabase 查詢
 * - useCountryDictionary / useCityDictionary: O(1) 查詢，用於顯示
 * - useCountries / useRegions / useCities: 完整列表，用於對話框下拉選單
 */

import { logger } from '@/lib/utils/logger'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useAttractionsData, AttractionsTableName } from '../../_hooks/useAttractionsData'
import { useAttractionsFilters } from '../../_hooks/useAttractionsFilters'
import { useAttractionsDialog } from '../../_hooks/useAttractionsDialog'
import { useAttractionsReorder } from '../../_hooks/useAttractionsReorder'
import { AttractionsList } from '../AttractionsList'
import { useCountries, useRegions, useCities } from '@/data'

// Dynamic import for large dialog component (807 lines)
const AttractionsDialog = dynamic(
  () => import('../AttractionsDialog').then(m => m.AttractionsDialog),
  { ssr: false }
)

// ============================================
// 景點管理分頁
// ============================================

// 將狀態和函數導出，讓父組件可以使用
export interface AttractionsTabProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  selectedCountry: string
  openAdd: () => void
  isAddOpen: boolean
  closeAdd: () => void
  initialFormData: import('../../_types').AttractionFormData
  /** 固定分類篩選（用於飯店/餐廳獨立 tab） */
  fixedCategory?: string
  /** 資料表名稱（預設 attractions，飯店傳 hotels，餐廳傳 restaurants） */
  tableName?: AttractionsTableName
}

export default function AttractionsTab({
  searchTerm,
  setSearchTerm: _setSearchTerm,
  selectedCategory,
  setSelectedCategory: _setSelectedCategory,
  selectedCountry,
  openAdd,
  isAddOpen,
  closeAdd,
  initialFormData,
  fixedCategory,
  tableName = 'attractions',
}: AttractionsTabProps) {
  // 排序模式控制
  const [_isReorderMode, _setIsReorderMode] = useState(false)
  const [isSorting, setIsSorting] = useState(false)

  const { attractions, loading, addAttraction, updateAttraction, deleteAttraction, toggleStatus } =
    useAttractionsData(tableName)

  const { isEditOpen, editingAttraction, openEdit, closeEdit } = useAttractionsDialog()
  const { reorderAttractions, moveUp, moveDown } = useAttractionsReorder()

  // 使用 @/data hooks 載入地區資料（SWR 自動快取、去重）
  const { items: allCountries = [] } = useCountries({ all: true })
  const { items: regions = [] } = useRegions({ all: true })
  const { items: allCities = [] } = useCities({ all: true })

  // 從完整列表中篩選出景點引用的國家和城市（用於列表顯示）
  const displayCountries = useMemo(() => {
    const countryIds = new Set(attractions.map(a => a.country_id).filter(Boolean))
    return allCountries.filter(c => countryIds.has(c.id))
  }, [attractions, allCountries])

  const displayCities = useMemo(() => {
    const cityIds = new Set(attractions.map(a => a.city_id).filter(Boolean))
    return allCities.filter(c => cityIds.has(c.id))
  }, [attractions, allCities])

  const { sortedAttractions } = useAttractionsFilters({
    attractions,
    cities: displayCities,
    searchTerm,
    selectedCategory,
    selectedCountry,
    selectedRegion: '', // 不再使用地區篩選
    selectedCity: '', // 不再使用城市篩選
  })

  // 對話框使用完整的 countries/cities 列表（上面已載入）
  const countries = allCountries
  const cities = allCities

  const getRegionsByCountry = (countryId: string) => {
    return regions.filter(r => r.country_id === countryId)
  }

  const getCitiesByCountry = (countryId: string) => {
    return cities.filter(c => c.country_id === countryId)
  }

  const getCitiesByRegion = (regionId: string) => {
    return cities.filter(c => c.region_id === regionId)
  }

  const handleEditSubmit = async (formData: import('../../_types').AttractionFormData) => {
    if (!editingAttraction) return { success: false }

    // updateAttraction 內部已處理 tags/images 轉換，直接傳遞 formData
    const result = await updateAttraction(editingAttraction.id, formData)

    if (result?.success) {
      closeEdit()
      return { success: true }
    }
    return { success: false }
  }

  // 新增景點
  const handleAddSubmit = async (formData: import('../../_types').AttractionFormData) => {
    // addAttraction 內部已處理 tags/images 轉換
    const result = await addAttraction(formData)

    if (result?.success) {
      closeAdd()
      return { success: true }
    }
    return { success: false }
  }

  // 按名稱排序所有景點
  const _handleSortByName = async () => {
    if (isSorting || attractions.length === 0) return

    setIsSorting(true)
    try {
      // 按名稱排序（使用 localeCompare 支援中文排序）
      const sorted = [...attractions].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))

      // 批量更新 display_order
      await reorderAttractions(sorted)
      logger.log('[Attractions] 按名稱排序完成')
    } catch (error) {
      logger.error('[Attractions] 排序失敗:', error)
    } finally {
      setIsSorting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        {
          <AttractionsList
            loading={loading}
            sortedAttractions={sortedAttractions}
            countries={displayCountries}
            cities={displayCities}
            onEdit={openEdit}
            onToggleStatus={toggleStatus}
            onDelete={deleteAttraction}
            onAddNew={openAdd}
            onMoveUp={attraction => moveUp(attraction, sortedAttractions)}
            onMoveDown={attraction => moveDown(attraction, sortedAttractions)}
          />
        }
      </div>

      {/* 編輯對話框 */}
      {editingAttraction && (
        <AttractionsDialog
          open={isEditOpen}
          onClose={closeEdit}
          onSubmit={handleEditSubmit}
          attraction={editingAttraction}
          countries={countries}
          regions={regions}
          cities={cities}
          getRegionsByCountry={getRegionsByCountry}
          getCitiesByCountry={getCitiesByCountry}
          getCitiesByRegion={getCitiesByRegion}
          initialFormData={initialFormData}
          fixedCategory={fixedCategory}
          onDelete={deleteAttraction}
        />
      )}

      {/* 新增對話框 */}
      <AttractionsDialog
        open={isAddOpen}
        onClose={closeAdd}
        onSubmit={handleAddSubmit}
        attraction={null}
        countries={countries}
        regions={regions}
        cities={cities}
        getRegionsByCountry={getRegionsByCountry}
        getCitiesByCountry={getCitiesByCountry}
        getCitiesByRegion={getCitiesByRegion}
        initialFormData={initialFormData}
        fixedCategory={fixedCategory}
      />
    </div>
  )
}
