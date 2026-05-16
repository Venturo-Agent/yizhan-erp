'use client'

// ============================================
// Art 風格（Brutalist）
// ============================================

import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { type FlightCardVariantProps } from './flight-card-utils'

export function ArtFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: FlightCardVariantProps) {
  // 取得機場代碼（用於浮水印）
  const airportCode =
    flight.departureAirport?.match(/\(([A-Z]{3})\)/)?.[1] ||
    flight.departureAirport?.slice(0, 3).toUpperCase() ||
    'TPE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative border-2 group cursor-pointer transition-all duration-300 ${
        isMobile ? 'p-6' : 'p-8'
      }`}
      style={{
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.background,
        boxShadow: theme.effects.shadow,
      }}
      whileHover={{
        backgroundColor: theme.colors.primary,
      }}
    >
      {/* 類型標籤 - 角落 */}
      <span
        className="absolute top-4 left-4 text-[0.625rem] tracking-[0.3em] uppercase transition-colors duration-300 group-hover:text-white"
        style={{
          fontFamily: "'Cinzel', serif",
          color: theme.colors.primary,
        }}
      >
        {type === 'outbound' ? 'OUTBOUND' : 'INBOUND'}
      </span>

      {/* 大型機場代碼浮水印 */}
      <div
        className="absolute top-0 right-0 text-[7.5rem] leading-none font-black opacity-5 pointer-events-none select-none transition-opacity duration-300 group-hover:opacity-10"
        style={{
          fontFamily: "'Cinzel', serif",
        }}
      >
        {airportCode}
      </div>

      {/* 主要內容 */}
      <div className={`relative z-10 ${isMobile ? 'mt-8' : 'mt-12'}`}>
        {/* 航線 */}
        <div className="flex items-center justify-between">
          {/* 出發 */}
          <div>
            <div
              className={`font-black tracking-tighter transition-colors duration-300 group-hover:text-white ${
                isMobile ? 'text-4xl' : 'text-6xl'
              }`}
              style={{
                fontFamily: "'Cinzel', serif",
                color: theme.colors.primary,
              }}
            >
              {airportCode}
            </div>
            <div
              className="text-sm mt-2 transition-colors duration-300 group-hover:text-morandi-secondary"
              style={{
                fontFamily: 'monospace',
                color: theme.colors.muted,
              }}
            >
              {flight.departureTime || '--:--'}
            </div>
          </div>

          {/* 中間箭頭 */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div
              className="w-full h-[2px] relative transition-colors duration-300 group-hover:bg-card"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Plane
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-colors duration-300 group-hover:text-white"
                size={isMobile ? 16 : 20}
                style={{ color: theme.colors.primary }}
              />
            </div>
          </div>

          {/* 抵達 */}
          <div className="text-right">
            <div
              className={`font-black tracking-tighter transition-colors duration-300 group-hover:text-white ${
                isMobile ? 'text-4xl' : 'text-6xl'
              }`}
              style={{
                fontFamily: "'Cinzel', serif",
                color: theme.colors.primary,
              }}
            >
              {flight.arrivalAirport?.match(/\(([A-Z]{3})\)/)?.[1] ||
                flight.arrivalAirport?.slice(0, 3).toUpperCase() ||
                'NRT'}
            </div>
            <div
              className="text-sm mt-2 transition-colors duration-300 group-hover:text-morandi-secondary"
              style={{
                fontFamily: 'monospace',
                color: theme.colors.muted,
              }}
            >
              {flight.arrivalTime || '--:--'}
            </div>
          </div>
        </div>

        {/* 底部資訊 */}
        <div
          className={`flex justify-between items-center transition-colors duration-300 ${
            isMobile ? 'mt-6 pt-4' : 'mt-8 pt-6'
          }`}
          style={{ borderTop: `2px solid ${theme.colors.primary}` }}
        >
          <span
            className="text-xs tracking-wider transition-colors duration-300 group-hover:text-white"
            style={{
              fontFamily: 'monospace',
              color: theme.colors.muted,
            }}
          >
            {flight.airline} {flight.flightNumber}
          </span>
          {dateInfo && (
            <span
              className="text-xs transition-colors duration-300 group-hover:text-white"
              style={{
                fontFamily: "'Cinzel', serif",
                color: theme.colors.secondary,
              }}
            >
              {dateInfo.full}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
