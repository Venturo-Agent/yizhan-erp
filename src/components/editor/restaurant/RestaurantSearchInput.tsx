'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Star } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface LocationData {
  id: string
  name: string
}

// 餐廳分類
const RESTAURANT_CATEGORIES = [
  { value: 'fine-dining', label: COMP_EDITOR_LABELS.高級餐廳 },
  { value: 'casual', label: COMP_EDITOR_LABELS.休閒餐廳 },
  { value: 'local', label: COMP_EDITOR_LABELS.在地美食 },
  { value: 'buffet', label: COMP_EDITOR_LABELS.自助餐 },
  { value: 'izakaya', label: COMP_EDITOR_LABELS.居酒屋 },
]

interface RestaurantSearchInputProps {
  // Filters
  selectedCountryId: string
  selectedRegionId: string
  selectedCityId: string
  selectedCategory: string
  onCountryChange: (value: string) => void
  onRegionChange: (value: string) => void
  onCityChange: (value: string) => void
  onCategoryChange: (value: string) => void

  // Search
  searchQuery: string
  onSearchChange: (value: string) => void

  // Location data
  countries: LocationData[]
  regions: LocationData[]
  cities: LocationData[]

  // Michelin
  includeMichelin?: boolean
  showMichelinOnly: boolean
  onMichelinToggle: () => void
}

export function RestaurantSearchInput({
  selectedCountryId,
  selectedRegionId,
  selectedCityId,
  selectedCategory,
  onCountryChange,
  onRegionChange,
  onCityChange,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  countries,
  regions,
  cities,
  includeMichelin = true,
  showMichelinOnly,
  onMichelinToggle,
}: RestaurantSearchInputProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {/* 國家選擇 */}
      <Select value={selectedCountryId || '__all__'} onValueChange={onCountryChange}>
        <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-cat-pink/30 focus:border-cat-pink">
          <SelectValue placeholder={COMP_EDITOR_LABELS.全部國家} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{COMP_EDITOR_LABELS.全部國家}</SelectItem>
          {countries.map(country => (
            <SelectItem key={country.id} value={country.id}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 區域選擇 */}
      {selectedCountryId && regions.length > 0 && (
        <Select value={selectedRegionId || '__all__'} onValueChange={onRegionChange}>
          <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-cat-pink/30 focus:border-cat-pink">
            <SelectValue placeholder={COMP_EDITOR_LABELS.全部區域} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{COMP_EDITOR_LABELS.全部區域}</SelectItem>
            {regions.map(region => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 城市選擇 */}
      {selectedCountryId && cities.length > 0 && (
        <Select value={selectedCityId || '__all__'} onValueChange={onCityChange}>
          <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-cat-pink/30 focus:border-cat-pink">
            <SelectValue placeholder={COMP_EDITOR_LABELS.全部城市} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{COMP_EDITOR_LABELS.全部城市}</SelectItem>
            {cities.map(city => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 分類選擇 */}
      {!showMichelinOnly && (
        <Select value={selectedCategory || '__all__'} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-cat-pink/30 focus:border-cat-pink">
            <SelectValue placeholder={COMP_EDITOR_LABELS.全部分類} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{COMP_EDITOR_LABELS.全部分類}</SelectItem>
            {RESTAURANT_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 米其林篩選 */}
      {includeMichelin && (
        <button
          onClick={onMichelinToggle}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            showMichelinOnly
              ? 'bg-status-danger text-white'
              : 'bg-card border border-morandi-container text-morandi-secondary hover:bg-status-danger-bg'
          }`}
        >
          <Star size="0.875em" className="inline mr-1" />
          {COMP_EDITOR_LABELS.LABEL_4890}
        </button>
      )}

      {/* 搜尋框 */}
      <div className="flex-1 relative min-w-[10rem]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted" size="1.125em" />
        <Input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={COMP_EDITOR_LABELS.搜尋餐廳}
          className="pl-10 h-11 rounded-xl border-morandi-container focus:ring-2 focus:ring-cat-pink/30 focus:border-cat-pink"
        />
      </div>
    </div>
  )
}
