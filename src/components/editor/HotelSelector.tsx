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
import { Building2, CheckSquare } from 'lucide-react'
import { HotelSearchInput } from './hotel/HotelSearchInput'
import { HotelList } from './hotel/HotelList'
import { useHotelSelector } from './hooks/useHotelSelector'
import { COMP_EDITOR_LABELS } from './constants/labels'

// 飯店型別
export interface HotelItem {
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
  is_active: boolean
  is_featured: boolean
  // Join fields
  region_name?: string
  city_name?: string
}

interface HotelSelectorProps {
  isOpen: boolean
  onClose: () => void
  tourCountryName?: string
  tourCountryId?: string // 可直接用 country_id，優先於 tourCountryName
  onSelect: (hotels: HotelItem[]) => void
}

export function HotelSelector({
  isOpen,
  onClose,
  tourCountryName = '',
  tourCountryId,
  onSelect,
}: HotelSelectorProps) {
  const {
    // Filter states
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedBrand,
    searchQuery,
    setSearchQuery,

    // Data states
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
  } = useHotelSelector({ isOpen, tourCountryName, tourCountryId })

  const handleConfirm = () => {
    const selected = filteredHotels.filter(h => selectedIds.has(h.id))
    onSelect(selected)
    resetState()
    onClose()
  }

  const handleCancel = () => {
    resetState()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        level={3}
        className="w-[50rem] h-[43.75rem] max-w-[90vw] max-h-[85vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-morandi-gold/10 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="text-morandi-gold" size="1.375em" />
            {COMP_EDITOR_LABELS.SELECT_8723}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          {/* 搜尋與篩選區 */}
          <HotelSearchInput
            selectedCountryId={selectedCountryId}
            selectedRegionId={selectedRegionId}
            selectedCityId={selectedCityId}
            selectedBrand={selectedBrand}
            searchQuery={searchQuery}
            countries={countries}
            regions={regions}
            cities={cities}
            onCountryChange={handleCountryChange}
            onRegionChange={handleRegionChange}
            onCityChange={handleCityChange}
            onBrandChange={handleBrandChange}
            onSearchChange={setSearchQuery}
            showManualInput={showManualInput}
            onToggleManualInput={() => setShowManualInput(!showManualInput)}
            manualHotelName={manualHotelName}
            onManualHotelNameChange={setManualHotelName}
            onManualAdd={() => handleManualAdd(onSelect, onClose)}
          />

          {/* 飯店列表 */}
          <div className="flex-1 overflow-y-auto border border-morandi-container/50 rounded-xl bg-card">
            <HotelList
              hotels={filteredHotels}
              loading={loading}
              selectedIds={selectedIds}
              selectedCountryId={selectedCountryId}
              searchQuery={searchQuery}
              onToggleSelection={toggleSelection}
            />
          </div>

          {/* 已選擇提示 */}
          {selectedIds.size > 0 && (
            <div className="text-sm text-morandi-gold bg-morandi-gold/10 px-4 py-2.5 rounded-xl border border-morandi-gold/30 flex items-center gap-2">
              <div className="w-6 h-6 bg-morandi-gold rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedIds.size}
              </div>
              已選擇 {selectedIds.size} 間飯店
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/50">
          <Button variant="soft-gold" onClick={handleCancel} className="rounded-xl">
            {COMP_EDITOR_LABELS.取消}
          </Button>
          <Button
            variant="morandi-gold"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="rounded-xl min-w-[7.5rem]"
          >
            <CheckSquare size="1em" />
            新增飯店 ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
