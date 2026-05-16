import { useState, useMemo } from 'react'
import { Attraction, SortField, SortDirection } from '../_types'
import type { City } from '@/stores/region-store'

// ============================================
// Hook: 篩選和排序邏輯
// ============================================

interface UseAttractionsFiltersProps {
  attractions: Attraction[]
  cities: City[]
  searchTerm: string
  selectedCategory: string
  selectedCountry: string
  selectedRegion: string
  selectedCity: string
}

export function useAttractionsFilters({
  attractions,
  cities,
  searchTerm,
  selectedCategory,
  selectedCountry,
  selectedRegion,
  selectedCity,
}: UseAttractionsFiltersProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // 排序處理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 同一欄位：null → asc → desc → null
      setSortDirection(sortDirection === null ? 'asc' : sortDirection === 'asc' ? 'desc' : null)
      if (sortDirection === 'desc') {
        setSortField(null)
      }
    } else {
      // 不同欄位：直接設為 asc
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 過濾資料（包含搜尋、國家、地區、城市、類別）
  const filteredAttractions = useMemo(() => {
    return attractions.filter(attr => {
      // 搜尋過濾
      if (searchTerm) {
        const matchSearch =
          attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attr.english_name?.toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchSearch) return false
      }

      // 地區過濾
      if (selectedCity) {
        if (attr.city_id !== selectedCity) return false
      } else if (selectedRegion) {
        if (attr.region_id !== selectedRegion) return false
      } else if (selectedCountry) {
        if (attr.country_id !== selectedCountry) return false
      }

      // 類別過濾
      if (selectedCategory === 'unverified') {
        // 只看待驗證
        if (attr.data_verified !== false) return false
      } else if (selectedCategory !== 'all') {
        // 支援模糊匹配（如 "住宿" 匹配 "住宿 / Accommodation"）
        if (!attr.category?.startsWith(selectedCategory)) return false
      }

      return true
    })
  }, [attractions, searchTerm, selectedCountry, selectedRegion, selectedCity, selectedCategory])

  // 排序資料（預設：待驗證優先 → 名稱）
  const sortedAttractions = useMemo(() => {
    return [...filteredAttractions].sort((a, b) => {
      // 預設排序：待驗證（data_verified=false）優先
      if (!sortField || !sortDirection) {
        const aVerified = a.data_verified ?? true
        const bVerified = b.data_verified ?? true
        if (aVerified !== bVerified) {
          return aVerified ? 1 : -1 // false 排前面
        }
        // 同樣驗證狀態，按名稱
        return a.name.localeCompare(b.name, 'zh-TW')
      }

      let compareA: string | number
      let compareB: string | number

      switch (sortField) {
        case 'name':
          compareA = a.name
          compareB = b.name
          break
        case 'city':
          const cityA = cities.find(c => c.id === a.city_id)
          const cityB = cities.find(c => c.id === b.city_id)
          compareA = cityA?.name || ''
          compareB = cityB?.name || ''
          break
        case 'category':
          compareA = a.category || ''
          compareB = b.category || ''
          break
        case 'duration':
          compareA = a.duration_minutes || 0
          compareB = b.duration_minutes || 0
          break
        case 'status':
          // 啟用 = 1, 停用 = 0，這樣升序時啟用會排在前面
          compareA = a.is_active ? 1 : 0
          compareB = b.is_active ? 1 : 0
          break
        default:
          return 0
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredAttractions, sortField, sortDirection, cities])

  return {
    // 排序
    sortField,
    sortDirection,
    handleSort,
    // 結果
    sortedAttractions,
  }
}
