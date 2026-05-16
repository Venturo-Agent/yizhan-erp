'use client'

import { motion } from 'framer-motion'
import { Phone, MapPin, Calendar, Clock, User } from 'lucide-react'
import type { TourPageData } from '@/app/(main)/tours/_types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

import { LUXURY } from './utils/luxuryTokens'

interface TourLeaderSectionLuxuryProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

export function TourLeaderSectionLuxury({ data, viewMode }: TourLeaderSectionLuxuryProps) {
  const isMobile = viewMode === 'mobile'
  const leader = data.leader
  const meetingPoints = data.meetingPoints || []
  const meetingInfo = data.meetingInfo

  // 如果沒有領隊資訊也沒有集合資訊，不顯示此區塊
  const hasLeaderInfo = leader?.name || leader?.domesticPhone || leader?.overseasPhone
  // 支援兩種資料格式：meetingPoints (陣列) 或 meetingInfo (單一物件)
  const hasMeetingInfo = meetingPoints.length > 0 || !!(meetingInfo?.time || meetingInfo?.location)

  if (data.showLeaderMeeting === false || (!hasLeaderInfo && !hasMeetingInfo)) return null

  // 格式化日期
  const formatDate = (dateStr: string | null | undefined): { date: string; weekday: string } => {
    if (!dateStr) return { date: '待定', weekday: '' }
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return { date: '待定', weekday: '' }
      const year = date.getFullYear()
      const month = date.getMonth()
      const day = date.getDate()
      const dayOfWeek = date.getDay()
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(dayOfWeek))
        return { date: '待定', weekday: '' }
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      return {
        date: `${year}.${(month + 1).toString().padStart(2, '0')}.${day.toString().padStart(2, '0')}`,
        weekday: `(${weekdays[dayOfWeek]})`,
      }
    } catch {
      return { date: '待定', weekday: '' }
    }
  }

  const { date: formattedDate, weekday } = formatDate(data.departureDate)

  return (
    <section
      className={isMobile ? 'py-12' : 'py-20'}
      style={{ backgroundColor: LUXURY.background }}
    >
      <div className={isMobile ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* 標題區 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <span
            className="block mb-2 italic"
            style={{
              color: LUXURY.secondary,
              fontFamily: LUXURY.font.serif,
              fontSize: isMobile ? '1rem' : '1.125rem',
            }}
          >
            Travel Essentials
          </span>
          <h2
            className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}
            style={{
              color: LUXURY.text,
              fontFamily: LUXURY.font.serif,
            }}
          >
            {TOURS_LABELS.LABEL_7562}
          </h2>
        </motion.div>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'md:grid-cols-2 gap-8'}`}>
          {/* 領隊資訊卡片 */}
          {hasLeaderInfo && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-xl shadow-sm p-6 md:p-8 border border-border flex items-center gap-6 relative overflow-hidden group"
            >
              {/* 裝飾圓形 */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${LUXURY.secondary}10` }}
              />

              {/* 頭像 */}
              {leader?.photo ? (
                <img
                  src={leader.photo}
                  alt={leader?.name || 'Tour Leader'}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-2 shadow-sm relative z-10"
                  style={{ borderColor: LUXURY.surface }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-2 shadow-sm relative z-10"
                  style={{
                    backgroundColor: '#f5f5f5',
                    borderColor: LUXURY.surface,
                  }}
                >
                  <User className="w-8 h-8" style={{ color: LUXURY.muted }} />
                </div>
              )}

              {/* 領隊資訊 */}
              <div className="relative z-10">
                <span
                  className="text-[0.625rem] font-bold uppercase tracking-widest block mb-1"
                  style={{ color: LUXURY.secondary }}
                >
                  Tour Leader
                </span>
                <h3
                  className={`font-bold mb-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}
                  style={{
                    color: LUXURY.text,
                    fontFamily: LUXURY.font.serif,
                  }}
                >
                  {leader?.name || '待定'}
                  {leader?.englishName && (
                    <span className="ml-2" style={{ color: LUXURY.text }}>
                      {leader.englishName}
                    </span>
                  )}
                </h3>
                <p className="text-sm mb-2" style={{ color: LUXURY.muted }}>
                  Professional Guide
                </p>

                {/* 電話資訊 */}
                {(leader?.domesticPhone || leader?.overseasPhone) && (
                  <div className="space-y-1">
                    {leader?.domesticPhone && (
                      <div
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: LUXURY.primary }}
                      >
                        <Phone size="0.875em" />
                        <span>{leader.domesticPhone}</span>
                      </div>
                    )}
                    {leader?.overseasPhone && (
                      <div
                        className="flex items-center gap-2 text-xs"
                        style={{ color: LUXURY.muted }}
                      >
                        <span>
                          {TOURS_LABELS.LABEL_5167}
                          {leader.overseasPhone}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 集合資訊卡片 */}
          {hasMeetingInfo && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-xl shadow-sm p-6 md:p-8 border border-border relative overflow-hidden group"
            >
              {/* 裝飾圓形 */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${LUXURY.primary}08` }}
              />

              <div className="flex justify-between items-start relative z-10">
                <div className="flex-1">
                  <span
                    className="text-[0.625rem] font-bold uppercase tracking-widest block mb-2"
                    style={{ color: LUXURY.primary }}
                  >
                    Meeting Point
                  </span>

                  {/* 集合點資訊 - 支援 meetingPoints 陣列或 meetingInfo 單一物件 */}
                  {(() => {
                    // 優先使用 meetingPoints，其次是 meetingInfo
                    const primaryLocation =
                      meetingPoints[0]?.location || meetingInfo?.location || '待定'
                    const primaryTime = meetingPoints[0]?.time || meetingInfo?.time || '待定'

                    return (
                      <>
                        <h3
                          className={`font-bold mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}
                          style={{
                            color: LUXURY.text,
                            fontFamily: LUXURY.font.serif,
                          }}
                        >
                          {primaryLocation}
                        </h3>

                        <div className="space-y-2">
                          {/* 日期 */}
                          <div className="flex items-center gap-3">
                            <Calendar size="1em" style={{ color: LUXURY.muted }} />
                            <span className="text-sm font-medium" style={{ color: LUXURY.text }}>
                              {formattedDate} {weekday}
                            </span>
                          </div>

                          {/* 時間 */}
                          <div className="flex items-center gap-3">
                            <Clock size="1em" style={{ color: LUXURY.muted }} />
                            <span className="text-sm font-medium" style={{ color: LUXURY.text }}>
                              {primaryTime}
                            </span>
                          </div>

                          {/* 地點 */}
                          <div className="flex items-center gap-3">
                            <MapPin size="1em" style={{ color: LUXURY.muted }} />
                            <span className="text-sm font-medium" style={{ color: LUXURY.text }}>
                              {primaryLocation}
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  })()}

                  {/* 其他集合點 (只有當 meetingPoints 有多個時才顯示) */}
                  {meetingPoints.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p
                        className="text-xs font-bold uppercase tracking-widest mb-2"
                        style={{ color: LUXURY.muted }}
                      >
                        {TOURS_LABELS.LABEL_3746}
                      </p>
                      <div className="space-y-2">
                        {meetingPoints.slice(1).map((point, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span style={{ color: LUXURY.secondary }}>•</span>
                            <span style={{ color: LUXURY.text }}>
                              {point.time} - {point.location}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 圖示 */}
                <div className="hidden sm:block">
                  <MapPin size="3em" style={{ color: '#e5e5e5' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
