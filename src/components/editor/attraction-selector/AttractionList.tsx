'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { AttractionCard } from './AttractionCard'
import { Attraction } from '@/app/(main)/library/attractions/_types'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface AttractionWithCity extends Attraction {
  city_name?: string
  region_name?: string
}

interface AttractionListProps {
  attractions: AttractionWithCity[]
  suggestedAttractions: AttractionWithCity[]
  selectedIds: Set<string>
  existingIds: Set<string>
  loading: boolean
  selectedCountryId: string
  searchQuery: string
  canEditDatabase?: boolean
  onToggleSelection: (id: string) => void
  onViewOnMap?: (attraction: AttractionWithCity) => void
  onViewDetail?: (attraction: AttractionWithCity) => void
  onEdit?: (attraction: AttractionWithCity) => void
  selectedMapAttractionId?: string
}

export function AttractionList({
  attractions,
  suggestedAttractions,
  selectedIds,
  existingIds,
  loading,
  selectedCountryId,
  searchQuery,
  canEditDatabase,
  onToggleSelection,
  onViewOnMap,
  onViewDetail,
  onEdit,
  selectedMapAttractionId,
}: AttractionListProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-morandi-secondary">
        <Loader2 className="animate-spin mr-2" size="1.25em" />
        {COMP_EDITOR_LABELS.載入中}
      </div>
    )
  }

  if (attractions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-morandi-secondary">
        {!selectedCountryId
          ? COMP_EDITOR_LABELS.請先選擇國家
          : searchQuery
            ? COMP_EDITOR_LABELS.找不到符合的景點
            : COMP_EDITOR_LABELS.沒有可選擇的景點}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {attractions.map(attraction => {
        const isSelected = selectedIds.has(attraction.id)
        const isSuggested = suggestedAttractions.some(s => s.id === attraction.id)
        const isExisting = existingIds.has(attraction.id)

        return (
          <AttractionCard
            key={attraction.id}
            attraction={attraction}
            isSelected={isSelected}
            isSuggested={isSuggested}
            isExisting={isExisting}
            canEditDatabase={canEditDatabase}
            onToggleSelection={onToggleSelection}
            onViewOnMap={onViewOnMap}
            onViewDetail={onViewDetail}
            onEdit={onEdit}
            selectedMapAttractionId={selectedMapAttractionId}
          />
        )
      })}
    </div>
  )
}
