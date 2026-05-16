'use client'

// ============================================
// Collage 風格（互動拼貼）
// ============================================

import { motion } from 'framer-motion'
import { extractCityName, type FlightCardVariantProps } from './flight-card-utils'

export function CollageFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: FlightCardVariantProps) {
  const rotation = type === 'outbound' ? -1 : 1

  return (
    <motion.div
      initial={{ opacity: 0, rotate: rotation * 5 }}
      whileInView={{ opacity: 1, rotate: rotation }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      viewport={{ once: true }}
      className={`border-2 ${isMobile ? 'p-4' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderRadius: theme.effects.borderRadius,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 郵票風格標籤 */}
      <div
        className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase mb-3"
        style={{
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
          transform: 'rotate(-3deg)',
        }}
      >
        {type === 'outbound' ? '✈ OUT' : '✈ BACK'}
      </div>

      {/* 航線 */}
      <div className="space-y-2">
        <div
          className="text-2xl font-bold"
          style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
        >
          {extractCityName(flight.departureAirport)}
          <span style={{ color: theme.colors.primary }}> → </span>
          {extractCityName(flight.arrivalAirport)}
        </div>

        <div className="flex gap-4 text-lg" style={{ color: theme.colors.secondary }}>
          <span>{flight.departureTime || '--:--'}</span>
          <span>→</span>
          <span>{flight.arrivalTime || '--:--'}</span>
        </div>
      </div>

      {/* 底部撕紙效果 */}
      <div
        className="mt-4 pt-3 flex justify-between text-sm"
        style={{
          borderTop: `2px dashed ${theme.colors.border}`,
          color: theme.colors.muted,
        }}
      >
        <span>
          {flight.airline} {flight.flightNumber}
        </span>
        {dateInfo && <span>{dateInfo.short}</span>}
      </div>
    </motion.div>
  )
}
