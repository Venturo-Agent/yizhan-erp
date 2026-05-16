'use client'

/**
 * Luxury 風格航班區塊 - 表格式布局
 *
 * 特色：
 * - 左側強調線
 * - "Your Journey Begins" 斜體標題
 * - 表格式航班資訊
 * - 底部提示文字
 */

import { motion } from 'framer-motion'
import { getTheme } from '@/app/(main)/tours/_themes'
import type { FlightInfo } from '@/types/flight.types'
import { FLIGHT_LABELS } from './constants/labels'

interface LuxuryFlightSectionProps {
  outboundFlight?: FlightInfo | null
  returnFlight?: FlightInfo | null
  viewMode: 'desktop' | 'mobile'
}

// 格式化日期（支援 MM/DD、MM/DD/YYYY、YYYY-MM-DD 格式）
function formatFlightDate(dateStr: string | undefined | null): { date: string; day: string } {
  if (!dateStr) return { date: '--', day: '--' }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  try {
    // 嘗試 MM/DD 格式（如 "04/06"）
    const mmddMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (mmddMatch) {
      const month = parseInt(mmddMatch[1], 10)
      const dayOfMonth = parseInt(mmddMatch[2], 10)
      if (month >= 1 && month <= 12 && dayOfMonth >= 1 && dayOfMonth <= 31) {
        return {
          date: `${month}.${dayOfMonth.toString().padStart(2, '0')}`,
          day: '--', // 沒有年份無法計算星期幾
        }
      }
    }

    // 嘗試 MM/DD/YYYY 格式
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyyMatch) {
      const month = parseInt(mmddyyyyMatch[1], 10) - 1
      const dayOfMonth = parseInt(mmddyyyyMatch[2], 10)
      const year = parseInt(mmddyyyyMatch[3], 10)
      const date = new Date(year, month, dayOfMonth)
      if (!isNaN(date.getTime())) {
        return {
          date: `${month + 1}.${dayOfMonth.toString().padStart(2, '0')}`,
          day: days[date.getDay()],
        }
      }
    }

    // 嘗試 ISO 格式（YYYY-MM-DD）
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      const month = date.getMonth()
      const dayOfMonth = date.getDate()
      const year = date.getFullYear()
      if (year >= 2020 && year <= 2100) {
        return {
          date: `${month + 1}.${dayOfMonth.toString().padStart(2, '0')}`,
          day: days[date.getDay()],
        }
      }
    }

    return { date: '--', day: '--' }
  } catch {
    return { date: '--', day: '--' }
  }
}

export function LuxuryFlightSection({
  outboundFlight,
  returnFlight,
  viewMode,
}: LuxuryFlightSectionProps) {
  const theme = getTheme('luxury')
  const isMobile = viewMode === 'mobile'
  const hasFlightInfo = outboundFlight || returnFlight

  if (!hasFlightInfo) return null

  // 手機版：卡片式佈局
  if (isMobile) {
    return (
      <section id="flight" className="py-6" style={{ backgroundColor: theme.colors.background }}>
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-xl shadow-md border overflow-hidden relative"
            style={{ borderColor: '#f0f0f0' }}
          >
            {/* 左側強調線 */}
            <div
              className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl"
              style={{ backgroundColor: theme.colors.primary }}
            />

            {/* 標題 */}
            <div className="pl-5 pr-4 py-3 border-b" style={{ borderColor: '#f0f0f0' }}>
              <h2 className="text-base font-bold" style={{ color: theme.colors.text }}>
                {FLIGHT_LABELS.LABEL_1343}
              </h2>
            </div>

            {/* 航班卡片 */}
            <div className="divide-y" style={{ borderColor: '#f0f0f0' }}>
              {outboundFlight && (
                <MobileFlightCard flight={outboundFlight} type="outbound" theme={theme} />
              )}
              {returnFlight && (
                <MobileFlightCard flight={returnFlight} type="return" theme={theme} />
              )}
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  // 電腦版：表格式佈局
  return (
    <section id="flight" className="py-16" style={{ backgroundColor: theme.colors.background }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-2xl shadow-lg border overflow-hidden relative"
          style={{ borderColor: '#f0f0f0' }}
        >
          {/* 左側強調線 */}
          <div
            className="absolute top-0 left-0 w-2 h-full"
            style={{ backgroundColor: theme.colors.primary }}
          />

          {/* 標題區 */}
          <div className="flex flex-row justify-between items-end p-8 lg:p-12 pb-6 gap-4">
            <div>
              <span
                className="italic block mb-1"
                style={{
                  color: theme.colors.secondary,
                  fontFamily: theme.fonts.heading,
                  fontSize: '1.125rem',
                }}
              >
                Your Journey Begins
              </span>
              <h2
                className="font-bold text-3xl"
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.fonts.heading,
                }}
              >
                {FLIGHT_LABELS.LABEL_319}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.muted }}>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: theme.colors.primary }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{FLIGHT_LABELS.LABEL_6845}</span>
            </div>
          </div>

          {/* 航班表格 */}
          <div className="px-8 lg:px-12 pb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <th
                    className="py-4 px-4 text-[0.625rem] font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.muted }}
                  >
                    Type
                  </th>
                  <th
                    className="py-4 px-4 text-[0.625rem] font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.muted }}
                  >
                    Date
                  </th>
                  <th
                    className="py-4 px-4 text-[0.625rem] font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.muted }}
                  >
                    Airline
                  </th>
                  <th
                    className="py-4 px-4 text-[0.625rem] font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.muted }}
                  >
                    Flight No.
                  </th>
                  <th
                    className="py-4 px-4 text-[0.625rem] font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.muted }}
                  >
                    Schedule
                  </th>
                  <th
                    className="py-4 px-4 text-[0.625rem] font-bold uppercase tracking-widest text-right"
                    style={{ color: theme.colors.muted }}
                  >
                    Class
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {outboundFlight && (
                  <FlightRow
                    flight={outboundFlight}
                    type="outbound"
                    isMobile={false}
                    theme={theme}
                  />
                )}
                {returnFlight && (
                  <FlightRow flight={returnFlight} type="return" isMobile={false} theme={theme} />
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// 手機版航班卡片
function MobileFlightCard({
  flight,
  type,
  theme,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: ReturnType<typeof getTheme>
}) {
  const isOutbound = type === 'outbound'
  const { date, day } = formatFlightDate(flight.departureDate)
  const labelColor = isOutbound ? theme.colors.primary : theme.colors.secondary

  return (
    <div className="pl-5 pr-4 py-4">
      {/* 標籤 + 日期 */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-bold px-2 py-1 rounded"
          style={{ backgroundColor: `${labelColor}15`, color: labelColor }}
        >
          {isOutbound ? FLIGHT_LABELS.去程 : FLIGHT_LABELS.回程}
        </span>
        <span className="text-sm" style={{ color: theme.colors.muted }}>
          {date} {day}
        </span>
      </div>

      {/* 航班資訊 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
          {flight.airline || '--'}
        </span>
        <span className="text-sm font-mono" style={{ color: theme.colors.muted }}>
          {flight.flightNumber || '--'}
        </span>
      </div>

      {/* 起降時間 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xl font-bold" style={{ color: theme.colors.text }}>
            {flight.departureTime || '--:--'}
          </div>
          <div className="text-xs font-medium" style={{ color: theme.colors.muted }}>
            {flight.departureAirport || '--'}
          </div>
        </div>

        <div className="flex items-center gap-1 px-2">
          <div className="w-8 h-px" style={{ backgroundColor: theme.colors.muted }} />
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: labelColor }}
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <div className="w-8 h-px" style={{ backgroundColor: theme.colors.muted }} />
        </div>

        <div className="flex-1 text-right">
          <div className="text-xl font-bold" style={{ color: theme.colors.text }}>
            {flight.arrivalTime || '--:--'}
          </div>
          <div className="text-xs font-medium" style={{ color: theme.colors.muted }}>
            {flight.arrivalAirport || '--'}
          </div>
        </div>
      </div>
    </div>
  )
}

// 航班行組件
function FlightRow({
  flight,
  type,
  isMobile,
  theme,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  isMobile: boolean
  theme: ReturnType<typeof getTheme>
}) {
  const isOutbound = type === 'outbound'
  const { date, day } = formatFlightDate(flight.departureDate)
  const iconBgColor = isOutbound ? `${theme.colors.primary}10` : `${theme.colors.secondary}10`
  const iconColor = isOutbound ? theme.colors.primary : theme.colors.secondary

  return (
    <tr
      className="group hover:bg-muted transition-colors"
      style={{ borderBottom: '1px solid #f0f0f0' }}
    >
      {/* Type */}
      <td className="py-6 px-4">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
          style={{ backgroundColor: iconBgColor, color: iconColor }}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: 'rotate(0deg)' }}
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
        </div>
      </td>

      {/* Date */}
      <td className="py-6 px-4">
        <span
          className="text-lg font-medium"
          style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
        >
          {date}
        </span>
        <span className="text-xs font-normal ml-2" style={{ color: theme.colors.muted }}>
          {day}
        </span>
      </td>

      {/* Airline */}
      <td className="py-6 px-4">
        <span className="font-bold" style={{ color: theme.colors.text }}>
          {flight.airline || '--'}
        </span>
      </td>

      {/* Flight No */}
      <td className="py-6 px-4 font-mono" style={{ color: theme.colors.muted }}>
        {flight.flightNumber || '--'}
      </td>

      {/* Schedule */}
      <td className="py-6 px-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div>
            <div
              className={`font-bold ${isMobile ? 'text-base' : 'text-xl'}`}
              style={{ color: theme.colors.text }}
            >
              {flight.departureTime || '--:--'}
            </div>
            <div
              className="text-[0.625rem] font-bold tracking-wider"
              style={{ color: theme.colors.muted }}
            >
              {flight.departureAirport || '--'}
            </div>
          </div>

          {/* 箭頭 */}
          <div className="h-px w-6 md:w-8 bg-border relative">
            <div
              className="absolute -top-1 right-0 w-2 h-2 border-t border-r border-border rotate-45"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>

          <div>
            <div
              className={`font-bold ${isMobile ? 'text-base' : 'text-xl'}`}
              style={{ color: theme.colors.text }}
            >
              {flight.arrivalTime || '--:--'}
            </div>
            <div
              className="text-[0.625rem] font-bold tracking-wider"
              style={{ color: theme.colors.muted }}
            >
              {flight.arrivalAirport || '--'}
            </div>
          </div>
        </div>
      </td>

      {/* Class */}
      {!isMobile && (
        <td className="py-6 px-4 text-right">
          <span
            className="inline-block px-3 py-1 rounded-full border text-xs"
            style={{ borderColor: '#E5E7EB', color: theme.colors.muted }}
          >
            Economy
          </span>
        </td>
      )}
    </tr>
  )
}
