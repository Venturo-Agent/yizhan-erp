'use client'

import React from 'react'
import { Tour } from '@/stores/types'
import { cn } from '@/lib/utils'
import { MapPin, Calendar, Users, DollarSign, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { CurrencyCell } from '@/components/table-cells'
import { TOUR_MOBILE_CARD } from '../_constants'
import { TOUR_STATUS, getTourStatusLabel } from '@/lib/constants/status-maps'

interface TourMobileCardProps {
  tour: Tour
  onClick: () => void
  getStatusColor: (status: string) => string
}

export function TourMobileCard({ tour: tourProp, onClick, getStatusColor }: TourMobileCardProps) {
  const tour = tourProp as Tour & Record<string, unknown>

  // 原始 DB 值（英文、用於 getStatusColor 查色）
  const statusValue = String(tour.status || TOUR_STATUS.PROPOSAL)
  // UI 顯示用中文
  const statusLabel = getTourStatusLabel(statusValue)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-xl p-4 shadow-sm',
        'active:scale-[0.98] transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-morandi-gold/30'
      )}
    >
      {/* 標題列 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-morandi-primary text-base truncate mb-1">
            {tour.code || TOUR_MOBILE_CARD.unnamed_tour}
          </h3>
          <p className="text-sm text-morandi-secondary truncate">
            {tour.name || TOUR_MOBILE_CARD.no_name}
          </p>
        </div>
        <ChevronRight size={20} className="text-morandi-secondary flex-shrink-0 ml-2" />
      </div>

      {/* 狀態標籤 */}
      <div className="mb-3">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            getStatusColor(statusValue) as string
          )}
        >
          {statusLabel}
        </span>
      </div>

      {/* 資訊網格 */}
      <div className="space-y-2">
        {/* 目的地 */}
        {'destination' in tour && Boolean(tour.destination) && (
          <div className="flex items-center text-sm">
            <MapPin size={16} className="text-morandi-secondary mr-2 flex-shrink-0" />
            <span className="text-morandi-primary truncate">{String(tour.destination)}</span>
          </div>
        )}

        {/* 出發日期 */}
        {tour.departure_date && (
          <div className="flex items-center text-sm">
            <Calendar size={16} className="text-morandi-secondary mr-2 flex-shrink-0" />
            <span className="text-morandi-primary">
              {format(new Date(tour.departure_date), 'yyyy/MM/dd', { locale: zhTW })}
              {tour.return_date && (
                <span className="text-morandi-secondary">
                  {' '}
                  - {format(new Date(tour.return_date), 'MM/dd', { locale: zhTW })}
                </span>
              )}
            </span>
          </div>
        )}

        {/* 人數 */}
        <div className="flex items-center text-sm">
          <Users size={16} className="text-morandi-secondary mr-2 flex-shrink-0" />
          <span className="text-morandi-primary">
            {'member_count' in tour && typeof tour.member_count === 'number'
              ? tour.member_count
              : 0}{' '}
            {TOUR_MOBILE_CARD.person_unit}
            {tour.max_participants ? (
              <span className="text-morandi-secondary"> / {tour.max_participants}</span>
            ) : null}
          </span>
        </div>

        {/* 價格（如果有） */}
        {'price_per_person' in tour && typeof tour.price_per_person === 'number' ? (
          <div className="flex items-center text-sm">
            <DollarSign size={16} className="text-morandi-secondary mr-2 flex-shrink-0" />
            <CurrencyCell
              amount={tour.price_per_person}
              className="text-morandi-primary font-medium"
            />
            <span className="text-morandi-secondary text-xs ml-1">
              {TOUR_MOBILE_CARD.per_person}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
