'use client'

/**
 * 福岡光明頂提案 - Editorial Magazine Hero
 * 滿版圖片 + 米白漸層一路到 50%
 */

import { motion } from 'framer-motion'

export function FukuokaGolfProposalHero() {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* 滿版圖片 */}
      <div className="absolute inset-0">
        <img
          src="/images/fukuoka-hero.jpg"
          alt="福岡光明頂"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 米白漸層覆蓋到 50% */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, #FAF8F5 0%, #FAF8F5 45%, rgba(250,248,245,0.5) 55%, rgba(250,248,245,0) 70%)',
        }}
      />

      {/* 主要內容 */}
      <div className="relative z-10 h-full flex items-center" style={{ minHeight: '100vh' }}>
        <div className="max-w-6xl mx-auto px-8 lg:px-16 py-24 w-full">
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="mb-8">
              <span
                className="text-xs tracking-[0.3em] uppercase"
                style={{ fontFamily: 'system-ui', color: '#666' }}
              >
                Fukuoka Guangmingding Tour
              </span>
            </div>

            <h1 className="leading-none mb-8" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              <span className="block text-7xl lg:text-8xl xl:text-9xl font-bold text-[#1a1a1a]">
                日本福岡
              </span>
              <span
                className="block text-4xl lg:text-5xl xl:text-6xl font-bold mt-4"
                style={{ color: '#8B7355' }}
              >
                光明頂 · 深度之旅
              </span>
            </h1>

            <div className="mb-8">
              <p className="text-lg" style={{ fontFamily: 'Noto Serif TC, serif', color: '#666' }}>
                頂級福岡行程 · 高球搖擺 · 深度體驗
              </p>
            </div>

            <div className="max-w-lg mb-12">
              <p className="text-base leading-relaxed" style={{ color: '#444' }}>
                為您策劃的頂級福岡行程。揮桿之餘，太太們有專屬的深度文化體驗。
                入住精選五星旅館，第三晚換宿展開溫泉之旅。
              </p>
            </div>

            <div className="flex items-baseline gap-8">
              <InfoBlock label="日期" value="2026.10.12 — 10.16" />
              <InfoBlock label="人數" value="16 人成行" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        className="text-xs tracking-[0.2em] uppercase block mb-1"
        style={{ fontFamily: 'system-ui', color: '#999' }}
      >
        {label}
      </span>
      <span
        className="text-xl lg:text-2xl font-bold block"
        style={{ fontFamily: 'Noto Serif TC, serif' }}
      >
        {value}
      </span>
    </div>
  )
}
