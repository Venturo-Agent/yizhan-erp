'use client'

import { Star } from 'lucide-react'
import { LUXURY } from '../utils/itineraryLuxuryUtils'
import { TOURS_LABELS } from '../constants/labels'

interface Meals {
  breakfast?: string
  lunch?: string
  dinner?: string
}

interface DayCardSidebarProps {
  meals?: Meals
  accommodation?: string
  accommodationRating?: number
  isSameAccommodation?: boolean
  isAlternative?: boolean
  isLastDay: boolean
  dayColor: string
  isMobile: boolean
}

export function DayCardSidebar({
  meals,
  accommodation,
  accommodationRating,
  isSameAccommodation,
  isLastDay,
  dayColor,
  isMobile,
}: DayCardSidebarProps) {
  return (
    <div
      className={`${isMobile ? 'p-6' : 'lg:col-span-3 p-8'} flex flex-col justify-center space-y-8`}
      style={{ backgroundColor: '#f9fafb' }}
    >
      {/* 餐食 */}
      <div className="relative pl-6 border-l" style={{ borderColor: '#E5E7EB' }}>
        <span
          className="absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: LUXURY.secondary }}
        />
        <h5
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: LUXURY.muted }}
        >
          Dining
        </h5>
        <div className="space-y-2">
          {meals?.breakfast && (
            <div className="flex justify-between text-sm">
              <span style={{ color: LUXURY.muted }}>Breakfast</span>
              <span className="font-medium" style={{ color: dayColor }}>
                {meals.breakfast}
              </span>
            </div>
          )}
          {meals?.lunch && (
            <div className="flex justify-between text-sm">
              <span style={{ color: LUXURY.muted }}>Lunch</span>
              <span className="font-medium" style={{ color: dayColor }}>
                {meals.lunch}
              </span>
            </div>
          )}
          {meals?.dinner && (
            <div className="flex justify-between text-sm">
              <span style={{ color: LUXURY.muted }}>Dinner</span>
              <span className="font-medium" style={{ color: dayColor }}>
                {meals.dinner}
              </span>
            </div>
          )}
          {!meals?.breakfast && !meals?.lunch && !meals?.dinner && (
            <div className="text-sm" style={{ color: LUXURY.muted }}>
              {TOURS_LABELS.LABEL_6561}
            </div>
          )}
        </div>
      </div>

      {/* 住宿 - 最後一天（包含替代行程）不顯示 */}
      {!isLastDay && (
        <div className="relative pl-6 border-l" style={{ borderColor: '#E5E7EB' }}>
          <span
            className="absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: LUXURY.primary }}
          />
          <h5
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: LUXURY.muted }}
          >
            Stay
          </h5>
          {accommodation ? (
            <div
              className="bg-card p-4 shadow-sm rounded-md border"
              style={{ borderColor: '#f0f0f0' }}
            >
              {/* 續住標示 */}
              {isSameAccommodation && (
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded border-2 flex items-center justify-center"
                    style={{
                      borderColor: LUXURY.secondary,
                      backgroundColor: `${LUXURY.secondary}15`,
                    }}
                  >
                    <svg
                      className="w-3 h-3"
                      style={{ color: LUXURY.secondary }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-xs" style={{ color: LUXURY.secondary }}>
                    {TOURS_LABELS.LABEL_3005}
                  </span>
                </div>
              )}
              <div
                className="font-bold text-lg mb-1"
                style={{
                  fontFamily: LUXURY.font.serif,
                  color: LUXURY.text,
                }}
              >
                {accommodation}
              </div>
              {/* 星級 */}
              {accommodationRating != null && accommodationRating > 0 && (
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].slice(0, accommodationRating).map(i => (
                    <Star
                      key={i}
                      className="w-3 h-3 fill-current"
                      style={{ color: LUXURY.secondary }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm" style={{ color: LUXURY.muted }}>
              {TOURS_LABELS.CONFIRM_7150}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
