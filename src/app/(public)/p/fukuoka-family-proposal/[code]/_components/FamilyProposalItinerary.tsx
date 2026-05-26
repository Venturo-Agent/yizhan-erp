'use client'

/**
 * 三代同堂提案 - 行程總覽
 */

import { motion } from 'framer-motion'
import { useState } from 'react'

interface DayPlan {
  day: number
  date: string
  dayOfWeek: string
  title: string
  subtitle: string
  description: string
  activity: {
    icon: string
    title: string
    location: string
    time: string
    highlights: string[]
  }
  meal: { breakfast: boolean; lunch: boolean; dinner: boolean }
  hotel: string | null // 可為 null：返程等沒住宿的日子（render 已用 {day.hotel && ...} 處理）
}

const itineraryDays: DayPlan[] = [
  {
    day: 1,
    date: '07/07',
    dayOfWeek: '一',
    title: '啟程',
    subtitle: '抵達福岡',
    description: '從台北直飛福岡，抵達後入住市區五星飯店，享用晚餐。',
    activity: {
      icon: '01',
      title: '抵達 + 飯店 check-in',
      location: 'The Miyako Hotel 博多都酒店',
      time: '14:00 抵達',
      highlights: ['專車接機', '入住五星飯店', '享用晚餐'],
    },
    meal: { breakfast: false, lunch: false, dinner: true },
    hotel: 'The Miyako Hotel 博多都酒店',
  },
  {
    day: 2,
    date: '07/08',
    dayOfWeek: '二',
    title: '海洋世界',
    subtitle: '海中道探索日',
    description: '全家一同前往海洋世界海中道，小孩的最愛，大人也能放鬆。',
    activity: {
      icon: '02',
      title: '海洋世界海中道',
      location: '海中道海滨公园',
      time: '10:00 出發 → 17:00 返回',
      highlights: ['海豚表演', '海底隧道', '戶外遊戲區'],
    },
    meal: { breakfast: true, lunch: true, dinner: true },
    hotel: 'The Miyako Hotel 博多都酒店',
  },
  {
    day: 3,
    date: '07/09',
    dayOfWeek: '三',
    title: '移動溫泉區',
    subtitle: '前往別府',
    description: '享用早餐後退房，搭車前往別府，抵達飯店後享受藝術與溫泉。',
    activity: {
      icon: '03',
      title: '移動 + 飯店 check-in',
      location: 'ANA InterContinental Beppu Resort & Spa',
      time: '10:00 出發 → 14:00 抵達',
      highlights: ['藝術飯店探索', '下午茶', '溫泉設施'],
    },
    meal: { breakfast: true, lunch: true, dinner: true },
    hotel: 'ANA InterContinental Beppu Resort & Spa',
  },
  {
    day: 4,
    date: '07/10',
    dayOfWeek: '四',
    title: '溫泉日',
    subtitle: '藝術溫泉慢活',
    description: '在飯店盡情享受藝術空間與溫泉設施，三代同堂的悠閒時光。',
    activity: {
      icon: '04',
      title: '飯店享受日',
      location: 'ANA InterContinental Beppu Resort & Spa',
      time: '全天自由活動',
      highlights: ['溫泉大浴場', '景觀湯屋', '家庭寫真'],
    },
    meal: { breakfast: true, lunch: true, dinner: true },
    hotel: 'ANA InterContinental Beppu Resort & Spa',
  },
  {
    day: 5,
    date: '07/11',
    dayOfWeek: '五',
    title: '溫泉日',
    subtitle: '最後放鬆',
    description: '享用完早餐後在飯店周邊散步，下午自由活動，傍晚享用會席料理。',
    activity: {
      icon: '05',
      title: '最後溫泉日',
      location: 'ANA InterContinental Beppu Resort & Spa',
      time: '全天自由活動',
      highlights: ['周邊散步', '最後溫泉時光', '會席晚餐'],
    },
    meal: { breakfast: true, lunch: true, dinner: true },
    hotel: 'ANA InterContinental Beppu Resort & Spa',
  },
  {
    day: 6,
    date: '07/12',
    dayOfWeek: '六',
    title: '返程',
    subtitle: '期待再相會',
    description: '享用完早餐後退房，前往機場，帶著滿滿的回憶回到台灣。',
    activity: {
      icon: '06',
      title: '退房 + 返程',
      location: '福岡國際機場',
      time: '10:00 退房 → 14:00 起飛',
      highlights: ['享用早餐', '免稅店購物', '14:00 起飛回台'],
    },
    meal: { breakfast: true, lunch: false, dinner: false },
    hotel: null,
  },
]

export function FamilyProposalItinerary() {
  const [activeDay, setActiveDay] = useState<number | null>(null)

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
          <h2
            className="text-5xl lg:text-6xl font-bold"
            style={{ fontFamily: 'Noto Serif TC, serif' }}
          >
            家族行程
          </h2>
          <p className="text-lg mt-4" style={{ color: '#666' }}>
            三代同堂，每一天都是珍貴的回憶
          </p>
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
                    <p
                      className="text-3xl font-bold mt-1"
                      style={{ fontFamily: 'Noto Serif TC, serif' }}
                    >
                      {day.date}
                    </p>
                    <p className="text-sm" style={{ color: '#666' }}>
                      {day.dayOfWeek}
                    </p>
                  </div>

                  {/* 標題 */}
                  <div className="lg:col-span-5">
                    <h3
                      className="text-2xl font-bold"
                      style={{ fontFamily: 'Noto Serif TC, serif' }}
                    >
                      {day.title}
                    </h3>
                    <p className="text-base mt-1" style={{ color: '#666' }}>
                      {day.subtitle}
                    </p>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: '#444' }}>
                      {day.description}
                    </p>
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
                        <p className="text-sm" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                          {day.hotel}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 餐食 */}
                  <div className="lg:col-span-2">
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
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div
                            className="w-12 h-12 flex items-center justify-center"
                            style={{ backgroundColor: '#8B7355', color: '#fff' }}
                          >
                            <span className="text-lg font-bold">{day.activity.icon}</span>
                          </div>
                          <span
                            className="text-xs tracking-[0.2em] uppercase"
                            style={{ fontFamily: 'system-ui', color: '#8B7355' }}
                          >
                            活動
                          </span>
                        </div>
                        <h4
                          className="text-xl font-bold mb-3"
                          style={{ fontFamily: 'Noto Serif TC, serif' }}
                        >
                          {day.activity.title}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: '#666' }}>
                          {day.activity.location}
                        </p>
                        <p className="text-sm mb-4" style={{ color: '#666' }}>
                          {day.activity.time}
                        </p>
                        <ul className="space-y-2">
                          {day.activity.highlights.map((h, i) => (
                            <li key={i} className="text-sm" style={{ color: '#444' }}>
                              <span style={{ color: '#8B7355' }}>—</span> {h}
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
