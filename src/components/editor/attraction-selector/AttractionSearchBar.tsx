'use client'

import React, { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Search } from 'lucide-react'
import type { Country as FullCountry } from '@/stores/region-store'
import { COMP_EDITOR_LABELS } from '../constants/labels'

type Country = Pick<FullCountry, 'id' | 'name'>

interface AttractionSearchBarProps {
  countries: Country[]
  selectedCountryId: string
  searchQuery: string
  hideFilters?: boolean
  onCountryChange: (countryId: string) => void
  onSearchChange: (query: string) => void
}

export function AttractionSearchBar({
  countries,
  selectedCountryId,
  searchQuery,
  hideFilters,
  onCountryChange,
  onSearchChange,
}: AttractionSearchBarProps) {
  const countryOptions = useMemo(
    () => countries.map(c => ({ value: c.id, label: c.name })),
    [countries]
  )

  return (
    <div className="p-4">
      {/* 國家 + 搜尋（同一列） */}
      <div className="flex gap-2">
        {!hideFilters && (
          <Combobox
            value={selectedCountryId}
            onChange={val => onCountryChange(val || '__all__')}
            options={countryOptions}
            placeholder={COMP_EDITOR_LABELS.全部國家}
            className="w-[8.75rem] flex-shrink-0"
            showSearchIcon={false}
            showClearButton
            disablePortal
          />
        )}

        {/* 搜尋框 */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted"
            size="1em"
          />
          <Input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={COMP_EDITOR_LABELS.搜尋景點名稱}
            className="pl-9 h-9 rounded-lg border-morandi-container"
          />
        </div>
      </div>
    </div>
  )
}
