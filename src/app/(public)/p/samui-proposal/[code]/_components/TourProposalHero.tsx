'use client'

/**
 * 蘇梅島提案 - Luxury Hero
 * 設計參考：TourHeroLuxury.tsx + luxuryTokens.ts
 */

import { motion } from 'framer-motion'

export function TourProposalHero() {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: '38rem' }}>
      {/* 背景漸層 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a5e] via-[#234d5e] to-[#2d6a7a]" />

      {/* 光暈裝飾（Luxury blur 效果） */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: '#c9aa7c' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[25rem] h-[25rem] rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: '#c9aa7c' }}
        />
        <div
          className="absolute top-1/2 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: '#2d6a7a' }}
        />
      </div>

      {/* 波浪底部裝飾 */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 55 720 50C840 45 960 45 1080 50C1200 55 1320 65 1380 70L1440 75V120H0Z"
            fill="#FDFBF7"
          />
        </svg>
      </div>

      {/* 主要內容 */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-32">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* 左側：文字內容（5格） */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* 標籤膠囊 */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(201,170,124,0.3)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: '#c9aa7c' }}
              />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ fontFamily: 'Noto Serif TC, serif', color: '#c9aa7c' }}
              >
                2026 夏季限定
              </span>
            </div>

            {/* 主標題 */}
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
              <span style={{ fontFamily: 'Noto Serif TC, serif' }}>
                泰國蘇梅島
              </span>
              <br />
              <span style={{ color: '#c9aa7c' }}>6 天 5 夜包島之旅</span>
            </h1>

            {/* 底線裝飾 */}
            <div className="relative inline-block mb-8">
              <span
                className="absolute -bottom-1 left-0 w-full h-3 -rotate-1 opacity-30"
                style={{ backgroundColor: '#c9aa7c' }}
              />
              <p className="relative text-lg text-white/80 italic"
                 style={{ fontFamily: 'Noto Serif TC, serif' }}>
                Koh Samui Private Island Experience
              </p>
            </div>

            {/* 快捷資訊 */}
            <div className="flex flex-wrap items-center gap-4">
              <InfoBadge icon="📅" text="8/29 — 9/3" />
              <InfoBadge icon="👥" text="14人包島" />
              <InfoBadge icon="✈️" text="曼谷轉機" />
            </div>
          </motion.div>

          {/* 右側：主視覺圖（7格） */}
          <motion.div
            className="lg:col-span-7 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            {/* 主圖片框 */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                height: '28rem lg:h-[32rem]',
              }}
            >
              {/* 蘇梅島圖片（placeholder） */}
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80"
                alt="蘇梅島海灘"
                className="w-full h-full object-cover"
              />

              {/* 漸層遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* 浮動資訊卡 */}
              <motion.div
                className="absolute bottom-6 right-6 p-5 rounded-xl backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#c9aa7c/15' }}
                  >
                    <span className="text-lg">🏝️</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      出發日期
                    </p>
                    <p className="text-lg font-bold" style={{ color: '#2d6a7a' }}>
                      2026/08/29
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 裝飾圓圈 */}
            <div
              className="absolute -top-4 -right-4 w-20 h-20 rounded-full border-2"
              style={{
                borderColor: 'rgba(201,170,124,0.4)',
                backgroundColor: 'rgba(201,170,124,0.05)',
              }}
            />
            <div
              className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full border"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function InfoBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <span>{icon}</span>
      <span className="text-sm font-medium text-white">{text}</span>
    </div>
  )
}