'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { CombinedRestaurant } from '../RestaurantSelector'

interface UseRestaurantSelectorProps {
  isOpen: boolean
  tourCountryName?: string
  includeMichelin?: boolean
}

interface LocationData {
  id: string
  name: string
}

// Supabase 查詢結果型別（合併後的 restaurants、含米其林欄位）
interface RestaurantQueryResult {
  id: string
  name: string
  name_en: string | null
  country_id: string
  region_id: string | null
  city_id: string
  cuisine_type: string[] | null
  category: string | null
  meal_type: string[] | null
  description: string | null
  specialties: string[] | null
  signature_dishes: string[] | null
  price_range: string | null
  avg_price_lunch: number | null
  avg_price_dinner: number | null
  group_friendly: boolean | null
  max_group_size: number | null
  group_menu_available: boolean | null
  private_room: boolean | null
  images: string[] | null
  rating: number | null
  is_active: boolean | null
  is_featured: boolean | null
  latitude: number | null
  longitude: number | null
  address: string | null
  phone: string | null
  google_maps_url: string | null
  michelin_stars: number | null
  bib_gourmand: boolean | null
  green_star: boolean | null
  regions: { name: string } | null
  cities: { name: string } | null
}

// 保存篩選狀態
let savedCountryId = ''
let savedRegionId = ''
let savedCityId = ''
let savedCategory = ''

export function useRestaurantSelector({
  isOpen,
  tourCountryName = '',
  includeMichelin = true,
}: UseRestaurantSelectorProps) {
  // Location filters
  const [selectedCountryId, setSelectedCountryId] = useState<string>(savedCountryId)
  const [selectedRegionId, setSelectedRegionId] = useState<string>(savedRegionId)
  const [selectedCityId, setSelectedCityId] = useState<string>(savedCityId)
  const [selectedCategory, setSelectedCategory] = useState<string>(savedCategory)

  // Search and data
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurants, setRestaurants] = useState<CombinedRestaurant[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Location data
  const [countries, setCountries] = useState<LocationData[]>([])
  const [regions, setRegions] = useState<LocationData[]>([])
  const [cities, setCities] = useState<LocationData[]>([])

  // Michelin filter
  const [showMichelinOnly, setShowMichelinOnly] = useState(false)

  // 載入所有國家
  useEffect(() => {
    if (!isOpen) return

    const loadCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      setCountries(data || [])
    }
    loadCountries().catch(err => logger.error('[loadCountries]', err))
  }, [isOpen])

  // 打開對話框時自動選擇行程的國家
  useEffect(() => {
    if (isOpen && countries.length > 0) {
      setSelectedIds(new Set())

      if (tourCountryName) {
        const matchedCountry = countries.find(c => c.name === tourCountryName)
        if (matchedCountry && matchedCountry.id !== savedCountryId) {
          setSelectedCountryId(matchedCountry.id)
          savedCountryId = matchedCountry.id
          setSelectedRegionId('')
          savedRegionId = ''
          setSelectedCityId('')
          savedCityId = ''
          return
        }
      }

      if (savedCountryId) {
        setSelectedCountryId(savedCountryId)
        setSelectedRegionId(savedRegionId)
        setSelectedCityId(savedCityId)
        setSelectedCategory(savedCategory)
      }
    }
  }, [isOpen, tourCountryName, countries])

  // 國家變更
  const handleCountryChange = (countryId: string) => {
    const value = countryId === '__all__' ? '' : countryId
    setSelectedCountryId(value)
    setSelectedRegionId('')
    setSelectedCityId('')
    savedCountryId = value
    savedRegionId = ''
    savedCityId = ''
  }

  // 區域變更
  const handleRegionChange = (regionId: string) => {
    const value = regionId === '__all__' ? '' : regionId
    setSelectedRegionId(value)
    setSelectedCityId('')
    savedRegionId = value
    savedCityId = ''
  }

  // 城市變更
  const handleCityChange = (cityId: string) => {
    const value = cityId === '__all__' ? '' : cityId
    setSelectedCityId(value)
    savedCityId = value
  }

  // 分類變更
  const handleCategoryChange = (category: string) => {
    const value = category === '__all__' ? '' : category
    setSelectedCategory(value)
    savedCategory = value
  }

  // 載入區域列表
  useEffect(() => {
    if (!isOpen || !selectedCountryId) {
      setRegions([])
      return
    }

    const loadRegions = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name')
        .eq('country_id', selectedCountryId)
        .eq('is_active', true)
        .order('name')
      setRegions(data || [])
    }
    loadRegions().catch(err => logger.error('[loadRegions]', err))
  }, [isOpen, selectedCountryId])

  // 載入城市列表（根據區域或國家）
  useEffect(() => {
    if (!isOpen || !selectedCountryId) {
      setCities([])
      return
    }

    const loadCities = async () => {
      let query = supabase
        .from('cities')
        .select('id, name')
        .eq('country_id', selectedCountryId)
        .eq('is_active', true)
        .order('name')

      // 如果有選區域，只顯示該區域的城市
      if (selectedRegionId) {
        query = query.eq('region_id', selectedRegionId)
      }

      const { data } = await query
      setCities(data || [])
    }
    loadCities().catch(err => logger.error('[loadCities]', err))
  }, [isOpen, selectedCountryId, selectedRegionId])

  // 載入餐廳資料（包含一般餐廳和米其林餐廳）
  useEffect(() => {
    if (!isOpen) return

    const loadRestaurants = async () => {
      if (!selectedCountryId) {
        setRestaurants([])
        return
      }

      setLoading(true)
      try {
        // SSOT 後：restaurants 表已含 michelin 欄位、單一 query 抓全部
        let restaurantQuery = supabase
          .from('restaurants')
          .select(
            `
            id, name, name_en, country_id, region_id, city_id,
            cuisine_type, category, meal_type, description,
            specialties, signature_dishes,
            price_range, avg_price_lunch, avg_price_dinner,
            group_friendly, max_group_size, group_menu_available,
            private_room, images, rating, is_active, is_featured,
            latitude, longitude, address, phone, google_maps_url,
            michelin_stars, bib_gourmand, green_star,
            regions(name),
            cities!inner(name)
          `
          )
          .eq('is_active', true)
          .eq('country_id', selectedCountryId)
          .order('michelin_stars', { ascending: false, nullsFirst: false })
          .order('is_featured', { ascending: false })
          .order('display_order')

        if (selectedRegionId) restaurantQuery = restaurantQuery.eq('region_id', selectedRegionId)
        if (selectedCityId) restaurantQuery = restaurantQuery.eq('city_id', selectedCityId)
        if (selectedCategory) restaurantQuery = restaurantQuery.eq('category', selectedCategory)

        const { data: restaurantData } = await restaurantQuery

        const results: CombinedRestaurant[] = []
        if (restaurantData) {
          ;(restaurantData as unknown as RestaurantQueryResult[]).forEach(item => {
            const isMichelin = (item.michelin_stars ?? 0) > 0 || item.bib_gourmand === true
            results.push({
              id: item.id,
              name: item.name,
              name_en: item.name_en,
              country_id: item.country_id,
              region_id: item.region_id || null,
              city_id: item.city_id,
              cuisine_type: item.cuisine_type,
              category: item.category,
              meal_type: item.meal_type,
              description: item.description,
              specialties: item.specialties,
              signature_dishes: item.signature_dishes,
              price_range: item.price_range,
              avg_price_lunch: item.avg_price_lunch,
              avg_price_dinner: item.avg_price_dinner,
              group_friendly: item.group_friendly ?? true,
              max_group_size: item.max_group_size,
              group_menu_available: item.group_menu_available ?? false,
              private_room: item.private_room ?? false,
              images: item.images,
              rating: item.rating,
              is_active: item.is_active ?? true,
              is_featured: item.is_featured ?? false,
              latitude: item.latitude,
              longitude: item.longitude,
              address: item.address,
              phone: item.phone,
              google_maps_url: item.google_maps_url,
              // 米其林欄位（一般餐廳為 null/false）
              michelin_stars: item.michelin_stars,
              bib_gourmand: item.bib_gourmand,
              green_star: item.green_star,
              // source 由 michelin 欄位 derive、向下相容 RestaurantCard / 排序邏輯
              source: isMichelin ? 'michelin' : 'restaurant',
              region_name: item.regions?.name || '',
              city_name: item.cities?.name || '',
            })
          })
        }

        // 若 includeMichelin=false 由 caller 控制過濾（行程編輯器選餐廳時可關閉米其林）
        const filtered = includeMichelin ? results : results.filter(r => r.source !== 'michelin')
        setRestaurants(filtered)
      } catch (error) {
        logger.error('Error loading restaurants:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRestaurants()
  }, [
    isOpen,
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedCategory,
    includeMichelin,
    showMichelinOnly,
  ])

  // 搜尋過濾
  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants

    if (showMichelinOnly) {
      filtered = filtered.filter(r => r.source === 'michelin')
    }

    if (!searchQuery) return filtered

    const query = searchQuery.toLowerCase()
    return filtered.filter(
      r =>
        r.name.toLowerCase().includes(query) ||
        r.name_en?.toLowerCase().includes(query) ||
        r.region_name?.toLowerCase().includes(query) ||
        r.city_name?.toLowerCase().includes(query) ||
        r.cuisine_type?.some(c => c.toLowerCase().includes(query))
    )
  }, [restaurants, searchQuery, showMichelinOnly])

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const resetSelection = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
  }

  return {
    // Filters
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedCategory,
    handleCountryChange,
    handleRegionChange,
    handleCityChange,
    handleCategoryChange,

    // Search
    searchQuery,
    setSearchQuery,

    // Data
    restaurants,
    filteredRestaurants,
    loading,

    // Location data
    countries,
    regions,
    cities,

    // Selection
    selectedIds,
    toggleSelection,
    resetSelection,

    // Michelin filter
    showMichelinOnly,
    setShowMichelinOnly,
  }
}
