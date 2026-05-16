'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { RestaurantCard } from './RestaurantCard'
import type { CombinedRestaurant } from '../RestaurantSelector'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface RestaurantListProps {
  restaurants: CombinedRestaurant[]
  loading: boolean
  selectedIds: Set<string>
  selectedCountryId: string
  searchQuery: string
  onToggle: (id: string) => void
}

export function RestaurantList({
  restaurants,
  loading,
  selectedIds,
  selectedCountryId,
  searchQuery,
  onToggle,
}: RestaurantListProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-morandi-secondary">
        <Loader2 className="animate-spin mr-2" size="1.25em" />
        {COMP_EDITOR_LABELS.載入中}
      </div>
    )
  }

  if (restaurants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-morandi-secondary">
        {!selectedCountryId
          ? COMP_EDITOR_LABELS.請先選擇國家
          : searchQuery
            ? COMP_EDITOR_LABELS.找不到符合的餐廳
            : COMP_EDITOR_LABELS.沒有可選擇的餐廳}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {restaurants.map(restaurant => (
        <RestaurantCard
          key={`${restaurant.source}-${restaurant.id}`}
          restaurant={restaurant}
          isSelected={selectedIds.has(restaurant.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
