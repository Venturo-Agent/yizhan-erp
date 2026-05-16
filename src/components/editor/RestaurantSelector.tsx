'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed } from 'lucide-react'
import { useRestaurantSelector } from './hooks/useRestaurantSelector'
import { RestaurantSearchInput } from './restaurant/RestaurantSearchInput'
import { RestaurantList } from './restaurant/RestaurantList'
import { COMP_EDITOR_LABELS } from './constants/labels'

// 餐廳型別
export interface Restaurant {
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
  price_range: string | null
  avg_price_lunch: number | null
  avg_price_dinner: number | null
  group_friendly: boolean
  max_group_size: number | null
  group_menu_available: boolean
  private_room: boolean
  images: string[] | null
  rating: number | null
  is_active: boolean
  is_featured: boolean
  // GPS 資訊
  latitude: number | null
  longitude: number | null
  address: string | null
  phone: string | null
  google_maps_url: string | null
  // Join fields
  region_name?: string
  city_name?: string
}

// 米其林餐廳型別（從現有表格）
export interface MichelinRestaurant {
  id: string
  name: string
  name_en: string | null
  country_id: string
  city_id: string
  michelin_stars: number | null
  bib_gourmand: boolean | null
  green_star: boolean | null
  cuisine_type: string[] | null
  description: string | null
  signature_dishes: string[] | null
  price_range: string | null
  avg_price_lunch: number | null
  avg_price_dinner: number | null
  group_friendly: boolean | null
  max_group_size: number | null
  group_menu_available: boolean | null
  private_room: boolean | null
  images: string[] | null
  is_active: boolean | null
  // GPS 資訊
  latitude: number | null
  longitude: number | null
  address: string | null
  phone: string | null
  google_maps_url: string | null
  // Join fields
  region_name?: string
  city_name?: string
}

export type CombinedRestaurant = (Restaurant | MichelinRestaurant) & {
  source: 'restaurant' | 'michelin'
  region_name?: string
  city_name?: string
}

interface RestaurantSelectorProps {
  isOpen: boolean
  onClose: () => void
  tourCountryName?: string
  onSelect: (restaurants: CombinedRestaurant[]) => void
  includeMichelin?: boolean // 是否包含米其林餐廳
}

export function RestaurantSelector({
  isOpen,
  onClose,
  tourCountryName = '',
  onSelect,
  includeMichelin = true,
}: RestaurantSelectorProps) {
  const {
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
  } = useRestaurantSelector({
    isOpen,
    tourCountryName,
    includeMichelin,
  })

  const handleConfirm = () => {
    const selected = restaurants.filter(r => selectedIds.has(r.id))
    onSelect(selected)
    resetSelection()
    onClose()
  }

  const handleCancel = () => {
    resetSelection()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        level={1}
        className="w-[50rem] h-[43.75rem] max-w-[90vw] max-h-[85vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-cat-pink-bg to-transparent">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UtensilsCrossed className="text-cat-pink" size="1.375em" />
            {COMP_EDITOR_LABELS.SELECT_6249}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          {/* 篩選區 - 國家、區域、城市 */}
          <RestaurantSearchInput
            selectedCountryId={selectedCountryId}
            selectedRegionId={selectedRegionId}
            selectedCityId={selectedCityId}
            selectedCategory={selectedCategory}
            onCountryChange={handleCountryChange}
            onRegionChange={handleRegionChange}
            onCityChange={handleCityChange}
            onCategoryChange={handleCategoryChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            countries={countries}
            regions={regions}
            cities={cities}
            includeMichelin={includeMichelin}
            showMichelinOnly={showMichelinOnly}
            onMichelinToggle={() => setShowMichelinOnly(!showMichelinOnly)}
          />

          {/* 餐廳列表 */}
          <div className="flex-1 overflow-y-auto border border-morandi-container/50 rounded-xl bg-card">
            <RestaurantList
              restaurants={filteredRestaurants}
              loading={loading}
              selectedIds={selectedIds}
              selectedCountryId={selectedCountryId}
              searchQuery={searchQuery}
              onToggle={toggleSelection}
            />
          </div>

          {/* 已選擇提示 */}
          {selectedIds.size > 0 && (
            <div className="text-sm text-cat-pink bg-cat-pink-bg px-4 py-2.5 rounded-xl border border-cat-pink/30 flex items-center gap-2">
              <div className="w-6 h-6 bg-cat-pink rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedIds.size}
              </div>
              已選擇 {selectedIds.size} 間餐廳
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/50">
          <Button variant="soft-gold" onClick={handleCancel} className="rounded-xl">
            {COMP_EDITOR_LABELS.取消}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="bg-cat-pink hover:bg-cat-pink/80 text-white rounded-xl min-w-[7.5rem]"
          >
            新增餐廳 ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
