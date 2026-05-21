'use client'

/**
 * 蘇梅島提案 - 行程總覽（Luxury 版）
 * 設計參考：TourHeroLuxury.tsx + DayCardContent.tsx
 */

import { motion } from 'framer-motion'

const LUXURY = {
  primary: '#2C5F4D',
  secondary: '#C69C6D',
  accent: '#8F4F4F',
  background: '#FDFBF7',
}

const itineraryDays = [
  {
    day: 1,
    date: '8/29（五）',
    type: '抵達日',
    icon: '✈️',
    title: '曼谷轉機 · 蘇梅島接駁',
    description: '上午從台北出發，曼谷轉機，傍晚抵達蘇梅島，入住五星渡假村。',
    highlights: ['09:25 台北起飛', '15:30 抵達蘇梅島', '入住 Sheraton Samui'],
    meal: ['✈️ 機上', '🍜 曼谷午餐', '🍽️ 飯店晚餐'],
    coverImage: 'https://images.unsplash.com/photo-1552465011-b4e1bf03eae2?w=600&q=80',
  },
  {
    day: 2,
    date: '8/30（六）',
    type: '全包日',
    icon: '🚤',
    title: '遊艇巡航 · 海灘 BBQ',
    description: '包下 Catamaran 雙體船出海，前往秘境小島浮潛、海釣。傍晚沙灘 BBQ 派對。',
    highlights: ['07:30 遊艇出海', '浮潛 + 海釣', '海灘 BBQ + FIRE SHOW'],
    meal: ['🍳 早餐', '🏝️ 船上午餐', '🍖 海灘 BBQ 晚餐'],
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  },
  {
    day: 3,
    date: '8/31（日）',
    type: '全包日',
    icon: '🏛️',
    title: '文化探索 · 泰式晚宴',
    description: '大佛寺、阿公阿嬤石、那蒙瀑布。下午自由活動或泳池派對，晚上傳統泰式晚宴。',
    highlights: ['大佛寺祈福', '阿公阿嬤石拍照', '那蒙瀑布戲水'],
    meal: ['🍳 早餐', '🍽️ 蘇梅市區午餐', '🥗 泰式晚宴'],
    coverImage: 'https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=600&q=80',
  },
  {
    day: 4,
    date: '9/1（一）',
    type: '自由活動',
    icon: '🎯',
    title: '自費活動 A',
    description: '自由選擇感興趣的活動，可分組進行，晚上集合用餐。',
    highlights: ['安通國家公園', '叢林騎象', '泰式烹飪課'],
    meal: ['🍳 早餐', '🥗 午餐自理', '🍽️ 晚餐自理'],
    coverImage: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=600&q=80',
  },
  {
    day: 5,
    date: '9/2（二）',
    type: '自由活動',
    icon: '🏄',
    title: '自費活動 B · 日落巡航',
    description: '最後一個完整自由日，建議傍晚參與日落風帆巡航，看夕陽最美的蘇梅。',
    highlights: ['日落風帆巡航', '深海海釣', 'Spa 套餐'],
    meal: ['🍳 早餐', '🥗 午餐自理', '🍽️ 晚餐自理'],
    coverImage: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=600&q=80',
  },
  {
    day: 6,
    date: '9/3（三）',
    type: '返程日',
    icon: '🏠',
    title: '返程 · 回到台灣',
    description: '清晨退房前往機場，曼谷轉機，下午抵達台北，結束完美假期。',
    highlights: ['05:30 退房出發', '09:15 蘇梅起飛', '18:00 抵達台北'],
    meal: ['🍱 早餐盒外帶', '✈️ 機上', '🍽️ 曼谷轉機午餐'],
    coverImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
  },
]

const flightInfo = {
  outbound: [
    { segment: '去程第一段', flight: '曼谷航空', route: 'TPE → BKK', time: '09:25 → 12:10' },
    { segment: '去程第二段', flight: '曼谷航空', route: 'BKK → USM', time: '15:30 → 16:35' },
  ],
  return: [
    { segment: '回程第一段', flight: '曼谷航空', route: 'USM → BKK', time: '09:15 → 10:30' },
    { segment: '回程第二段', flight: '曼谷航空', route: 'BKK → TPE', time: '13:20 → 18:00' },
  ],
}

export function TourProposalItinerary() {
  return (
    <section className="space-y-20">
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
          Itinerary
        </span>
        <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          行程總覽
        </h2>
        <p className="text-muted-foreground text-base">6 天 5 夜完整時間表</p>
      </motion.div>

      {/* 行程卡片網格 */}
      <div className="grid md:grid-cols-2 gap-8">
        {itineraryDays.map((day, index) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            className="group"
          >
            <div className="grid lg:grid-cols-12 gap-0 bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg"
              style={{
                borderColor: 'rgba(201,170,124,0.15)',
              }}
            >
              {/* 左：日期區塊 */}
              <div className="lg:col-span-3 relative"
                style={{
                  background: `linear-gradient(135deg, #1a4a5e 0%, #2d6a7a 100%)`,
                }}
              >
                <div className="p-6 h-full flex flex-col items-center justify-center text-white">
                  <span
                    className="text-xs font-bold tracking-widest mb-2"
                    style={{ color: 'rgba(201,170,124,0.8)' }}
                  >
                    DAY
                  </span>
                  <span className="text-4xl font-bold mb-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                    {day.day}
                  </span>
                  <span className="text-sm text-white/70">{day.date}</span>

                  {/* 類型標籤 */}
                  <span className={`
                    mt-3 text-xs px-3 py-1 rounded-full font-medium
                    ${day.type === '自由活動' ? 'bg-[#c9aa7c] text-[#1a1a1a]' : 'bg-white/20 text-white'}
                    ${day.type === '返程日' ? 'bg-[#c08374] text-white' : ''}
                  `}>
                    {day.type}
                  </span>
                </div>
              </div>

              {/* 中：內容 */}
              <div className="lg:col-span-6 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${LUXURY.secondary}15` }}>
                    {day.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                      {day.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{day.description}</p>

                    {/* 高亮標籤 */}
                    <div className="flex flex-wrap gap-2">
                      {day.highlights.slice(0, 2).map((h, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: `${LUXURY.secondary}10`,
                            color: LUXURY.secondary,
                            border: `1px solid ${LUXURY.secondary}20`,
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 右：圖片 */}
              <div className="lg:col-span-3 relative overflow-hidden">
                <img
                  src={day.coverImage}
                  alt={day.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 航班資訊 */}
      <motion.div
        className="bg-card rounded-2xl shadow-lg border overflow-hidden relative"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* 左側強調線 */}
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: LUXURY.secondary }} />

        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${LUXURY.secondary}15` }}>
              <span className="text-2xl">✈️</span>
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: LUXURY.secondary }}>
                Flight Details
              </span>
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>航班資訊</h3>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 去程 */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: LUXURY.secondary }}>
                去程 — 8/29（五）
              </h4>
              <div className="space-y-3">
                {flightInfo.outbound.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg"
                    style={{
                      backgroundColor: `${LUXURY.secondary}05`,
                      border: `1px solid ${LUXURY.secondary}15`,
                    }}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{f.segment}</p>
                      <p className="text-base font-medium">{f.route}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: LUXURY.primary }}>{f.time}</p>
                      <p className="text-xs text-muted-foreground">{f.flight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 回程 */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: LUXURY.secondary }}>
                回程 — 9/3（三）
              </h4>
              <div className="space-y-3">
                {flightInfo.return.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg"
                    style={{
                      backgroundColor: `${LUXURY.secondary}05`,
                      border: `1px solid ${LUXURY.secondary}15`,
                    }}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{f.segment}</p>
                      <p className="text-base font-medium">{f.route}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: LUXURY.primary }}>{f.time}</p>
                      <p className="text-xs text-muted-foreground">{f.flight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}