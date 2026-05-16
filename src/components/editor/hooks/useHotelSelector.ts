'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { HotelItem } from '../HotelSelector'

// Supabase 查詢結果的型別（包含 join 的 regions 和 cities）
interface HotelQueryResult {
  id: string
  name: string
  name_en: string | null
  brand: string | null
  country_id: string
  region_id: string | null
  city_id: string
  star_rating: number | null
  hotel_class: string | null
  category: string | null
  description: string | null
  highlights: string[] | null
  price_range: string | null
  avg_price_per_night: number | null
  images: string[] | null
  is_active: boolean | null
  is_featured: boolean | null
  regions: { name: string } | null
  cities: { name: string } | null
}

// 使用 localStorage 保存篩選狀態（避免全域變數導致的狀態不一致）
const STORAGE_KEY = 'hotel-selector-filters'

function getSavedFilters() {
  if (typeof window === 'undefined') return { countryId: '', regionId: '', cityId: '', brand: '' }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { countryId: '', regionId: '', cityId: '', brand: '' }
  } catch {
    return { countryId: '', regionId: '', cityId: '', brand: '' }
  }
}

function saveFilters(filters: {
  countryId: string
  regionId: string
  cityId: string
  brand: string
}) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // ignore
  }
}

interface UseHotelSelectorProps {
  isOpen: boolean
  tourCountryName?: string
  tourCountryId?: string // 可直接用 country_id，優先於 tourCountryName
}

export function useHotelSelector({
  isOpen,
  tourCountryName,
  tourCountryId,
}: UseHotelSelectorProps) {
  // 使用 ref 來追蹤是否已初始化
  const savedFilters = useRef(getSavedFilters())

  const [selectedCountryId, setSelectedCountryId] = useState<string>('')
  const [selectedRegionId, setSelectedRegionId] = useState<string>('')
  const [selectedCityId, setSelectedCityId] = useState<string>('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [hotels, setHotels] = useState<HotelItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([])
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])

  // 手動新增飯店
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualHotelName, setManualHotelName] = useState('')

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

      // 重新讀取 localStorage
      savedFilters.current = getSavedFilters()

      // 優先使用 tourCountryId（直接用 ID），其次用 tourCountryName（用名稱匹配）
      if (tourCountryId) {
        const matchedCountry = countries.find(c => c.id === tourCountryId)
        if (matchedCountry && matchedCountry.id !== savedFilters.current.countryId) {
          setSelectedCountryId(matchedCountry.id)
          setSelectedRegionId('')
          setSelectedCityId('')
          setSelectedBrand('')
          saveFilters({ countryId: matchedCountry.id, regionId: '', cityId: '', brand: '' })
          return
        }
      } else if (tourCountryName) {
        const matchedCountry = countries.find(c => c.name === tourCountryName)
        if (matchedCountry && matchedCountry.id !== savedFilters.current.countryId) {
          setSelectedCountryId(matchedCountry.id)
          setSelectedRegionId('')
          setSelectedCityId('')
          setSelectedBrand('')
          saveFilters({ countryId: matchedCountry.id, regionId: '', cityId: '', brand: '' })
          return
        }
      }

      if (savedFilters.current.countryId) {
        setSelectedCountryId(savedFilters.current.countryId)
        setSelectedRegionId(savedFilters.current.regionId)
        setSelectedCityId(savedFilters.current.cityId)
        setSelectedBrand(savedFilters.current.brand)
      }
    }
  }, [isOpen, tourCountryName, tourCountryId, countries])

  // 國家變更
  const handleCountryChange = (countryId: string) => {
    const value = countryId === '__all__' ? '' : countryId
    setSelectedCountryId(value)
    setSelectedRegionId('')
    setSelectedCityId('')
    saveFilters({ countryId: value, regionId: '', cityId: '', brand: selectedBrand })
  }

  // 區域變更
  const handleRegionChange = (regionId: string) => {
    const value = regionId === '__all__' ? '' : regionId
    setSelectedRegionId(value)
    setSelectedCityId('')
    saveFilters({ countryId: selectedCountryId, regionId: value, cityId: '', brand: selectedBrand })
  }

  // 城市變更
  const handleCityChange = (cityId: string) => {
    const value = cityId === '__all__' ? '' : cityId
    setSelectedCityId(value)
    saveFilters({
      countryId: selectedCountryId,
      regionId: selectedRegionId,
      cityId: value,
      brand: selectedBrand,
    })
  }

  // 品牌變更
  const handleBrandChange = (brand: string) => {
    const value = brand === '__all__' ? '' : brand
    setSelectedBrand(value)
    saveFilters({
      countryId: selectedCountryId,
      regionId: selectedRegionId,
      cityId: selectedCityId,
      brand: value,
    })
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

  // 載入飯店資料
  useEffect(() => {
    if (!isOpen) return

    const loadHotels = async () => {
      if (!selectedCountryId) {
        setHotels([])
        return
      }

      setLoading(true)
      try {
        let query = supabase
          .from('hotels')
          .select(
            `
            id, name, name_en, brand, country_id, region_id, city_id,
            star_rating, hotel_class, category, description,
            highlights, price_range, avg_price_per_night,
            images, is_active, is_featured,
            regions(name),
            cities!inner(name)
          `
          )
          .eq('is_active', true)
          .eq('country_id', selectedCountryId)
          .order('is_featured', { ascending: false })
          .order('display_order')

        // 區域篩選
        if (selectedRegionId) {
          query = query.eq('region_id', selectedRegionId)
        }

        // 城市篩選
        if (selectedCityId) {
          query = query.eq('city_id', selectedCityId)
        }

        // 品牌篩選
        if (selectedBrand) {
          query = query.eq('brand', selectedBrand)
        }

        const { data, error } = await query

        if (error) throw error

        // 透過 unknown 中轉處理 Supabase 的複雜型別
        const formatted = ((data || []) as unknown as HotelQueryResult[]).map(
          (item): HotelItem => ({
            id: item.id,
            name: item.name,
            name_en: item.name_en,
            brand: item.brand,
            country_id: item.country_id,
            region_id: item.region_id || null,
            city_id: item.city_id,
            star_rating: item.star_rating,
            hotel_class: item.hotel_class,
            category: item.category,
            description: item.description,
            highlights: item.highlights,
            price_range: item.price_range,
            avg_price_per_night: item.avg_price_per_night,
            images: item.images,
            is_active: item.is_active ?? true,
            is_featured: item.is_featured ?? false,
            region_name: item.regions?.name || '',
            city_name: item.cities?.name || '',
          })
        )

        setHotels(formatted)
      } catch (error) {
        logger.error('Error loading hotels:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHotels()
  }, [isOpen, selectedCountryId, selectedRegionId, selectedCityId, selectedBrand])

  // 搜尋過濾
  const filteredHotels = useMemo(() => {
    if (!searchQuery) return hotels

    const query = searchQuery.toLowerCase()
    return hotels.filter(
      h =>
        h.name.toLowerCase().includes(query) ||
        h.name_en?.toLowerCase().includes(query) ||
        h.brand?.toLowerCase().includes(query) ||
        h.region_name?.toLowerCase().includes(query) ||
        h.city_name?.toLowerCase().includes(query)
    )
  }, [hotels, searchQuery])

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const resetState = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
    setShowManualInput(false)
    setManualHotelName('')
  }

  const handleManualAdd = (onSelect: (hotels: HotelItem[]) => void, onClose: () => void) => {
    if (!manualHotelName.trim()) return

    // 創建一個臨時的飯店物件
    const manualHotel: HotelItem = {
      id: `manual_${Date.now()}`,
      name: manualHotelName.trim(),
      name_en: null,
      brand: null,
      country_id: selectedCountryId || '',
      region_id: null,
      city_id: selectedCityId || '',
      star_rating: null,
      hotel_class: null,
      category: null,
      description: null,
      highlights: null,
      price_range: null,
      avg_price_per_night: null,
      images: null,
      is_active: true,
      is_featured: false,
      city_name: cities.find(c => c.id === selectedCityId)?.name || '',
    }

    onSelect([manualHotel])
    resetState()
    onClose()
  }

  return {
    // Filter states
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedBrand,
    searchQuery,
    setSearchQuery,

    // Data states
    hotels,
    filteredHotels,
    loading,
    countries,
    regions,
    cities,

    // Selection states
    selectedIds,
    toggleSelection,

    // Manual input states
    showManualInput,
    setShowManualInput,
    manualHotelName,
    setManualHotelName,
    handleManualAdd,

    // Handlers
    handleCountryChange,
    handleRegionChange,
    handleCityChange,
    handleBrandChange,
    resetState,
  }
}
