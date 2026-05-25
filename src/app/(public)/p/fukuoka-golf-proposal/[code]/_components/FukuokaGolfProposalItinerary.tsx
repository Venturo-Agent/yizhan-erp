'use client'

/**
 * 福岡高爾夫提案 - 雙軌行程總覽
 * 8人打球 / 8人太太專屬行程
 */

import { motion } from 'framer-motion'
import { useState } from 'react'

const LUXURY = {
  primary: '#1a4a5e',
  secondary: '#c9aa7c',
  accent: '#8f4f4f',
  background: '#FDFBF7',
}

interface DayPlan {
  day: number
  date: string
  dayOfWeek: string
  type: 'arrival' | 'golf' | 'culture' | 'spa' | 'mixed' | 'departure'
  title: string
  description: string
  golfGroup?: {
    icon: string
    title: string
    location: string
    time: string
    highlights: string[]
    image: string
  }
  nonGolfGroup?: {
    icon: string
    title: string
    location: string
    time: string
    highlights: string[]
    image: string
  }
  meal?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
  hotel?: {
    name: string
    note?: string
  }
  isHotelSwap?: boolean
}

const itineraryDays: DayPlan[] = [
  {
    day: 1,
    date: '10/12',
    dayOfWeek: '日',
    type: 'arrival',
    title: '抵達福岡 · 入住首選旅館',
    description: '從台北直飛福岡，抵達後入住博多車站周邊五星飯店，輕鬆享用晚餐。',
    nonGolfGroup: {
      icon: '✈️',
      title: '抵達 + 飯店 check-in',
      location: 'The Ritz-Carlton Fukuoka',
      time: '14:00 抵達',
      highlights: ['專車接機', '入住 The Ritz-Carlton', '飯店內享用下午茶'],
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    },
    golfGroup: {
      icon: '✈️',
      title: '抵達 + 自由活動',
      location: 'The Ritz-Carlton Fukuoka',
      time: '14:00 抵達',
      highlights: ['專車接機', '自由逛街或高爾夫用品店', '晚間太太同行聚餐'],
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80',
    },
    meal: {
      dinner: '飯店內法式晚餐 或 博多傳統料理',
    },
    hotel: {
      name: 'The Ritz-Carlton Fukuoka',
      note: 'Day 1-3 入住',
    },
  },
  {
    day: 2,
    date: '10/13',
    dayOfWeek: '一',
    type: 'golf',
    title: '第一回合 · 糸島半島頂級球場',
    description: '分組行動：先生們前往糸島頂級球場揮桿，太太們展開文化探索之旅。',
    golfGroup: {
      icon: '⛳',
      title: '第一回合 Golf',
      location: 'The Players Club 糸島 / Keyon Golf Club',
      time: '07:00 出發 → 18:00 返回',
      highlights: ['頂級球場擊球', '球場午餐', '居酒屋歡聚'],
      image: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600&q=80',
    },
    nonGolfGroup: {
      icon: '⛩️',
      title: '太太文化之旅 A',
      location: '太宰府天滿宮 + 柳川泛舟',
      time: '09:00 出發 → 18:00 返回',
      highlights: ['太宰府天滿宮祈福', '星巴克太宰府店', '柳川遊船 + 鰻魚飯', '漫步大島海岸'],
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80',
    },
    meal: {
      breakfast: '飯店早餐',
      lunch: '球場午餐 / 柳川鰻魚飯',
      dinner: '博多車站屋台 or 知名燒肉',
    },
    hotel: {
      name: 'The Ritz-Carlton Fukuoka',
      note: 'Day 1-3 入住',
    },
  },
  {
    day: 3,
    date: '10/14',
    dayOfWeek: '二',
    type: 'mixed',
    title: '第二回合 · 太太 SPA 日 + 換宿',
    description: '先生們第二回合球賽，太太們享受頂級 SPA。傍晚集體前往新飯店，展開溫泉之旅。',
    golfGroup: {
      icon: '⛳',
      title: '第二回合 Golf',
      location: 'Fukuoka Golf Club / 久山高原 Golf',
      time: '07:00 出發 → 17:00 返回',
      highlights: ['丘陵景觀球場', '球場午餐', '傍晚集結出發'],
      image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&q=80',
    },
    nonGolfGroup: {
      icon: '💆',
      title: '太太 SPA 日',
      location: 'Ritz-Carlton Spa / 百道海灘',
      time: '10:00 放鬆 → 16:00 準備換宿',
      highlights: ['Ritz-Carlton SPA 90分鐘', '海灘漫步', '購物中心最後巡禮', '16:00 集合換宿'],
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
    },
    meal: {
      breakfast: '飯店早餐',
      lunch: '百道海灘咖啡廳',
      dinner: '溫泉旅館會席料理',
    },
    hotel: {
      name: 'Nociume 浮羽夢之里 或 界 別府',
      note: 'Day 3-5 入住 · 溫泉旅館',
    },
    isHotelSwap: true,
  },
  {
    day: 4,
    date: '10/15',
    dayOfWeek: '三',
    type: 'spa',
    title: '溫泉日 · 深度體驗',
    description: '先生在飯店盡情享受設施，或安排第三回合球賽。太太們悠閒探索當地店家與餐廳。',
    golfGroup: {
      icon: '🏨',
      title: '飯店享受日（可加打第三回合）',
      location: '溫泉旅館內',
      time: '自由安排',
      highlights: ['溫泉大浴場', '私人湯屋預約', '可選第三回合球場'],
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    },
    nonGolfGroup: {
      icon: '🛍️',
      title: '太太深度體驗日',
      location: '由布院 / 別府 / 附近小鎮',
      time: '10:00 出發 → 傍晚返回',
      highlights: ['金麟湖晨霧', '由布院甜點之旅', '特色小店尋寶', '當地職人工作坊'],
      image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80',
    },
    meal: {
      breakfast: '溫泉旅館早餐',
      lunch: '由布院特色餐廳',
      dinner: '旅館內豪華會席',
    },
    hotel: {
      name: 'Nociume 浮羽夢之里 或 界 別府',
      note: 'Day 3-5 入住',
    },
  },
  {
    day: 5,
    date: '10/16',
    dayOfWeek: '四',
    type: 'departure',
    title: '退房返程 · 期待再相會',
    description: '享用完早餐後退房，前往機場，帶著滿滿的回憶回到台灣。',
    nonGolfGroup: {
      icon: '🏠',
      title: '退房 + 返程',
      location: '福岡國際機場',
      time: '10:00 退房 → 14:00 起飛',
      highlights: ['享用早餐', '飯店周邊最後巡禮', '免稅店購物', '14:00 起飛回台'],
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
    },
    golfGroup: {
      icon: '🏠',
      title: '退房 + 返程',
      location: '福岡國際機場',
      time: '10:00 退房 → 14:00 起飛',
      highlights: ['享用早餐', '最後一桿回顧', '免稅店購物', '14:00 起飛回台'],
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
    },
    meal: {
      breakfast: '溫泉旅館早餐',
      lunch: '機場用餐',
    },
  },
]

export function FukuokaGolfProposalItinerary() {
  const [activeDay, setActiveDay] = useState<number | null>(null)

  return (
    <section className="space-y-20">
      {/* 標題區 */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: LUXURY.secondary, fontFamily: 'Noto Serif TC, serif' }}
        >
          Daily Itinerary
        </span>
        <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          雙軌行程總覽
        </h2>
        <p className="text-muted-foreground text-base">
          打球與休閒分頭並進，各有所得
        </p>
      </motion.div>

      {/* 雙軌圖示說明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex justify-center gap-8"
      >
        <div className="flex items-center gap-3 px-6 py-3 rounded-full" style={{ backgroundColor: `${LUXURY.secondary}15` }}>
          <span className="text-2xl">⛳</span>
          <div>
            <p className="text-sm font-bold">打球組</p>
            <p className="text-xs text-muted-foreground">先生們 · 8人</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-full" style={{ backgroundColor: `${LUXURY.accent}15` }}>
          <span className="text-2xl">💆</span>
          <div>
            <p className="text-sm font-bold">太太組</p>
            <p className="text-xs text-muted-foreground">非打球 · 8人</p>
          </div>
        </div>
      </motion.div>

      {/* 日程卡片 */}
      <div className="space-y-6">
        {itineraryDays.map((day, index) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
          >
            <div
              className={`
                rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer
                ${activeDay === day.day ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}
              `}
              style={{
                borderColor: activeDay === day.day ? LUXURY.secondary : 'rgba(201,170,124,0.15)',
                backgroundColor: 'var(--card, #fff)',
              }}
              onClick={() => setActiveDay(activeDay === day.day ? null : day.day)}
            >
              {/* 日程 header */}
              <div
                className="p-6 flex items-center gap-6"
                style={{
                  background: activeDay === day.day
                    ? `linear-gradient(135deg, ${LUXURY.primary} 0%, ${LUXURY.primary}ee 100%)`
                    : `linear-gradient(135deg, #1a4a5e 0%, #2d5a6b 100%)`,
                }}
              >
                {/* 日期區塊 */}
                <div className="flex-shrink-0 text-center">
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: 'rgba(201,170,124,0.8)' }}
                  >
                    DAY
                  </span>
                  <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                    {day.day}
                  </p>
                  <span className="text-sm text-white/70">{day.date}</span>
                  <span className="text-xs text-white/50 ml-1">({day.dayOfWeek})</span>
                </div>

                {/* 標題與飯店 */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                    {day.title}
                  </h3>
                  <p className="text-sm text-white/70 mt-1">{day.description}</p>
                  {day.hotel && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                        🏨 {day.hotel.name}
                      </span>
                      {day.isHotelSwap && (
                        <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#c9aa7c', color: '#1a1a1a' }}>
                          🔄 換宿
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 餐食 */}
                <div className="flex-shrink-0 flex gap-2">
                  {day.meal?.breakfast && <MealBadge icon="🍳" label="早" />}
                  {day.meal?.lunch && <MealBadge icon="🍜" label="午" />}
                  {day.meal?.dinner && <MealBadge icon="🍽️" label="晚" />}
                </div>
              </div>

              {/* 展開內容 */}
              {activeDay === day.day && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 bg-card"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 打球組 */}
                    {day.golfGroup && (
                      <div
                        className="rounded-xl p-5 border"
                        style={{
                          backgroundColor: `${LUXURY.secondary}05`,
                          borderColor: `${LUXURY.secondary}20`,
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: `${LUXURY.secondary}15` }}
                          >
                            {day.golfGroup.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: LUXURY.secondary }}>
                              打球組
                            </p>
                            <h4 className="text-base font-bold">{day.golfGroup.title}</h4>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          📍 {day.golfGroup.location}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          ⏰ {day.golfGroup.time}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {day.golfGroup.highlights.map((h, i) => (
                            <span
                              key={i}
                              className="text-xs px-3 py-1 rounded-full"
                              style={{
                                backgroundColor: `${LUXURY.secondary}15`,
                                color: LUXURY.secondary,
                              }}
                            >
                              {h}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 h-32 rounded-lg overflow-hidden">
                          <img
                            src={day.golfGroup.image}
                            alt={day.golfGroup.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* 太太組 */}
                    {day.nonGolfGroup && (
                      <div
                        className="rounded-xl p-5 border"
                        style={{
                          backgroundColor: `${LUXURY.accent}05`,
                          borderColor: `${LUXURY.accent}20`,
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: `${LUXURY.accent}15` }}
                          >
                            {day.nonGolfGroup.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: LUXURY.accent }}>
                              太太組
                            </p>
                            <h4 className="text-base font-bold">{day.nonGolfGroup.title}</h4>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          📍 {day.nonGolfGroup.location}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          ⏰ {day.nonGolfGroup.time}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {day.nonGolfGroup.highlights.map((h, i) => (
                            <span
                              key={i}
                              className="text-xs px-3 py-1 rounded-full"
                              style={{
                                backgroundColor: `${LUXURY.accent}15`,
                                color: LUXURY.accent,
                              }}
                            >
                              {h}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 h-32 rounded-lg overflow-hidden">
                          <img
                            src={day.nonGolfGroup.image}
                            alt={day.nonGolfGroup.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function MealBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
      title={label === '早' ? '早餐' : label === '午' ? '午餐' : '晚餐'}
    >
      <span className="text-sm">{icon}</span>
    </div>
  )
}
