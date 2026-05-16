'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Attraction } from '@/app/(main)/library/attractions/_types'
import type { Country as FullCountry, City as FullCity } from '@/stores/region-store'
import { logger } from '@/lib/utils/logger'

// 此 hook 只需要 id 和 name
type City = Pick<FullCity, 'id' | 'name'>
type Country = Pick<FullCountry, 'id' | 'name'>

interface AttractionWithCity extends Attraction {
  city_name?: string
  region_name?: string
}

// 使用 module-level 變數保存篩選狀態（半永久記憶）
let savedCountryId = ''
let savedCityId = ''

// 解析行程標題，取得可能的景點名稱
function parseDayTitleForAttractions(title: string): string[] {
  if (!title) return []

  // 分割符號：→、⇀、·、|、>、、、-、/
  const separators = /[→⇀·|>、\-/]/g
  const parts = title.split(separators)

  // 過濾掉「完全符合」的非景點關鍵字（不是包含）
  const exactExcludePatterns = [
    /^機場$/,
    /^飯店$/,
    /^酒店$/,
    /^入住$/,
    /^check.?in$/i,
    /^check.?out$/i,
    /^自由活動$/,
    /^午餐$/,
    /^晚餐$/,
    /^早餐$/,
    /^用餐$/,
    /^台北$/,
    /^桃園$/,
    /^國際$/,
    /^\s*$/,
    /^✈.*$/,
    /^⭐.*$/,
  ]

  // 「包含」就排除的關鍵字（通常是連接詞）
  const partialExcludePatterns = [/飯店入住/, /酒店入住/]

  return parts
    .map(p => p.trim())
    .filter(p => p.length >= 2) // 至少 2 個字
    .filter(p => !exactExcludePatterns.some(pattern => pattern.test(p)))
    .filter(p => !partialExcludePatterns.some(pattern => pattern.test(p)))
}

interface UseAttractionSearchProps {
  isOpen: boolean
  countryId?: string
  tourCountryName?: string
  dayTitle?: string
}

export function useAttractionSearch({
  isOpen,
  countryId,
  tourCountryName = '',
  dayTitle = '',
}: UseAttractionSearchProps) {
  const [selectedCountryId, setSelectedCountryId] = useState<string>(savedCountryId)
  const [selectedCityId, setSelectedCityId] = useState<string>(savedCityId)
  const [searchQuery, setSearchQuery] = useState('')
  const [attractions, setAttractions] = useState<AttractionWithCity[]>([])
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [countries, setCountries] = useState<Country[]>([])

  // 載入所有國家（當有直接 countryId 時跳過）
  useEffect(() => {
    if (!isOpen || countryId) return

    const loadCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      setCountries(data || [])
    }
    loadCountries().catch(err => logger.error('[loadCountries]', err))
  }, [isOpen, countryId])

  // 當有直接 countryId 時，直接設定（跳過模糊比對）
  useEffect(() => {
    if (isOpen && countryId) {
      if (countryId !== selectedCountryId) {
        setSelectedCountryId(countryId)
        savedCountryId = countryId
        setSelectedCityId('')
        savedCityId = ''
      }
    }
  }, [isOpen, countryId])

  // 打開對話框時自動選擇行程的國家（沒有 countryId 時用 tourCountryName 模糊比對）
  useEffect(() => {
    if (isOpen && !countryId && countries.length > 0 && tourCountryName) {
      // 精確比對 → 包含比對 → 被包含比對
      const name = tourCountryName.trim()
      const matchedCountry =
        countries.find(c => c.name === name) ||
        countries.find(c => c.name.includes(name)) ||
        countries.find(c => name.includes(c.name))
      if (matchedCountry && matchedCountry.id !== savedCountryId) {
        setSelectedCountryId(matchedCountry.id)
        savedCountryId = matchedCountry.id
        setSelectedCityId('')
        savedCityId = ''
      }
    }
  }, [isOpen, countryId, tourCountryName, countries])

  // 打開對話框時清空搜尋框，讓建議景點排在最前面
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // 更新國家時同步保存
  const handleCountryChange = (countryId: string) => {
    const value = countryId === '__all__' ? '' : countryId
    setSelectedCountryId(value)
    setSelectedCityId('')
    savedCountryId = value
    savedCityId = ''
  }

  // 更新城市時同步保存
  const handleCityChange = (cityId: string) => {
    const value = cityId === '__all__' ? '' : cityId
    setSelectedCityId(value)
    savedCityId = value
  }

  // 載入城市列表（當有直接 countryId 時跳過，不需要城市篩選）
  useEffect(() => {
    if (!isOpen || !selectedCountryId || countryId) {
      setCities([])
      return
    }

    const loadCities = async () => {
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id, name')
          .eq('country_id', selectedCountryId)
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setCities(data || [])
      } catch (_error) {
        setCities([])
      }
    }

    loadCities()
  }, [isOpen, selectedCountryId, countryId])

  // 載入景點資料（包含經緯度）
  useEffect(() => {
    if (!isOpen) return

    const loadAttractions = async () => {
      // 必須選擇國家才載入，否則資料太多（1600+筆）
      if (!selectedCountryId) {
        setAttractions([])
        return
      }

      setLoading(true)
      try {
        let query = supabase
          .from('attractions')
          .select(
            `
            id,
            name,
            english_name,
            category,
            description,
            images,
            country_id,
            region_id,
            city_id,
            latitude,
            longitude,
            address,
            cities (
              name
            )
          `
          )
          .eq('is_active', true)
          .eq('country_id', selectedCountryId)
          .order('name')

        // 如果有選擇城市，進一步篩選
        if (selectedCityId) {
          query = query.eq('city_id', selectedCityId)
        }

        const { data, error } = await query

        if (error) throw error

        const formatted = (data || []).map(
          (item: {
            id: string
            name: string
            english_name: string | null
            category: string | null
            description: string | null
            images: string[] | null
            country_id: string
            region_id: string | null
            city_id: string | null
            latitude: number | null
            longitude: number | null
            address: string | null
            cities: { name: string } | null
          }): AttractionWithCity => ({
            id: item.id,
            name: item.name,
            english_name: item.english_name ?? undefined,
            category: item.category ?? undefined,
            description: item.description ?? undefined,
            images: item.images ?? undefined,
            country_id: item.country_id,
            region_id: item.region_id ?? undefined,
            city_id: item.city_id ?? undefined,
            latitude: item.latitude ?? undefined,
            longitude: item.longitude ?? undefined,
            address: item.address ?? undefined,
            city_name: item.cities?.name || '',
            is_active: true,
            display_order: 0,
            created_at: '',
            updated_at: '',
          })
        )

        setAttractions(formatted)
      } catch (_error) {
        // 靜默失敗，使用空陣列
      } finally {
        setLoading(false)
      }
    }

    loadAttractions()
  }, [isOpen, selectedCountryId, selectedCityId])

  // 解析行程標題，找出可能的景點關鍵字
  const titleKeywords = useMemo(() => parseDayTitleForAttractions(dayTitle), [dayTitle])

  // 根據標題關鍵字匹配建議景點（完全匹配優先）
  const suggestedAttractions = useMemo(() => {
    if (titleKeywords.length === 0 || attractions.length === 0) return []

    const exactMatches: AttractionWithCity[] = []
    const partialMatches: AttractionWithCity[] = []
    const addedIds = new Set<string>()

    // 按關鍵字順序處理
    for (const keyword of titleKeywords) {
      const keywordLower = keyword.toLowerCase()

      for (const a of attractions) {
        if (addedIds.has(a.id)) continue

        const nameLower = a.name.toLowerCase()

        // 完全匹配
        if (nameLower === keywordLower) {
          exactMatches.push(a)
          addedIds.add(a.id)
        }
        // 部分匹配（名稱包含關鍵字，或關鍵字包含名稱）
        else if (nameLower.includes(keywordLower) || keywordLower.includes(nameLower)) {
          partialMatches.push(a)
          addedIds.add(a.id)
        }
      }
    }

    // 完全匹配排前面，部分匹配排後面
    const suggestions = [...exactMatches, ...partialMatches]
    return suggestions
  }, [titleKeywords, attractions])

  // 搜尋過濾 + 建議景點優先排序
  const filteredAttractions = useMemo(() => {
    let results = attractions

    // 如果有搜尋，先過濾
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        a =>
          a.name.toLowerCase().includes(query) ||
          a.english_name?.toLowerCase().includes(query) ||
          a.city_name?.toLowerCase().includes(query) ||
          a.category?.toLowerCase().includes(query)
      )
    }

    // 沒有搜尋時，把建議的景點排在最前面
    if (!searchQuery && suggestedAttractions.length > 0) {
      const suggestedIds = new Set(suggestedAttractions.map(s => s.id))
      const suggested = results.filter(a => suggestedIds.has(a.id))
      const others = results.filter(a => !suggestedIds.has(a.id))
      return [...suggested, ...others]
    }

    return results
  }, [attractions, searchQuery, suggestedAttractions])

  return {
    // 狀態
    selectedCountryId,
    selectedCityId,
    searchQuery,
    attractions: filteredAttractions,
    suggestedAttractions,
    loading,
    cities,
    countries,

    // 處理函數
    handleCountryChange,
    handleCityChange,
    setSearchQuery,
  }
}
