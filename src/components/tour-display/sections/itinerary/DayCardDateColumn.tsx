'use client'

import { LUXURY } from '../utils/itineraryLuxuryUtils'
import { TOURS_LABELS } from '../constants/labels'

interface DayCardDateColumnProps {
  dayNumber: string
  dateDisplay: string | null
  locationLabel?: string
  city?: string
  isAlternative?: boolean
  dayColor: string
  isMobile: boolean
}

export function DayCardDateColumn({
  dayNumber,
  dateDisplay,
  locationLabel,
  city,
  isAlternative,
  dayColor,
  isMobile,
}: DayCardDateColumnProps) {
  return (
    <div
      className={`${isMobile ? 'p-4' : 'lg:col-span-2 p-8'} text-white ${isMobile ? 'flex flex-row items-center justify-between' : 'flex flex-col justify-between items-start'} relative overflow-hidden`}
      style={{ backgroundColor: dayColor }}
    >
      {/* 大數字背景 - 手機版隱藏 */}
      {!isMobile && (
        <div
          className="absolute -right-4 top-1/2 -translate-y-1/2 text-9xl font-bold select-none"
          style={{
            fontFamily: LUXURY.font.serif,
            color: 'rgba(255,255,255,0.05)',
          }}
        >
          {dayNumber.padStart(2, '0')}
        </div>
      )}

      <div className={isMobile ? 'flex items-center gap-3' : ''}>
        {/* 日期標籤 - DEC 25 格式 */}
        {dateDisplay ? (
          <span
            className={`inline-block px-3 py-1.5 bg-card/10 backdrop-blur-sm rounded text-xs font-medium tracking-widest ${isMobile ? '' : 'mb-3'}`}
          >
            {dateDisplay}
          </span>
        ) : null}
        <h3
          className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-medium whitespace-nowrap`}
          style={{ fontFamily: LUXURY.font.serif }}
        >
          Day {dayNumber}
        </h3>
      </div>

      <div className={`${isMobile ? 'text-right' : 'space-y-1'} z-10`}>
        <div className={`text-xs uppercase tracking-widest opacity-70 ${isMobile ? 'hidden' : ''}`}>
          {isAlternative ? '建議行程' : '地點'}
        </div>
        <div
          className={`font-medium ${isMobile ? 'text-base' : 'text-lg'}`}
          style={{ color: isAlternative ? '#fff' : LUXURY.secondary }}
        >
          {locationLabel || city || TOURS_LABELS.EXPLORE}
        </div>
      </div>
    </div>
  )
}
