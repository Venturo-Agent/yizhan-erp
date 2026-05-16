'use client'

// ============================================
// Original 風格（莫蘭迪金）
// ============================================

import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { FLIGHT_LABELS } from '../constants/labels'
import { extractCityName, type FlightCardVariantProps } from './flight-card-utils'

export function OriginalFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: FlightCardVariantProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-xl border p-4 ${isMobile ? '' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 標籤 */}
      <div
        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3"
        style={{
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
        }}
      >
        {type === 'outbound' ? FLIGHT_LABELS.去程 : FLIGHT_LABELS.回程}
      </div>

      {/* 航線資訊 */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.departureAirport)}
          </div>
          <div className="text-sm" style={{ color: theme.colors.muted }}>
            {flight.departureTime || '--:--'}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex-1 h-px" style={{ backgroundColor: theme.colors.border }} />
          <Plane className="mx-2" size="1.25em" style={{ color: theme.colors.primary }} />
          <div className="flex-1 h-px" style={{ backgroundColor: theme.colors.border }} />
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.arrivalAirport)}
          </div>
          <div className="text-sm" style={{ color: theme.colors.muted }}>
            {flight.arrivalTime || '--:--'}
          </div>
        </div>
      </div>

      {/* 航班詳情 */}
      <div
        className="mt-4 pt-4 flex justify-between text-sm"
        style={{ borderTop: `1px solid ${theme.colors.border}` }}
      >
        <span style={{ color: theme.colors.muted }}>
          {flight.airline} {flight.flightNumber}
        </span>
        {dateInfo && (
          <span style={{ color: theme.colors.muted }}>
            {dateInfo.short} ({dateInfo.day})
          </span>
        )}
      </div>
    </motion.div>
  )
}
