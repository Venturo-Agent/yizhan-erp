'use client'

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Edit, Plus } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../constants/labels'

// 品牌列表
const HOTEL_BRANDS = [
  'Aman',
  'Four Seasons',
  'Ritz-Carlton',
  'Park Hyatt',
  'Mandarin Oriental',
  'Peninsula',
  'St. Regis',
  'Conrad',
  'Waldorf Astoria',
  'InterContinental',
  'Capella',
  'Banyan Tree',
  'Sofitel Legend',
  'Shilla',
  'Signiel',
]

interface HotelSearchInputProps {
  // Filter values
  selectedCountryId: string
  selectedRegionId: string
  selectedCityId: string
  selectedBrand: string
  searchQuery: string

  // Data
  countries: { id: string; name: string }[]
  regions: { id: string; name: string }[]
  cities: { id: string; name: string }[]

  // Handlers
  onCountryChange: (value: string) => void
  onRegionChange: (value: string) => void
  onCityChange: (value: string) => void
  onBrandChange: (value: string) => void
  onSearchChange: (value: string) => void

  // Manual input
  showManualInput: boolean
  onToggleManualInput: () => void
  manualHotelName: string
  onManualHotelNameChange: (value: string) => void
  onManualAdd: () => void
}

export function HotelSearchInput({
  selectedCountryId,
  selectedRegionId,
  selectedCityId,
  selectedBrand,
  searchQuery,
  countries,
  regions,
  cities,
  onCountryChange,
  onRegionChange,
  onCityChange,
  onBrandChange,
  onSearchChange,
  showManualInput,
  onToggleManualInput,
  manualHotelName,
  onManualHotelNameChange,
  onManualAdd,
}: HotelSearchInputProps) {
  return (
    <>
      {/* 篩選區 - 第一排：國家、區域、城市 */}
      <div className="flex gap-3 flex-wrap">
        {/* 國家選擇 */}
        <Select value={selectedCountryId || '__all__'} onValueChange={onCountryChange}>
          <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold">
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
            <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold">
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
            <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[7.5rem] focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold">
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

        {/* 品牌選擇 */}
        <Select value={selectedBrand || '__all__'} onValueChange={onBrandChange}>
          <SelectTrigger className="h-11 px-4 border-morandi-container rounded-xl text-sm bg-card min-w-[8.75rem] focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold">
            <SelectValue placeholder={COMP_EDITOR_LABELS.全部品牌} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{COMP_EDITOR_LABELS.全部品牌}</SelectItem>
            {HOTEL_BRANDS.map(brand => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 搜尋框 */}
        <div className="flex-1 relative min-w-[11.25rem]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted"
            size="1.125em"
          />
          <Input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={COMP_EDITOR_LABELS.搜尋飯店}
            className="pl-10 h-11 rounded-xl border-morandi-container focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold"
          />
        </div>

        {/* 手動新增按鈕 */}
        <Button
          type="button"
          variant="soft-gold"
          onClick={onToggleManualInput}
          className={`rounded-xl h-11 gap-1.5 ${showManualInput ? 'bg-morandi-gold/10 border-morandi-gold' : ''}`}
        >
          <Edit size="1em" />
          {COMP_EDITOR_LABELS.手動輸入}
        </Button>
      </div>

      {/* 手動輸入區 */}
      {showManualInput && (
        <div className="flex gap-2 p-3 bg-morandi-gold/10 border border-morandi-gold/30 rounded-xl">
          <Input
            value={manualHotelName}
            onChange={e => onManualHotelNameChange(e.target.value)}
            placeholder={COMP_EDITOR_LABELS.輸入飯店名稱}
            className="flex-1 h-10 rounded-lg border-morandi-gold/30 focus:ring-2 focus:ring-morandi-gold/30 focus:border-morandi-gold"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onManualAdd()
              }
            }}
            autoFocus
          />
          <Button
            variant="soft-gold"
            type="button"
            onClick={onManualAdd}
            disabled={!manualHotelName.trim()}
            className="rounded-lg h-10 px-4 gap-1.5"
          >
            <Plus size="1em" />
            {COMP_EDITOR_LABELS.新增}
          </Button>
        </div>
      )}
    </>
  )
}
