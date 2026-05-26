'use client'

/**
 * 三代同堂提案 - 飯店介紹
 * ANA InterContinental Beppu Resort & Spa by IHG
 */

import { motion } from 'framer-motion'

export function FamilyProposalHotels() {
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
          <h2
            className="text-5xl lg:text-6xl font-bold"
            style={{ fontFamily: 'Noto Serif TC, serif' }}
          >
            精選住宿
          </h2>
        </motion.div>

        {/* ANA InterContinental Beppu Resort */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid lg:grid-cols-2 gap-0 border"
          style={{ borderColor: '#E5E5E5' }}
        >
          {/* 圖片 */}
          <div className="relative" style={{ minHeight: '500px' }}>
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
              alt="ANA InterContinental Beppu Resort & Spa"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-6 left-6 px-4 py-2" style={{ backgroundColor: '#8B7355' }}>
              <span className="text-xs tracking-[0.15em] uppercase text-white">方案主軸</span>
            </div>
          </div>

          {/* 內容 */}
          <div className="p-12 flex flex-col justify-center">
            <span
              className="text-xs tracking-[0.2em] uppercase mb-2"
              style={{ fontFamily: 'system-ui', color: '#8B7355' }}
            >
              Day 3 — Day 5 · 3晚
            </span>
            <h3 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              ANA InterContinental Beppu Resort
            </h3>
            <p
              className="text-lg mb-4"
              style={{ fontFamily: 'Noto Serif TC, serif', color: '#8B7355' }}
            >
              & Spa by IHG
            </p>
            <p className="text-sm mb-6" style={{ color: '#666' }}>
              大分縣別府市 · 五星級奢華溫泉度假酒店
            </p>

            <div className="mb-6">
              <p className="text-base leading-relaxed" style={{ color: '#444' }}>
                座落於明礬溫泉附近的山坡高處，融合現代奢華與傳統日本溫泉文化。能俯瞰別府灣、翠綠山巒以及市區內裊裊升起的溫泉煙霧景致。榮獲米其林指南「米其林一星級鑰匙（One
                MICHELIN Key）」肯定。
              </p>
            </div>

            {/* 特色 */}
            <div className="flex flex-wrap gap-2 mb-8">
              {['米其林一星級鑰匙', '五星級奢華', '溫泉度假', '海灣景觀', 'IHG 品牌'].map(
                (h, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1 border"
                    style={{ borderColor: '#ddd', color: '#666' }}
                  >
                    {h}
                  </span>
                )
              )}
            </div>
          </div>
        </motion.div>

        {/* 飯店特色說明 */}
        <motion.div
          className="mt-16 p-8 border-l-4"
          style={{ borderColor: '#8B7355', backgroundColor: 'rgba(139,115,85,0.03)' }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-xl font-bold mb-4" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            為什麼推薦 ANA InterContinental Beppu Resort
          </h4>
          <ul className="space-y-3">
            {[
              '米其林一星級鑰匙肯定，品質有保障',
              '三代同堂都能找到適合的活動：溫泉設施、景觀湯屋、周邊散步',
              '小孩可以盡情玩水，大人在海灣景觀中放鬆',
              '爺爺奶奶可以在溫泉中舒緩身心，不需要奔波遠行',
              '五星級 IHG 品牌，服務品質頂級',
              '別府距離福岡約2小時車程，移動距離適中',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-base" style={{ color: '#444' }}>
                <span
                  className="flex-shrink-0 w-1 h-1 mt-2"
                  style={{ backgroundColor: '#8B7355' }}
                />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* 博多都酒店 */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8" style={{ backgroundColor: '#6B7B8B' }} />
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              Day 1 — Day 2 · 先行飯店
            </h3>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="border p-8" style={{ borderColor: '#E5E5E5' }}>
              <span
                className="text-xs tracking-[0.2em] uppercase block mb-2"
                style={{ fontFamily: 'system-ui', color: '#6B7B8B' }}
              >
                Day 1 — Day 2
              </span>
              <h4 className="text-xl font-bold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                The Miyako Hotel
              </h4>
              <p
                className="text-sm mb-4"
                style={{ fontFamily: 'Noto Serif TC, serif', color: '#6B7B8B' }}
              >
                博多都酒店
              </p>
              <p className="text-sm mb-4" style={{ color: '#666' }}>
                JR博多站前，位置極佳。天然溫泉大浴場，評價9.4。
              </p>
              <p className="text-sm" style={{ color: '#666' }}>
                交通便利，適合作為旅程起點。
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
