'use client'

/**
 * 蘇梅島提案 - 自費活動（Luxury 版）
 * 設計參考：TourFeaturesSectionLuxury.tsx + TourProposalActivities.tsx
 */

import { motion } from 'framer-motion'

const LUXURY = {
  primary: '#2C5F4D',
  secondary: '#C69C6D',
  accent: '#8F4F4F',
  background: '#FDFBF7',
}

const optionalActivities = [
  {
    day: 4,
    name: '安通國家公園',
    icon: '🏝️',
    price: '1,500-2,000',
    unit: '฿/人',
    duration: '全天',
    description:
      '泰國第二大國家公園，由 42 座石灰岩小島組成。以翡翠瀉湖聞名，需划船或爬山才能到達。',
    highlights: ['長尾船巡航小島群', '划 Kayak 探索瀉湖', '登頂俯瞰全景', '海灘野餐午餐'],
    recommendation: '必去',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
  },
  {
    day: 4,
    name: '叢林騎象體驗',
    icon: '🐘',
    price: '1,200-1,500',
    unit: '฿/人',
    duration: '半天',
    description: '在專業象夫帶領下，騎乘亞洲象穿越蘇梅島熱帶雨林，近距離接觸這些溫柔巨獸。',
    highlights: ['60-90分鐘象背上體驗', '餵食互動環節', '參觀象夫村莊'],
    recommendation: '親子友善',
    image: 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=600&q=80',
  },
  {
    day: 4,
    name: '泰式烹飪課程',
    icon: '👨‍🍳',
    price: '800-1,000',
    unit: '฿/人',
    duration: '半天',
    description: '跟當地泰式主廚學習道地泰國菜。從市場採買開始，親手製作 3-4 道經典料理。',
    highlights: ['傳統市場導覽', '學做 3-4 道泰菜', '含午餐', '帶走食譜'],
    recommendation: null,
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80',
  },
  {
    day: 5,
    name: '日落風帆巡航',
    icon: '⛵',
    price: '2,500-3,500',
    unit: '฿/人',
    duration: '下午至傍晚',
    description: '搭乘傳統泰式風帆船出海，在最佳位置觀賞蘇梅島夕陽。含軟性飲料和水果。',
    highlights: ['蘇梅島最佳夕陽觀賞點', '傳統風帆船體驗', '含飲料水果', '海上拍照'],
    recommendation: '壓軸首選',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
  },
  {
    day: 5,
    name: '深海海釣包船',
    icon: '🎣',
    price: '3,000-4,000',
    unit: '฿/全團',
    duration: '半天',
    description: '包船出海深海手線海釣，有機會掉到龍膽石斑、紅鰷等大魚。船家提供魚竿和餌料。',
    highlights: ['一早出海，避開人潮', '手線船竿體驗', '午餐船上現煮魚湯', '14人剛好一船'],
    recommendation: null,
    image: 'https://images.unsplash.com/photo-1544551763-77ef16d0e5f0?w=600&q=80',
  },
  {
    day: 5,
    name: 'Spa 套餐',
    icon: '💆',
    price: '2,500-4,000',
    unit: '฿/人',
    duration: '半天至一天',
    description: '蘇梅島最知名的養生項目。各式泰式按摩、熱石 Spa、香氛療程可選。',
    highlights: ['泰式古法按摩', '熱石 Spa', '香氛精油療程', '半天/一天套餐可選'],
    recommendation: '放鬆首選',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
  },
  {
    day: 5,
    name: 'ATV 越野車',
    icon: '🏎️',
    price: '1,000-1,300',
    unit: '฿/人',
    duration: '1-2 小時',
    description: '駕駛 ATV 越野車穿越蘇梅島山區地形，刺激又安全，有教練帶領。',
    highlights: ['山路叢林越野', '專業教練帶', '含保險', '適合喜歡刺激的人'],
    recommendation: null,
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a2810?w=600&q=80',
  },
  {
    day: 5,
    name: '泰拳體驗課',
    icon: '🥊',
    price: '500-800',
    unit: '฿/人',
    duration: '1-2 小時',
    description: '專業泰拳教練帶領的入門課程，學習基本拳法、踢法和防守姿勢。',
    highlights: ['專業教練指導', '基本拳法教學', '團體對練', '含拳套租借'],
    recommendation: null,
    image: 'https://images.unsplash.com/photo-1544367567-0f29a4952a4d?w=600&q=80',
  },
]

function ActivityCard({
  activity,
  index,
}: {
  activity: (typeof optionalActivities)[0]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group overflow-hidden rounded-2xl border bg-card"
      style={{
        borderColor: 'rgba(201,170,124,0.15)',
      }}
    >
      {/* 圖片區 */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* 標籤 */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {activity.recommendation && (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: LUXURY.secondary }}
            >
              {activity.recommendation}
            </span>
          )}
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#2d6a7a',
            }}
          >
            自費
          </span>
        </div>

        {/* 圖示 */}
        <div
          className="absolute bottom-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center text-2xl backdrop-blur-md"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
        >
          {activity.icon}
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-5">
        <h4 className="text-lg font-bold mb-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          {activity.name}
        </h4>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-muted-foreground">{activity.duration}</span>
          <span className="w-1 h-1 rounded-full bg-muted" />
          <span className="text-lg font-bold" style={{ color: LUXURY.primary }}>
            {activity.price} <span className="text-xs font-normal">{activity.unit}</span>
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{activity.description}</p>

        <div className="space-y-2">
          {activity.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <svg
                className="w-4 h-4 flex-shrink-0"
                style={{ color: LUXURY.secondary }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-muted-foreground">{h}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function TourProposalActivities() {
  const day4Activities = optionalActivities.filter(a => a.day === 4)
  const day5Activities = optionalActivities.filter(a => a.day === 5)

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
          Activities
        </span>
        <h2
          className="text-4xl md:text-5xl font-bold"
          style={{ fontFamily: 'Noto Serif TC, serif' }}
        >
          自費活動詳細內容
        </h2>
        <p className="text-muted-foreground text-base">Day 4、5 自由活動期間自選參加，費用自理</p>
      </motion.div>

      {/* Day 4 */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <motion.div
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#1a4a5e' }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: 'Noto Serif TC, serif' }}
            >
              DAY 4
            </span>
          </motion.div>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(201,170,124,0.3)' }} />
          <span className="text-sm text-muted-foreground">9/1（一）</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {day4Activities.map((activity, i) => (
            <ActivityCard key={activity.name} activity={activity} index={i} />
          ))}
        </div>
      </div>

      {/* Day 5 */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <motion.div
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: LUXURY.secondary }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: 'Noto Serif TC, serif' }}
            >
              DAY 5
            </span>
          </motion.div>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(201,170,124,0.3)' }} />
          <span className="text-sm text-muted-foreground">9/2（二）</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {day5Activities.map((activity, i) => (
            <ActivityCard key={activity.name} activity={activity} index={i + 3} />
          ))}
        </div>
      </div>

      {/* 實用提醒 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="rounded-2xl border p-8"
        style={{
          backgroundColor: `${LUXURY.secondary}05`,
          borderColor: `${LUXURY.secondary}20`,
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.secondary}15` }}
          >
            <span className="text-xl">📋</span>
          </div>
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            實用提醒
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: LUXURY.secondary }}
            >
              預訂建議
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: LUXURY.secondary }}
                />
                旺季（11月-4月）建議提前 2-4 週預訂
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: LUXURY.secondary }}
                />
                可請當地旅行社統一代訂，享團體折扣
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: LUXURY.secondary }}
                />
                預訂時告知 14 人團體，部分活動可包場
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: LUXURY.secondary }}
            >
              天氣注意事項
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: LUXURY.secondary }}
                />
                8月底為雨季尾聲，可能有午後雷陣雨
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: LUXURY.secondary }}
                />
                雨天建議改室內活動（Spa、烹飪課、夜店）
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: LUXURY.secondary }}
                />
                建議攜帶雨具，並注意防曬
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
