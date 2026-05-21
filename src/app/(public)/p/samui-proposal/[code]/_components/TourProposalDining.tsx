'use client'

/**
 * 蘇梅島提案 - 團體晚餐推薦（Luxury 版）
 * 設計參考：DayCardContent.tsx + TourFeaturesSectionLuxury.tsx
 */

import { motion } from 'framer-motion'

const LUXURY = {
  primary: '#2C5F4D',
  secondary: '#C69C6D',
  accent: '#8F4F4F',
  background: '#FDFBF7',
}

const dinnerOptions = [
  {
    day: 1,
    dayLabel: 'Day 1',
    date: '8/29（五）',
    venue: 'Sheraton Samui Resort',
    restaurant: 'The Harbor Restaurant',
    type: '飯店內',
    cuisine: '泰式海鮮 + 國際料理',
    pricePerPerson: 1800,
    highlight: '落地玻璃面海景觀，抵達日輕鬆用餐',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  },
  {
    day: 2,
    dayLabel: 'Day 2',
    date: '8/30（六）',
    venue: 'Sheraton 私人海灘',
    restaurant: '海灘 BBQ 包場',
    type: '沙灘包場',
    cuisine: '泰式炭烤海鮮 BBQ',
    pricePerPerson: 2000,
    highlight: 'FIRE SHOW 火舞表演（可加購）',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80',
  },
  {
    day: 3,
    dayLabel: 'Day 3',
    date: '8/31（日）',
    venue: 'Sala Samui 園區 / 周邊',
    restaurant: 'Sala Samui 主餐廳',
    type: '飯店內',
    cuisine: '泰式 + 國際料理 Blend',
    pricePerPerson: 1800,
    highlight: '最後一晚全包日，可豐盛一點',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  },
]

export function TourProposalDining() {
  const totalPerPerson = dinnerOptions.reduce((sum, d) => sum + d.pricePerPerson, 0)
  const totalBudget = totalPerPerson * 14

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
          Dining
        </span>
        <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          團體晚餐推薦
        </h2>
        <p className="text-muted-foreground text-base">已含在基礎費用中，Day 4、5 自由活動各自負擔</p>
      </motion.div>

      {/* 晚餐卡片 */}
      <div className="space-y-6">
        {dinnerOptions.map((dinner, index) => (
          <motion.div
            key={dinner.day}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15, duration: 0.6 }}
            className="group overflow-hidden rounded-2xl border bg-card"
            style={{
              borderColor: 'rgba(201,170,124,0.15)',
            }}
          >
            <div className="grid lg:grid-cols-12">
              {/* 左側日期區塊 */}
              <div
                className="lg:col-span-2 relative flex flex-col items-center justify-center p-6"
                style={{
                  background: `linear-gradient(135deg, #1a4a5e 0%, #2d6a7a 100%)`,
                }}
              >
                <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(201,170,124,0.8)' }}>
                  {dinner.dayLabel}
                </span>
                <span className="text-xl font-bold text-white mt-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                  {dinner.date}
                </span>
                <span className={`
                  mt-3 text-xs px-3 py-1 rounded-full
                  ${dinner.type === '飯店內' ? 'bg-white/20 text-white' : 'bg-[#c9aa7c] text-[#1a1a1a]'}
                `}>
                  {dinner.type}
                </span>
              </div>

              {/* 圖片 */}
              <div className="lg:col-span-3 relative overflow-hidden h-48 lg:h-auto">
                <img
                  src={dinner.image}
                  alt={dinner.restaurant}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
              </div>

              {/* 內容 */}
              <div className="lg:col-span-7 p-6 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                      {dinner.restaurant}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">{dinner.venue}</p>
                    <p className="text-sm text-muted-foreground mb-2">{dinner.cuisine}</p>
                    <p className="text-sm font-medium" style={{ color: LUXURY.secondary }}>
                      ✨ {dinner.highlight}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">每人</p>
                    <p className="text-2xl font-bold" style={{ color: LUXURY.secondary }}>
                      {dinner.pricePerPerson.toLocaleString()} ฿
                    </p>
                    <p className="text-xs text-muted-foreground">
                      14人 = {(dinner.pricePerPerson * 14).toLocaleString()} ฿
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 預算合計 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex items-center justify-between p-6 rounded-xl border"
        style={{
          backgroundColor: `${LUXURY.secondary}08`,
          borderColor: `${LUXURY.secondary}20`,
        }}
      >
        <div>
          <h3 className="text-lg font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            晚餐預算合計
          </h3>
          <p className="text-sm text-muted-foreground">3晚 × 14人 × 2,000฿</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">已含在基礎費用中</p>
          <p className="text-2xl font-bold" style={{ color: LUXURY.secondary }}>
            {totalBudget.toLocaleString()} ฿
          </p>
          <p className="text-sm text-muted-foreground">每人攤提 {totalPerPerson.toLocaleString()} ฿</p>
        </div>
      </motion.div>

      {/* Day 4、5 自由用餐建議 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="rounded-2xl border p-8"
        style={{
          backgroundColor: `${LUXURY.secondary}05`,
          borderColor: `${LUXURY.secondary}20`,
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.secondary}15` }}>
            <span className="text-xl">🍜</span>
          </div>
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            Day 4、5 自由活動用餐建議
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: LUXURY.secondary }}>
              蘇梅島平價美食推薦
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { name: 'Khun Jeed Yung', desc: '泰南菜', price: '~600-900฿' },
                { name: 'Shun Bla Bla', desc: '海鮮合菜', price: '~500-800฿' },
                { name: "Coco Tam's", desc: '網紅沙灘餐廳', price: '~600-1,000฿' },
              ].map((r) => (
                <li key={r.name} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: LUXURY.secondary }} />
                  <div>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">（{r.desc}）</span>
                    <span className="ml-1" style={{ color: LUXURY.secondary }}>{r.price}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: LUXURY.secondary }}>
              蘇梅島中高價餐廳
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { name: 'The Cliff Bar & Grill', desc: '懸崖海景' },
                { name: 'Prego', desc: '義式，Sheraton 對面' },
                { name: 'Buddha Asian', desc: '亞洲 Fusion' },
              ].map((r) => (
                <li key={r.name} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: LUXURY.secondary }} />
                  <div>
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-1 text-muted-foreground">（{r.desc}）</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  )
}