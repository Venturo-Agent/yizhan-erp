'use client'

import React from 'react'
import Image from 'next/image'
import { ImageIcon, Crown, Star } from 'lucide-react'
import type { HotelItem } from '../HotelSelector'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface HotelCardProps {
  hotel: HotelItem
  isSelected: boolean
  onToggle: (id: string) => void
}

// 轉換價格等級顯示
const getPriceDisplay = (priceRange: string | null) => {
  if (!priceRange) return ''
  const level = parseInt(priceRange)
  if (isNaN(level)) return priceRange
  return '$'.repeat(level)
}

// 轉換飯店等級顯示
const getHotelClassLabel = (hotelClass: string | null) => {
  switch (hotelClass) {
    case 'ultra-luxury':
      return COMP_EDITOR_LABELS.頂級奢華
    case 'luxury':
      return COMP_EDITOR_LABELS.奢華
    case 'boutique':
      return COMP_EDITOR_LABELS.精品
    default:
      return hotelClass
  }
}

const getHotelImage = (hotel: HotelItem) => {
  return hotel.images && hotel.images.length > 0 ? hotel.images[0] : null
}

export function HotelCard({ hotel, isSelected, onToggle }: HotelCardProps) {
  const image = getHotelImage(hotel)

  return (
    <label
      className={`
        relative flex gap-3 p-3 rounded-xl cursor-pointer transition-all
        border-2 hover:shadow-md
        ${
          isSelected
            ? 'border-morandi-gold bg-morandi-gold/10 shadow-sm'
            : hotel.is_featured
              ? 'border-morandi-gold/30 bg-morandi-gold/5 hover:bg-morandi-gold/10'
              : 'border-transparent bg-morandi-container/20 hover:bg-morandi-container/30'
        }
      `}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(hotel.id)}
        className="sr-only"
      />

      {/* 縮圖 */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-morandi-container/30">
        {image ? (
          <Image src={image} alt={hotel.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-morandi-secondary/50">
            <ImageIcon size="1.5em" />
          </div>
        )}
      </div>

      {/* 資訊 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="font-medium text-morandi-primary text-sm leading-tight line-clamp-1 flex items-center gap-1">
          {hotel.is_featured && <Crown size="0.75em" className="text-morandi-gold flex-shrink-0" />}
          {hotel.name}
        </div>
        {hotel.name_en && (
          <div className="text-xs text-morandi-muted truncate mt-0.5">{hotel.name_en}</div>
        )}
        <div className="text-xs text-morandi-secondary mt-1 flex items-center gap-1.5 flex-wrap">
          {/* 顯示區域與城市 */}
          {hotel.region_name && (
            <span className="px-1.5 py-0.5 bg-status-info-bg text-status-info rounded">
              {hotel.region_name}
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-morandi-container/50 rounded">{hotel.city_name}</span>
          {hotel.brand && <span className="text-morandi-gold font-medium">{hotel.brand}</span>}
        </div>
        <div className="text-xs mt-1 flex items-center gap-2">
          {hotel.star_rating && (
            <span className="flex items-center gap-0.5 text-morandi-gold">
              <Star size="0.625em" fill="currentColor" />
              {hotel.star_rating}
            </span>
          )}
          {hotel.hotel_class && (
            <span className="text-morandi-secondary">{getHotelClassLabel(hotel.hotel_class)}</span>
          )}
          {hotel.price_range && (
            <span className="text-status-success font-medium">
              {getPriceDisplay(hotel.price_range)}
            </span>
          )}
        </div>
      </div>

      {/* 選中標記 */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-morandi-gold rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </label>
  )
}
