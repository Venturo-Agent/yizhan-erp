'use client'

// ============================================
// Nature 風格（中國風書法）
// ============================================

import { motion } from 'framer-motion'
import { FLIGHT_LABELS } from '../constants/labels'
import { extractCityName, type FlightCardVariantProps } from './flight-card-utils'

export function NatureFlightCard({
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
      className={`rounded-lg border ${isMobile ? 'p-4' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
        backgroundImage: 'url(/images/paper-texture.png)',
        backgroundBlendMode: 'multiply',
      }}
    >
      {/* 紅色印章風格標籤 */}
      <div
        className="inline-block px-4 py-1 text-sm font-bold mb-4"
        style={{
          backgroundColor: '#C41E3A',
          color: '#FFFFFF',
          fontFamily: theme.fonts.heading,
        }}
      >
        {type === 'outbound' ? FLIGHT_LABELS.去程 : FLIGHT_LABELS.回程}
      </div>

      {/* 書法風格航線 */}
      <div className="text-center mb-4">
        <div
          className="text-4xl mb-2"
          style={{
            color: theme.colors.text,
            fontFamily: theme.fonts.heading,
          }}
        >
          {extractCityName(flight.departureAirport)}
          <span className="mx-4" style={{ color: theme.colors.primary }}>
            ⟶
          </span>
          {extractCityName(flight.arrivalAirport)}
        </div>
      </div>

      {/* 時間 */}
      <div className="flex justify-center gap-8 text-xl" style={{ color: theme.colors.secondary }}>
        <span>{flight.departureTime || '--:--'}</span>
        <span>—</span>
        <span>{flight.arrivalTime || '--:--'}</span>
      </div>

      {/* 底部 */}
      <div
        className="mt-4 pt-4 text-center text-sm"
        style={{
          borderTop: `1px solid ${theme.colors.border}`,
          color: theme.colors.muted,
        }}
      >
        {flight.airline} {flight.flightNumber}
        {dateInfo && ` · ${dateInfo.short}`}
      </div>
    </motion.div>
  )
}
