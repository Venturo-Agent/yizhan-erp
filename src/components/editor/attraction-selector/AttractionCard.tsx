'use client'

import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ImageIcon, Map, Sparkles, Edit } from 'lucide-react'

const COMPONENT_LABELS = {
  EDIT_ATTRACTION: '編輯景點',
} as const
import { Attraction } from '@/app/(main)/library/attractions/_types'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface AttractionWithCity extends Attraction {
  city_name?: string
  region_name?: string
}

interface AttractionCardProps {
  attraction: AttractionWithCity
  isSelected: boolean
  isSuggested: boolean
  isExisting: boolean
  canEditDatabase?: boolean // 是否有編輯資料庫權限
  onToggleSelection: (id: string) => void
  onViewOnMap?: (attraction: AttractionWithCity) => void
  onViewDetail?: (attraction: AttractionWithCity) => void
  onEdit?: (attraction: AttractionWithCity) => void
  selectedMapAttractionId?: string
}

export function AttractionCard({
  attraction,
  isSelected,
  isSuggested,
  isExisting,
  canEditDatabase,
  onToggleSelection,
  onViewOnMap,
  onViewDetail,
  onEdit,
  selectedMapAttractionId,
}: AttractionCardProps) {
  const image = attraction.images && attraction.images.length > 0 ? attraction.images[0] : null
  const hasCoordinates = attraction.latitude && attraction.longitude

  return (
    <div
      className={`
        relative flex gap-3 p-2.5 rounded-xl transition-all
        border hover:shadow-sm
        ${
          isExisting
            ? 'border-border bg-muted opacity-60'
            : isSelected
              ? 'border-morandi-gold bg-morandi-gold/5'
              : isSuggested
                ? 'border-morandi-gold/30 bg-morandi-gold/10'
                : 'border-transparent bg-morandi-container/20 hover:bg-morandi-container/30'
        }
      `}
    >
      {/* 勾選框 */}
      <label
        className={`flex items-center ${isExisting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="checkbox"
          checked={isSelected || isExisting}
          onChange={() => !isExisting && onToggleSelection(attraction.id)}
          disabled={isExisting}
          className={`w-4 h-4 rounded border-border focus:ring-morandi-gold ${isExisting ? 'text-morandi-secondary' : 'text-morandi-gold'}`}
        />
      </label>

      {/* 縮圖（點擊查看詳情） */}
      <div
        className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-morandi-container/30 cursor-pointer hover:ring-2 hover:ring-morandi-gold/50 transition-all"
        onClick={() => onViewDetail?.(attraction)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onViewDetail?.(attraction)}
      >
        {image ? (
          <Image src={image} alt={attraction.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-morandi-secondary/50">
            <ImageIcon size="1.25em" />
          </div>
        )}
      </div>

      {/* 資訊 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="font-medium text-morandi-primary text-sm leading-tight line-clamp-1 flex items-center gap-1">
          {isSuggested && <Sparkles size="0.75em" className="text-morandi-gold flex-shrink-0" />}
          {attraction.name}
          {isExisting && (
            <span className="ml-1 px-1.5 py-0.5 text-[0.625rem] bg-morandi-container text-morandi-secondary rounded">
              {COMP_EDITOR_LABELS.LABEL_4095}
            </span>
          )}
        </div>
        <div className="text-xs text-morandi-secondary mt-0.5 flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-morandi-container/50 rounded">
            {attraction.city_name}
          </span>
          {attraction.category && (
            <span className="text-morandi-secondary/70">{attraction.category}</span>
          )}
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-1">
        {/* 編輯按鈕（需要資料庫編輯權限） */}
        {canEditDatabase && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(attraction)}
            className="h-8 px-2 rounded-lg hover:bg-morandi-gold/10 hover:text-morandi-gold"
            title={COMPONENT_LABELS.EDIT_ATTRACTION}
          >
            <Edit size="1em" />
          </Button>
        )}

        {/* 查看地圖按鈕 */}
        {hasCoordinates && onViewOnMap && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewOnMap(attraction)}
            className={`h-8 px-2 rounded-lg ${selectedMapAttractionId === attraction.id ? 'bg-status-info-bg text-status-info' : ''}`}
            title={COMP_EDITOR_LABELS.查看附近景點}
          >
            <Map size="1em" />
          </Button>
        )}
      </div>
    </div>
  )
}
