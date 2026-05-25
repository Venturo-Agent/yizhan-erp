'use client'

/**
 * 福岡高爾夫提案 - 雙軌行程總覽（Editorial Magazine 版）
 * 無 emoji · 襯線字體 · 雜誌排版
 */

import { motion } from 'framer-motion'
import { useState } from 'react'

export function FukuokaGolfProposalItinerary() {
  const [activeDay, setActiveDay] = useState<number | null>(null)

  const itineraryDays = [
    {
      day: 1,
      date: '10/12',
      dayOfWeek: '日',
      title: '抵達福岡',
      subtitle: '入住博多五星',
      description: '從台北直飛福岡，抵達後入住博多車站周邊五星飯店，享用晚餐。',
      flight: { code: 'JX 840', departure: '09:35', arrival: '13:05' },
      golfGroup: {
        title: '抵達 + 自由活動',
        location: 'The Ritz-Carlton Fukuoka',
        time: '14:00 抵達',
        highlights: ['專車接機', '入住五星飯店', '晚間聚餐'],
      },
      nonGolfGroup: {
        title: '抵達 + 飯店探索',
        location: 'The Ritz-Carlton Fukuoka',
        time: '14:00 抵達',
        highlights: ['專車接機', '入住五星飯店', '享用下午茶'],
      },
      meal: { breakfast: false, lunch: false, dinner: true },
      hotel: 'The Ritz-Carlton Fukuoka',
    },
    {
      day: 2,
      date: '10/13',
      dayOfWeek: '一',
      title: '第一回合',
      subtitle: '糸島半島球場',
      description: '分組行動：先生們前往糸島頂級球場揮桿，太太們展開文化探索之旅。',
      golfGroup: {
        title: '第一回合 Golf',
        location: 'The Players Club 糸島',
        time: '07:00 出發 → 18:00 返回',
        highlights: ['頂級球場擊球', '球場午餐', '居酒屋歡聚'],
      },
      nonGolfGroup: {
        title: '太太文化之旅',
        location: '太宰府天滿宮 + 柳川',
        time: '09:00 出發 → 18:00 返回',
        highlights: ['太宰府天滿宮祈福', '柳川遊船', '鰻魚飯'],
      },
      meal: { breakfast: true, lunch: true, dinner: true },
      hotel: 'The Ritz-Carlton Fukuoka',
    },
    {
      day: 3,
      date: '10/14',
      dayOfWeek: '二',
      title: '第二回合',
      subtitle: '換宿温泉日',
      description: '先生們第二回合球賽，太太們享受頂級 SPA。傍晚集體前往新飯店。',
      golfGroup: {
        title: '第二回合 Golf',
        location: '久山高原 Golf Club',
        time: '07:00 出發 → 17:00 返回',
        highlights: ['丘陵景觀球場', '球場午餐', '傍晚集結換宿'],
      },
      nonGolfGroup: {
        title: '太太 SPA 日',
        location: 'Ritz-Carlton Spa',
        time: '10:00 放鬆 → 16:00 準備換宿',
        highlights: ['Ritz SPA 90分鐘', '海灘漫步', '16:00 集合換宿'],
      },
      meal: { breakfast: true, lunch: true, dinner: true },
      hotel: '一壺天',
      isHotelSwap: true,
    },
    {
      day: 4,
      date: '10/15',
      dayOfWeek: '三',
      title: '温泉日',
      subtitle: '深度體驗',
      description: '先生在飯店盡情享受設施，或安排第三回合球賽。太太們悠閒探索小鎮。',
      golfGroup: {
        title: '飯店享受日',
        location: '溫泉旅館內',
        time: '自由安排',
        highlights: ['溫泉大浴場', '私人湯屋', '可選加打第三回合'],
      },
      nonGolfGroup: {
        title: '太太深度體驗',
        location: '由布院 / 金麟湖',
        time: '10:00 出發 → 傍晚返回',
        highlights: ['金麟湖晨霧', '由布院甜點', '特色小店'],
      },
      meal: { breakfast: true, lunch: true, dinner: true },
      hotel: 'Nociume 浮羽夢之里',
    },
    {
      day: 5,
      date: '10/16',
      dayOfWeek: '四',
      title: '退房返程',
      subtitle: '期待再相會',
      description: '享用完早餐後退房，前往機場，帶著滿滿的回憶回到台灣。',
      flight: { code: 'JX 841', departure: '14:15', arrival: '15:45' },
      golfGroup: {
        title: '退房 + 返程',
        location: '福岡國際機場',
        time: '10:00 退房 → 14:15 起飛',
        highlights: ['享用早餐', '免稅店購物', '14:15 起飛回台'],
      },
      nonGolfGroup: {
        title: '退房 + 返程',
        location: '福岡國際機場',
        time: '10:00 退房 → 14:15 起飛',
        highlights: ['享用早餐', '免稅店購物', '14:15 起飛回台'],
      },
      meal: { breakfast: true, lunch: false, dinner: false },
      hotel: null,
    },
  ]

  return (
    <section className="py-32" style={{ backgroundColor: '#FAF8F5' }}>
      <div className="max-w-6xl mx-auto px-8 lg:px-16">
        {/* 標題區 */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span
            className="text-xs tracking-[0.3em] uppercase block mb-4"
            style={{ fontFamily: 'system-ui', color: '#8B7355' }}
          >
            Daily Itinerary
          </span>
          <h2 className="text-5xl lg:text-6xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            嚴選私人行程
          </h2>
          <p className="text-lg mt-4" style={{ color: '#666' }}>
            高球與度假自由選
          </p>
        </motion.div>

        {/* 雙軌圖示說明 */}
        <motion.div
          className="flex gap-16 mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-8" style={{ backgroundColor: '#8B7355' }} />
            <span className="text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>高球組 · 先生們</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1 h-8" style={{ backgroundColor: '#6B7B8B' }} />
            <span className="text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>太太組 · 非打球</span>
          </div>
        </motion.div>

        {/* 日程列表 */}
        <div className="space-y-0">
          {itineraryDays.map((day, index) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <div
                className="border-t cursor-pointer py-12 transition-colors duration-300"
                style={{
                  borderColor: activeDay === day.day ? '#8B7355' : '#E5E5E5',
                  backgroundColor: activeDay === day.day ? 'rgba(139,115,85,0.03)' : 'transparent',
                }}
                onClick={() => setActiveDay(activeDay === day.day ? null : day.day)}
              >
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                  {/* 日期 */}
                  <div className="lg:col-span-2">
                    <span
                      className="text-xs tracking-[0.2em] uppercase block"
                      style={{ fontFamily: 'system-ui', color: '#999' }}
                    >
                      Day {day.day}
                    </span>
                    <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                      {day.date}
                    </p>
                    <p className="text-sm" style={{ color: '#666' }}>{day.dayOfWeek}</p>
                  </div>

                  {/* 標題 */}
                  <div className="lg:col-span-4">
                    <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                      {day.title}
                    </h3>
                    <p className="text-base mt-1" style={{ color: '#666' }}>{day.subtitle}</p>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: '#444' }}>
                      {day.description}
                    </p>
                    {day.flight && (
                      <div className="mt-4 p-3 border" style={{ borderColor: '#E5E5E5' }}>
                        <span className="text-xs tracking-[0.15em] uppercase block mb-1" style={{ fontFamily: 'system-ui', color: '#8B7355' }}>
                          Flight
                        </span>
                        <p className="text-base font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                          {day.flight.code}
                        </p>
                        <p className="text-sm" style={{ color: '#666' }}>
                          {day.flight.departure} — {day.flight.arrival}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 飯店 */}
                  <div className="lg:col-span-3">
                    {day.hotel && (
                      <div className="inline-block">
                        <span
                          className="text-xs tracking-[0.15em] uppercase block mb-1"
                          style={{ fontFamily: 'system-ui', color: '#999' }}
                        >
                          住宿
                        </span>
                        <p className="text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>{day.hotel}</p>
                        {day.isHotelSwap && (
                          <span
                            className="inline-block mt-2 text-xs px-3 py-1"
                            style={{ backgroundColor: '#8B7355', color: '#fff' }}
                          >
                            換宿
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 餐食 */}
                  <div className="lg:col-span-3">
                    <span
                      className="text-xs tracking-[0.15em] uppercase block mb-2"
                      style={{ fontFamily: 'system-ui', color: '#999' }}
                    >
                      餐食
                    </span>
                    <div className="flex gap-4">
                      <MealIndicator active={day.meal.breakfast} label="早" />
                      <MealIndicator active={day.meal.lunch} label="午" />
                      <MealIndicator active={day.meal.dinner} label="晚" />
                    </div>
                  </div>
                </div>

                {/* 展開內容 */}
                {activeDay === day.day && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-12 pt-12"
                    style={{ borderTop: '1px solid #E5E5E5' }}
                  >
                    <div className="grid md:grid-cols-2 gap-16">
                      {/* 打球組 */}
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1 h-6" style={{ backgroundColor: '#8B7355' }} />
                          <span
                            className="text-xs tracking-[0.2em] uppercase"
                            style={{ fontFamily: 'system-ui', color: '#8B7355' }}
                          >
                            Golf Group / 高球組
                          </span>
                        </div>
                        <h4 className="text-xl font-bold mb-3" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                          {day.golfGroup.title}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: '#666' }}>{day.golfGroup.location}</p>
                        <p className="text-sm mb-4" style={{ color: '#666' }}>{day.golfGroup.time}</p>
                        <ul className="space-y-2">
                          {day.golfGroup.highlights.map((h, i) => (
                            <li key={i} className="text-sm" style={{ color: '#444' }}>
                              <span style={{ color: '#8B7355' }}>—</span> {h}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 太太組 */}
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1 h-6" style={{ backgroundColor: '#6B7B8B' }} />
                          <span
                            className="text-xs tracking-[0.2em] uppercase"
                            style={{ fontFamily: 'system-ui', color: '#6B7B8B' }}
                          >
                            Ladies Group
                          </span>
                        </div>
                        <h4 className="text-xl font-bold mb-3" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                          {day.nonGolfGroup.title}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: '#666' }}>{day.nonGolfGroup.location}</p>
                        <p className="text-sm mb-4" style={{ color: '#666' }}>{day.nonGolfGroup.time}</p>
                        <ul className="space-y-2">
                          {day.nonGolfGroup.highlights.map((h, i) => (
                            <li key={i} className="text-sm" style={{ color: '#444' }}>
                              <span style={{ color: '#6B7B8B' }}>—</span> {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MealIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="text-center">
      <div
        className="w-8 h-8 flex items-center justify-center mb-1"
        style={{
          backgroundColor: active ? '#8B7355' : 'transparent',
          border: `1px solid ${active ? '#8B7355' : '#ddd'}`,
        }}
      >
        <span
          className="text-xs"
          style={{ color: active ? '#fff' : '#ccc', fontFamily: 'system-ui' }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
