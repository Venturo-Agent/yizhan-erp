'use client'

import React from 'react'
import Image from 'next/image'
import { ImageIcon, Users, Star } from 'lucide-react'
import type { CombinedRestaurant, MichelinRestaurant } from '../RestaurantSelector'
import { RESTAURANT_LABELS } from './constants/labels'

interface RestaurantCardProps {
  restaurant: CombinedRestaurant
  isSelected: boolean
  onToggle: (id: string) => void
}

// 取得米其林星級顯示
function getMichelinDisplay(restaurant: CombinedRestaurant) {
  if (restaurant.source !== 'michelin') return null
  const michelin = restaurant as MichelinRestaurant

  if (michelin.michelin_stars && michelin.michelin_stars > 0) {
    return (
      <span className="flex items-center gap-0.5 text-status-danger">
        {Array(michelin.michelin_stars)
          .fill(0)
          .map((_, i) => (
            <Star key={i} size="0.625em" fill="currentColor" />
          ))}
      </span>
    )
  }
  if (michelin.bib_gourmand) {
    return (
      <span className="text-xs text-status-warning font-medium">
        {RESTAURANT_LABELS.LABEL_7082}
      </span>
    )
  }
  if (michelin.green_star) {
    return (
      <span className="text-xs text-status-success font-medium">
        {RESTAURANT_LABELS.LABEL_5569}
      </span>
    )
  }
  return <span className="text-xs text-status-danger">{RESTAURANT_LABELS.LABEL_4852}</span>
}

function getRestaurantImage(restaurant: CombinedRestaurant) {
  return restaurant.images && restaurant.images.length > 0 ? restaurant.images[0] : null
}

export function RestaurantCard({ restaurant, isSelected, onToggle }: RestaurantCardProps) {
  const image = getRestaurantImage(restaurant)
  const isMichelin = restaurant.source === 'michelin'

  return (
    <label
      className={`
        relative flex gap-3 p-3 rounded-xl cursor-pointer transition-all
        border-2 hover:shadow-md
        ${
          isSelected
            ? 'border-cat-pink bg-status-danger-bg shadow-sm'
            : isMichelin
              ? 'border-status-danger/30 bg-status-danger-bg hover:bg-status-danger-bg'
              : 'border-transparent bg-morandi-container/20 hover:bg-morandi-container/30'
        }
      `}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(restaurant.id)}
        className="sr-only"
      />

      {/* 縮圖 */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-morandi-container/30">
        {image ? (
          <Image src={image} alt={restaurant.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-morandi-secondary/50">
            <ImageIcon size="1.5em" />
          </div>
        )}
      </div>

      {/* 資訊 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="font-medium text-morandi-primary text-sm leading-tight line-clamp-1 flex items-center gap-1">
          {isMichelin && getMichelinDisplay(restaurant)}
          {restaurant.name}
        </div>
        {restaurant.name_en && (
          <div className="text-xs text-morandi-muted truncate mt-0.5">{restaurant.name_en}</div>
        )}
        <div className="text-xs text-morandi-secondary mt-1 flex items-center gap-1.5 flex-wrap">
          {/* 顯示區域與城市 */}
          {restaurant.region_name && (
            <span className="px-1.5 py-0.5 bg-status-info-bg text-status-info rounded">
              {restaurant.region_name}
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-morandi-container/50 rounded">
            {restaurant.city_name}
          </span>
          {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 && (
            <span className="text-status-danger">{restaurant.cuisine_type[0]}</span>
          )}
        </div>
        <div className="text-xs mt-1 flex items-center gap-2">
          {restaurant.group_friendly && (
            <span className="flex items-center gap-0.5 text-status-info">
              <Users size="0.625em" />
              {RESTAURANT_LABELS.LABEL_441}
            </span>
          )}
          {'private_room' in restaurant && restaurant.private_room && (
            <span className="text-morandi-secondary">{RESTAURANT_LABELS.LABEL_8522}</span>
          )}
          {restaurant.price_range && (
            <span className="text-status-success font-medium">
              {'$'.repeat(parseInt(restaurant.price_range) || 2)}
            </span>
          )}
        </div>
      </div>

      {/* 選中標記 */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-cat-pink rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </label>
  )
}
