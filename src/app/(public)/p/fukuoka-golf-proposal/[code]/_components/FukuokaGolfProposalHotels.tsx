'use client'

/**
 * 福岡高爾夫提案 - 飯店與費用說明
 * Day 1-3: The Ritz-Carlton Fukuoka
 * Day 3-5: 溫泉旅館（界別府 或 Nociume 浮羽夢之里）
 */

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const LUXURY = {
  primary: '#1a4a5e',
  secondary: '#c9aa7c',
  accent: '#8f4f4f',
  background: '#FDFBF7',
}

const hotels = [
  {
    name: 'The Ritz-Carlton Fukuoka',
    location: '博多車站 / 天神地區',
    nights: '3 晚（Day 1-3）',
    checkIn: '10/12',
    checkOut: '10/15',
    roomType: 'Deluxe Room',
    view: '市景或部分海景',
    pricePerNight: '¥85,000-120,000/間',
    totalRooms: 8,
    description: '福岡最頂級的國際五星，位於 Canal City 旁，距離機場僅 10 分鐘車程。飯店內有法式餐廳、SPA、室內泳池。',
    highlights: ['Ritz-Carlton SPA', '法式餐廳', '室內溫水泳池', '管家服務'],
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    isPrimary: true,
  },
  {
    name: 'Nociume 浮羽夢之里',
    location: '浮羽 / 由布院地區',
    nights: '2 晚（Day 3-5）',
    checkIn: '10/15',
    checkOut: '10/16',
    roomType: '和洋室 suite',
    view: '山水田園景觀',
    pricePerNight: '¥120,000-180,000/間',
    totalRooms: 8,
    description: '隱藏在浮羽山間的秘境溫泉旅館，每間房都有私人溫泉。晚餐為主廚特製會席，早餐使用當地有機食材。',
    highlights: ['私人溫泉入戶', '米其林等級會席', '星空觀測台', '手作體驗工房'],
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    isPrimary: false,
  },
]

const pricingDetails = [
  {
    category: '機票',
    icon: '✈️',
    items: [
      { label: '台北 ←→ 福岡 來回機票（16人）', price: 280000, note: '商務艙可加價升級' },
    ],
  },
  {
    category: '飯店 Day 1-3',
    icon: '🏨',
    items: [
      { label: 'The Ritz-Carlton Fukuoka（3晚 × 8間）', price: 2400000, note: '含早餐' },
    ],
  },
  {
    category: '飯店 Day 3-5',
    icon: '♨️',
    items: [
      { label: 'Nociume 浮羽夢之里（2晚 × 8間）', price: 2880000, note: '含早晚餐、溫泉' },
    ],
  },
  {
    category: '高爾夫',
    icon: '⛳',
    items: [
      { label: '第一回合球場費（8人含球車）', price: 120000, note: 'The Players Club 糸島' },
      { label: '第二回合球場費（8人含球車）', price: 100000, note: '久山高原 Golf' },
      { label: '球場午餐 × 2天', price: 48000, note: '每人 ¥3,000' },
    ],
  },
  {
    category: '包車',
    icon: '🚐',
    items: [
      { label: '全程 16人座小巴（5天）', price: 150000, note: '含過路費、停車費' },
    ],
  },
  {
    category: '餐食',
    icon: '🍽️',
    items: [
      { label: '團體晚餐（Day 1-4）', price: 120000, note: '含酒精飲料' },
      { label: '溫泉旅館會席晚餐', price: 160000, note: '16人' },
    ],
  },
  {
    category: '太太行程',
    icon: '💆',
    items: [
      { label: 'Ritz-Carlton SPA（8人）', price: 80000, note: '每人 90 分鐘療程' },
      { label: '柳川遊船 + 鰻魚飯', price: 24000, note: '8人' },
      { label: '由布院甜點之旅', price: 16000, note: '含特色甜點' },
    ],
  },
]

function AccordionItem({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <motion.div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: isOpen ? LUXURY.secondary : 'rgba(201,170,124,0.15)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 transition-colors"
        style={{
          backgroundColor: isOpen ? `${LUXURY.secondary}08` : 'transparent',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{
              backgroundColor: `${LUXURY.secondary}15`,
              color: LUXURY.secondary,
            }}
          >
            {icon}
          </div>
          <span className="text-base font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${LUXURY.secondary}15` }}
        >
          <ChevronDown className="w-4 h-4" style={{ color: LUXURY.secondary }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t" style={{ borderColor: `${LUXURY.secondary}15` }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

import { AnimatePresence } from 'framer-motion'

export function FukuokaGolfProposalHotels() {
  const baseTotal = pricingDetails.reduce(
    (sum, category) => sum + category.items.reduce((s, item) => s + item.price, 0),
    0
  )
  const perPersonTotal = Math.round(baseTotal / 16)

  return (
    <section className="space-y-20">
      {/* 標題 */}
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
          Accommodation
        </span>
        <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          精選住宿
        </h2>
        <p className="text-muted-foreground text-base">
          第三晚換宿，體驗從都會五星到秘境溫泉的轉換
        </p>
      </motion.div>

      {/* 飯店卡片 */}
      <div className="space-y-8">
        {hotels.map((hotel, index) => (
          <motion.div
            key={hotel.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2, duration: 0.6 }}
            className="group overflow-hidden rounded-2xl border"
            style={{
              borderColor: hotel.isPrimary ? LUXURY.secondary : LUXURY.accent,
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            }}
          >
            <div className="grid lg:grid-cols-12">
              {/* 圖片 */}
              <div className="lg:col-span-5 relative h-64 lg:h-auto overflow-hidden">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />

                {/* 換宿標籤 */}
                {!hotel.isPrimary && (
                  <div
                    className="absolute top-4 left-4 px-4 py-2 rounded-full"
                    style={{ backgroundColor: LUXURY.secondary }}
                  >
                    <span className="text-sm font-bold text-white">🔄 第三晚換宿</span>
                  </div>
                )}
              </div>

              {/* 內容 */}
              <div className="lg:col-span-7 p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: hotel.isPrimary ? `${LUXURY.secondary}15` : `${LUXURY.accent}15`,
                        color: hotel.isPrimary ? LUXURY.secondary : LUXURY.accent,
                      }}
                    >
                      {hotel.isPrimary ? '都會五星' : '秘境溫泉'}
                    </span>
                    <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                      {hotel.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      📍 {hotel.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">每晚每間</p>
                    <p className="text-2xl font-bold" style={{ color: LUXURY.secondary }}>
                      {hotel.pricePerNight}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {hotel.description}
                </p>

                {/* 入住資訊 */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${LUXURY.secondary}05` }}>
                    <p className="text-xs text-muted-foreground">入住</p>
                    <p className="text-sm font-bold">{hotel.checkIn}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${LUXURY.secondary}05` }}>
                    <p className="text-xs text-muted-foreground">退房</p>
                    <p className="text-sm font-bold">{hotel.checkOut}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${LUXURY.secondary}05` }}>
                    <p className="text-xs text-muted-foreground">晚數</p>
                    <p className="text-sm font-bold">{hotel.nights}</p>
                  </div>
                </div>

                {/* 亮點 */}
                <div className="flex flex-wrap gap-2">
                  {hotel.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: `${LUXURY.secondary}10`,
                        color: LUXURY.secondary,
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 換宿說明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl p-6 border"
        style={{
          backgroundColor: `${LUXURY.secondary}05`,
          borderColor: `${LUXURY.secondary}20`,
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: LUXURY.secondary }}
          >
            <span className="text-lg">🔄</span>
          </div>
          <div>
            <h4 className="text-lg font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              為什麼第三晚要換宿？
            </h4>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              從繁華的博多都會，換到靜謐的由布院溫泉區。Day 3 下午打完球、太太做完 SPA，
              傍晚搭車約 1.5 小時抵達溫泉旅館。隔天（Day 4）可以在溫泉區悠閒度过，
              先生們可以在飯店享受設施或加打第三回合，太太們探索金麟湖、由布院小鎮。
              這樣的節奏對比，讓旅程更有層次感。
            </p>
          </div>
        </div>
      </motion.div>

      {/* 費用說明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.primary}15` }}
          >
            <span className="text-2xl">💰</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: LUXURY.primary }}>
              Pricing
            </span>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              費用說明
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          {pricingDetails.map((category, index) => (
            <AccordionItem
              key={category.category}
              title={category.category}
              icon={category.icon}
              defaultOpen={index === 0}
            >
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </div>
                    <p className="text-base font-bold" style={{ color: LUXURY.secondary }}>
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionItem>
          ))}
        </div>

        {/* 總計 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${LUXURY.primary} 0%, #2d5a6b 100%)`,
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: '#c9aa7c' }} />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'rgba(201,170,124,0.8)' }}>
                Total
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mt-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                基礎費用合計
              </h3>
              <p className="text-white/60 text-sm mt-2">
                含機票、飯店、高爾夫、包車、團體餐食、太太行程
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl md:text-5xl font-bold text-white">
                ${baseTotal.toLocaleString()}
              </p>
              <p className="text-lg font-bold mt-2" style={{ color: '#c9aa7c' }}>
                每人約 ${perPersonTotal.toLocaleString()} 元
              </p>
            </div>
          </div>
        </motion.div>

        {/* 未含項目 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-6 rounded-xl border"
          style={{
            backgroundColor: `${LUXURY.primary}05`,
            borderColor: `${LUXURY.primary}15`,
          }}
        >
          <h4 className="text-base font-bold mb-3">費用未含</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• 私人消費（SPA 加時、球場私人教練等）</li>
            <li>• 機場行李托運費用</li>
            <li>• 旅平險與醫療險</li>
            <li>• 第三回合球場費用（可加購，約 ¥18,000-25,000/人）</li>
          </ul>
        </motion.div>
      </motion.div>
    </section>
  )
}
