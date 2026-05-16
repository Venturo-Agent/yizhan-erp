'use client'

// ============================================
// Luxury 風格（深綠金棕）
// ============================================

import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { extractCityName, type FlightCardVariantProps } from './flight-card-utils'

export function LuxuryFlightCard({
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
      className={`rounded-2xl border overflow-hidden ${isMobile ? '' : ''}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 頂部強調條 */}
      <div className="h-1" style={{ backgroundColor: theme.colors.primary }} />

      <div className={isMobile ? 'p-4' : 'p-6'}>
        {/* 標題行 */}
        <div className="flex justify-between items-center mb-4">
          <span
            className="text-sm font-medium tracking-wider uppercase"
            style={{ color: theme.colors.secondary }}
          >
            {type === 'outbound' ? 'Departure' : 'Return'}
          </span>
          {dateInfo && (
            <span className="text-sm" style={{ color: theme.colors.muted }}>
              {dateInfo.full}
            </span>
          )}
        </div>

        {/* 航線 */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div
              className="text-3xl font-light"
              style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
            >
              {extractCityName(flight.departureAirport)}
            </div>
            <div className="text-lg" style={{ color: theme.colors.primary }}>
              {flight.departureTime || '--:--'}
            </div>
          </div>

          <div className="px-4">
            <Plane size="1.5em" style={{ color: theme.colors.secondary }} />
          </div>

          <div className="flex-1 text-right">
            <div
              className="text-3xl font-light"
              style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
            >
              {extractCityName(flight.arrivalAirport)}
            </div>
            <div className="text-lg" style={{ color: theme.colors.primary }}>
              {flight.arrivalTime || '--:--'}
            </div>
          </div>
        </div>

        {/* 底部資訊 */}
        <div
          className="mt-4 pt-4 flex justify-between items-center text-sm"
          style={{ borderTop: `1px solid ${theme.colors.border}` }}
        >
          <span style={{ color: theme.colors.muted }}>
            {flight.airline} · {flight.flightNumber}
          </span>
          {flight.duration && (
            <span style={{ color: theme.colors.secondary }}>{flight.duration}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
