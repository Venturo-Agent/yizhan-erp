'use client'

// ============================================
// Dreamscape 風格（漸層夢幻）
// ============================================

import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { extractCityName, type FlightCardVariantProps } from './flight-card-utils'

export function DreamscapeFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: FlightCardVariantProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`rounded-2xl backdrop-blur-md ${isMobile ? 'p-4' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 標籤 */}
      <div className="flex justify-between items-center mb-4">
        <span
          className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
            color: '#FFFFFF',
          }}
        >
          {type === 'outbound' ? '✈ Departure' : '✈ Return'}
        </span>
        {dateInfo && (
          <span className="text-sm" style={{ color: theme.colors.muted }}>
            {dateInfo.full}
          </span>
        )}
      </div>

      {/* 航線 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.departureAirport)}
          </div>
          <div className="text-xl" style={{ color: theme.colors.primary }}>
            {flight.departureTime || '--:--'}
          </div>
        </div>

        <div className="flex-1 mx-4 relative">
          <div
            className="h-0.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent})`,
            }}
          />
          <Plane
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            size="1.25em"
            style={{ color: theme.colors.accent }}
          />
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.arrivalAirport)}
          </div>
          <div className="text-xl" style={{ color: theme.colors.primary }}>
            {flight.arrivalTime || '--:--'}
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div
        className="mt-4 pt-4 flex justify-between text-sm"
        style={{ borderTop: `1px solid ${theme.colors.border}` }}
      >
        <span style={{ color: theme.colors.muted }}>
          {flight.airline} {flight.flightNumber}
        </span>
        {flight.duration && (
          <span style={{ color: theme.colors.secondary }}>{flight.duration}</span>
        )}
      </div>
    </motion.div>
  )
}
