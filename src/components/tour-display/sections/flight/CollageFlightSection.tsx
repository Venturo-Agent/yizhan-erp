'use client'

/**
 * Collage 風格航班區塊 - 登機證造型
 *
 * 特色：
 * - 登機證卡片設計
 * - 膠帶裝飾
 * - Pop Art 配色
 * - Permanent Marker 手寫字體
 * - 飛機動畫
 * - 網點背景
 */

import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import type { FlightInfo } from '@/types/flight.types'
import { formatDateShort } from '@/lib/utils/format-date'

// Collage 配色 (Pop Art)
const POP = {
  pink: '#FF0080',
  yellow: '#FFEB3B',
  blue: '#00E5FF',
  purple: '#D500F9',
  lime: '#C6FF00',
  paper: '#fdfbf7',
  dark: '#121212',
}

interface CollageFlightSectionProps {
  outboundFlight?: FlightInfo | null
  returnFlight?: FlightInfo | null
  departureDate?: string | null
  viewMode: 'desktop' | 'mobile'
}

// 登機證卡片
function BoardingPassCard({
  flight,
  type,
  departureDate,
  isMobile,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  departureDate?: string | null
  isMobile: boolean
}) {
  const isOutbound = type === 'outbound'
  const dateDisplay = formatDateShort(flight.departureDate || departureDate)
  const fromAirport = flight.departureAirport || (isOutbound ? 'TPE' : '---')
  const toAirport = flight.arrivalAirport || '---'
  const flightInfo = [flight.airline, flight.flightNumber].filter(Boolean).join(' ') || 'FLIGHT'
  const accentColor = isOutbound ? POP.pink : POP.blue

  return (
    <motion.div
      className="relative bg-card border-2 border-[var(--morandi-primary)] overflow-hidden"
      style={{
        boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
        transform: isOutbound ? 'rotate(-1deg)' : 'rotate(1deg)',
        fontFamily: "'Space Mono', monospace",
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: isOutbound ? 0 : 0.2 }}
      whileHover={{ rotate: 0 }}
    >
      {/* 膠帶裝飾 */}
      <div
        className="absolute -top-2 left-8 w-24 h-6 z-20"
        style={{
          backgroundColor: 'rgba(255, 235, 59, 0.6)',
          transform: 'rotate(-3deg)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      />

      {/* 頂部標題列 */}
      <div
        className="relative z-10 px-4 py-2 border-b-2 border-[var(--morandi-primary)] flex items-center justify-between"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm tracking-wider">BOARDING PASS</span>
        </div>
        <span className="text-white text-xs">{isOutbound ? 'OUTBOUND' : 'RETURN'}</span>
      </div>

      {/* 主體內容 */}
      <div className={`relative z-10 ${isMobile ? 'p-4' : 'p-6'}`}>
        {/* 航班資訊 */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-dashed border-[var(--morandi-primary)]/20">
          <div>
            <div className="text-xs text-morandi-secondary uppercase tracking-widest">Flight</div>
            <div className="text-lg font-bold">{flightInfo}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-morandi-secondary uppercase tracking-widest">Date</div>
            <div className="text-lg font-bold">{dateDisplay || '--'}</div>
          </div>
        </div>

        {/* 航線 */}
        <div className="flex items-center justify-between">
          {/* 出發 */}
          <div className="text-center">
            <div
              className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black mb-1`}
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              {fromAirport}
            </div>
            <div className="text-sm font-bold" style={{ color: accentColor }}>
              {flight.departureTime || '--:--'}
            </div>
          </div>

          {/* 飛行箭頭 */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="flex-1 border-t-2 border-dashed border-[var(--morandi-primary)]/30" />
            <motion.div
              className="mx-2 w-10 h-10 rounded-full flex items-center justify-center border-2 border-[var(--morandi-primary)]"
              style={{ backgroundColor: POP.yellow }}
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Plane className="w-5 h-5 text-black" />
            </motion.div>
            <div className="flex-1 border-t-2 border-dashed border-[var(--morandi-primary)]/30" />
          </div>

          {/* 抵達 */}
          <div className="text-center">
            <div
              className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black mb-1`}
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              {toAirport}
            </div>
            <div className="text-sm font-bold text-morandi-primary">
              {flight.arrivalTime || '--:--'}
            </div>
          </div>
        </div>

        {/* 底部資訊 */}
        {flight.duration && (
          <div className="mt-4 pt-4 border-t-2 border-dashed border-[var(--morandi-primary)]/20 text-center">
            <span
              className="inline-block px-3 py-1 text-xs font-bold border-2 border-[var(--morandi-primary)]"
              style={{ backgroundColor: POP.lime }}
            >
              {flight.duration}
            </span>
          </div>
        )}
      </div>

      {/* 右側撕票區 */}
      <div className="absolute top-0 right-0 w-12 h-full border-l-2 border-dashed border-[var(--morandi-primary)]/30 flex flex-col items-center justify-center bg-muted">
        <div
          className="text-xs font-bold uppercase tracking-widest"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {toAirport}
        </div>
      </div>
    </motion.div>
  )
}

export function CollageFlightSection({
  outboundFlight,
  returnFlight,
  departureDate,
  viewMode,
}: CollageFlightSectionProps) {
  const isMobile = viewMode === 'mobile'

  if (!outboundFlight && !returnFlight) return null

  return (
    <section
      id="flight"
      className="relative py-16 overflow-hidden"
      style={{ backgroundColor: POP.paper, fontFamily: "'Space Mono', monospace" }}
    >
      {/* 網點背景 */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ddd 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* 裝飾色塊 */}
      <motion.div
        className="absolute rounded-full mix-blend-multiply filter blur-xl opacity-50"
        style={{
          top: '20%',
          left: isMobile ? '-10%' : '5%',
          width: isMobile ? '8rem' : '12rem',
          height: isMobile ? '8rem' : '12rem',
          backgroundColor: POP.blue,
        }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full mix-blend-multiply filter blur-xl opacity-50"
        style={{
          bottom: '10%',
          right: isMobile ? '-10%' : '5%',
          width: isMobile ? '6rem' : '10rem',
          height: isMobile ? '6rem' : '10rem',
          backgroundColor: POP.pink,
        }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <div className={`relative z-10 ${isMobile ? 'px-4' : 'max-w-5xl mx-auto px-6'}`}>
        {/* 標題 */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="inline-block px-4 py-2 border-2 border-[var(--morandi-primary)] mb-4"
            style={{
              backgroundColor: POP.yellow,
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
              transform: 'rotate(-2deg)',
            }}
          >
            <span className="text-sm font-bold uppercase tracking-widest">Flight Info</span>
          </div>
          <h2
            className={isMobile ? 'text-3xl' : 'text-5xl'}
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            YOUR TICKETS
          </h2>
        </motion.div>

        {/* 航班卡片 */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-8' : 'grid-cols-2 gap-8'}`}>
          {outboundFlight && (
            <BoardingPassCard
              flight={outboundFlight}
              type="outbound"
              departureDate={departureDate}
              isMobile={isMobile}
            />
          )}
          {returnFlight && (
            <BoardingPassCard flight={returnFlight} type="return" isMobile={isMobile} />
          )}
        </div>

        {/* 底部裝飾貼紙 */}
        <motion.div
          className="flex justify-center mt-8 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <span
            className="px-3 py-1 text-xs font-bold border-2 border-[var(--morandi-primary)]"
            style={{ backgroundColor: POP.pink, color: 'white', transform: 'rotate(-3deg)' }}
          >
            BON VOYAGE
          </span>
          <span
            className="px-3 py-1 text-xs font-bold border-2 border-[var(--morandi-primary)]"
            style={{ backgroundColor: POP.blue, color: 'white', transform: 'rotate(2deg)' }}
          >
            HAVE FUN
          </span>
        </motion.div>
      </div>

      {/* 載入 Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Space+Mono:wght@400;700&display=swap');
      `}</style>
    </section>
  )
}
