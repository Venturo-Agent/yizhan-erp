'use client'

/**
 * 福岡高爾夫提案 - 飯店與費用說明（Editorial Magazine 版）
 * 無 emoji · 襯線字體 · 雜誌排版
 */

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const pricingDetails = [
  {
    category: '機票',
    items: [
      { label: '台北 ←→ 福岡 來回機票（16人）', price: 280000, note: '經濟艙' },
    ],
  },
  {
    category: '飯店 Day 1-3',
    items: [
      { label: 'The Ritz-Carlton Fukuoka（3晚 × 8間）', price: 2400000, note: '含早餐' },
    ],
  },
  {
    category: '飯店 Day 3-5',
    items: [
      { label: '一壺天（2晚 × 8間）', price: 2880000, note: '含早晚餐、溫泉' },
    ],
  },
  {
    category: '高爾夫',
    items: [
      { label: '第一回合球場費（8人含球車）', price: 120000, note: 'The Players Club 糸島' },
      { label: '第二回合球場費（8人含球車）', price: 100000, note: '久山高原 Golf' },
      { label: '球場午餐 × 2天', price: 48000, note: '每人 ¥3,000' },
    ],
  },
  {
    category: '包車',
    items: [
      { label: '全程 16人座小巴（5天）', price: 150000, note: '含過路費、停車費' },
    ],
  },
  {
    category: '餐食',
    items: [
      { label: '團體晚餐（Day 1-4）', price: 120000, note: '含酒精飲料' },
      { label: '溫泉旅館會席晚餐', price: 160000, note: '16人' },
    ],
  },
  {
    category: '太太行程',
    items: [
      { label: 'Ritz-Carlton SPA（8人）', price: 80000, note: '每人 90 分鐘療程' },
      { label: '柳川遊船 + 鰻魚飯', price: 24000, note: '8人' },
      { label: '由布院甜點之旅', price: 16000, note: '含特色甜點' },
    ],
  },
]

export function FukuokaGolfProposalHotels() {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  const baseTotal = pricingDetails.reduce(
    (sum, category) => sum + category.items.reduce((s, item) => s + item.price, 0),
    0
  )
  const perPersonTotal = Math.round(baseTotal / 16)

  const hotels = [
    {
      name: 'The Ritz-Carlton Fukuoka',
      location: '博多車站 / 天神地區',
      nights: '3 晚',
      period: 'Day 1 — Day 3',
      roomType: 'Deluxe Room',
      pricePerNight: '¥85,000-120,000/間',
      description: '福岡最頂級的國際五星，位於 Canal City 旁，距離機場僅 10 分鐘車程。飯店內有法式餐廳、SPA、室內泳池。',
      highlights: ['Ritz-Carlton SPA', '法式餐廳', '室內溫水泳池', '管家服務'],
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    },
    {
      name: '一壺天',
      location: '由布岳山麓 / 由布院地區',
      nights: '2 晚',
      period: 'Day 3 — Day 5',
      roomType: '獨棟 Villa',
      pricePerNight: '¥120,000-180,000/間',
      description: '隱藏在由布岳山麓的秘境溫泉旅館，獨棟別墅佔地約2,300坪，周圍山林環繞，彷彿深山秘境中的童話村莊。每棟別墅皆配客廳、餐廳、臥室與私人露天溫泉。米其林指南四紅樓推薦。',
      highlights: ['私人露天溫泉入戶', '獨棟 Villa 設計', '米其林指南推薦', '私人管家服務'],
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      isSwap: true,
    },
  ]

  return (
    <section className="py-32" style={{ backgroundColor: '#fff' }}>
      <div className="max-w-6xl mx-auto px-8 lg:px-16">
        {/* 標題 */}
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
            Accommodation
          </span>
          <h2 className="text-5xl lg:text-6xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            精選住宿
          </h2>
          <p className="text-lg mt-4" style={{ color: '#666' }}>
            第三晚換宿，體驗從都會五星到秘境溫泉的轉換
          </p>
        </motion.div>

        {/* 飯店卡片 */}
        <div className="space-y-16 mb-32">
          {hotels.map((hotel, index) => (
            <motion.div
              key={hotel.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.8 }}
              className="grid lg:grid-cols-2 gap-0 border"
              style={{ borderColor: '#E5E5E5' }}
            >
              {/* 圖片 */}
              <div className="relative" style={{ minHeight: '400px' }}>
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {hotel.isSwap && (
                  <div
                    className="absolute top-6 left-6 px-4 py-2"
                    style={{ backgroundColor: '#8B7355' }}
                  >
                    <span className="text-xs tracking-[0.15em] uppercase text-white">
                      換宿
                    </span>
                  </div>
                )}
              </div>

              {/* 內容 */}
              <div className="p-12 flex flex-col justify-center">
                <span
                  className="text-xs tracking-[0.2em] uppercase mb-2"
                  style={{ fontFamily: 'system-ui', color: '#8B7355' }}
                >
                  {hotel.period} · {hotel.nights}
                </span>
                <h3 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                  {hotel.name}
                </h3>
                <p className="text-base mb-6" style={{ color: '#666' }}>{hotel.location}</p>

                <p className="text-base leading-relaxed mb-6" style={{ color: '#444' }}>
                  {hotel.description}
                </p>

                {/* 亮點 */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {hotel.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 border"
                      style={{ borderColor: '#ddd', color: '#666' }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <p className="text-lg font-bold" style={{ color: '#8B7355' }}>
                  {hotel.pricePerNight}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 換宿說明 */}
        <motion.div
          className="mb-32 py-12 border-l-4 pl-8"
          style={{ borderColor: '#8B7355', backgroundColor: 'rgba(139,115,85,0.03)' }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-xl font-bold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            為什麼第三晚要換宿？
          </h4>
          <p className="text-base leading-relaxed" style={{ color: '#666' }}>
            從繁華的博多都會，換到靜謐的由布院溫泉區。Day 3 下午打完球、太太做完 SPA，
            傍晚搭車約 1.5 小時抵達溫泉旅館。隔天（Day 4）可以在溫泉區悠閒度過，
            先生們可以在飯店享受設施或加打第三回合，太太們探索金麟湖、由布院小鎮。
            這樣的節奏對比，讓旅程更有層次感。
          </p>
        </motion.div>

        {/* 費用說明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-16">
            <span
              className="text-xs tracking-[0.3em] uppercase block mb-4"
              style={{ fontFamily: 'system-ui', color: '#8B7355' }}
            >
              Pricing
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              費用說明
            </h2>
          </div>

          {/* Accordion */}
          <div className="space-y-0">
            {pricingDetails.map((category, index) => (
              <div
                key={category.category}
                className="border-t"
                style={{ borderColor: '#E5E5E5' }}
              >
                <button
                  className="w-full flex justify-between items-center py-6 text-left"
                  onClick={() => setOpenAccordion(openAccordion === category.category ? null : category.category)}
                >
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: 'Noto Serif TC, serif' }}
                  >
                    {category.category}
                  </span>
                  <ChevronDown
                    className="w-5 h-5 transition-transform duration-300"
                    style={{
                      color: '#8B7355',
                      transform: openAccordion === category.category ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {openAccordion === category.category && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pb-6"
                  >
                    <div className="space-y-4">
                      {category.items.map((item) => (
                        <div key={item.label} className="flex justify-between items-start py-3 border-b" style={{ borderColor: '#f0f0f0' }}>
                          <div>
                            <p className="text-base">{item.label}</p>
                            <p className="text-sm" style={{ color: '#999' }}>{item.note}</p>
                          </div>
                          <p className="text-lg font-bold ml-8" style={{ color: '#8B7355', fontFamily: 'Noto Serif TC, serif' }}>
                            ${item.price.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* 總計 */}
          <motion.div
            className="mt-16 p-12"
            style={{ backgroundColor: '#1a1a1a' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex justify-between items-end">
              <div>
                <span
                  className="text-xs tracking-[0.2em] uppercase block mb-2"
                  style={{ fontFamily: 'system-ui', color: '#666' }}
                >
                  Total
                </span>
                <h3 className="text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                  基礎費用合計
                </h3>
                <p className="text-sm mt-2" style={{ color: '#666' }}>
                  含機票、飯店、高爾夫、包車、團體餐食、太太行程
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl lg:text-5xl font-bold text-white">
                  ${baseTotal.toLocaleString()}
                </p>
                <p className="text-xl mt-2" style={{ color: '#8B7355', fontFamily: 'Noto Serif TC, serif' }}>
                  每人約 ${perPersonTotal.toLocaleString()} 元
                </p>
              </div>
            </div>
          </motion.div>

          {/* 未含項目 */}
          <div className="mt-12 p-8 border" style={{ borderColor: '#E5E5E5' }}>
            <h4 className="text-base font-bold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>費用未含</h4>
            <ul className="space-y-2 text-sm" style={{ color: '#666' }}>
              <li>私人消費（SPA 加時、球場私人教練等）</li>
              <li>機場行李托運費用</li>
              <li>旅平險與醫療險</li>
              <li>第三回合球場費用（可加購，約 ¥18,000-25,000/人）</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
