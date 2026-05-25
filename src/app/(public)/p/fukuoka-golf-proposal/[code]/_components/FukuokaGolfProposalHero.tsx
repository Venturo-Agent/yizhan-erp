'use client'

/**
 * 福岡高爾夫提案 - Luxury Hero
 * 設計參考：manhattan-editorial 風格 + Venturo 提案慣例
 */

import { motion } from 'framer-motion'

const LUXURY = {
  primary: '#1a4a5e',
  secondary: '#c9aa7c',
  accent: '#8f4f4f',
  background: '#FDFBF7',
}

export function FukuokaGolfProposalHero() {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: '42rem' }}>
      {/* 背景漸層 - 福岡夜色 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b3a4b] to-[#2d5a6b]" />

      {/* 光暈裝飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: '#c9aa7c' }}
        />
        <div
          className="absolute bottom-20 left-1/4 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: '#c9aa7c' }}
        />
        <div
          className="absolute top-1/3 left-0 w-80 h-80 rounded-full blur-3xl opacity-8"
          style={{ backgroundColor: '#2d5a6b' }}
        />
      </div>

      {/* 頂部裝飾線 */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: '#c9aa7c' }} />

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
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-36">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* 左側：文字內容 */}
          <motion.div
            className="lg:col-span-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* 標籤膠囊 */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
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
                2025 秋季限定
              </span>
            </div>

            {/* 主標題 */}
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
              <span style={{ fontFamily: 'Noto Serif TC, serif' }}>
                日本福岡
              </span>
              <br />
              <span style={{ color: '#c9aa7c' }}>高爾夫深度之旅</span>
            </h1>

            {/* 英文副標 */}
            <div className="relative inline-block mb-8">
              <span
                className="absolute -bottom-1 left-0 w-full h-3 -rotate-1 opacity-30"
                style={{ backgroundColor: '#c9aa7c' }}
              />
              <p className="relative text-lg text-white/70 italic"
                 style={{ fontFamily: 'Noto Serif TC, serif' }}>
                Fukuoka Premium Golf & Cultural Experience
              </p>
            </div>

            {/* 描述 */}
            <p className="text-lg text-white/70 mb-8 max-w-lg leading-relaxed">
              為您策劃的頂級福岡行程。打球之餘，太太們有專屬的深度文化體驗。
              入住精選溫泉旅館，第三晚換宿，第四天盡情享受飯店設施。
            </p>

            {/* 快捷資訊 */}
            <div className="flex flex-wrap items-center gap-4">
              <InfoBadge icon="📅" text="10/12 — 10/16" />
              <InfoBadge icon="👥" text="16人成行" />
              <InfoBadge icon="🏌️" text="8人打球" />
              <InfoBadge icon="⛩️" text="太太專屬行程" />
            </div>
          </motion.div>

          {/* 右側：主視覺圖 */}
          <motion.div
            className="lg:col-span-6 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            {/* 主圖片框 */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                height: '28rem lg:h-[32rem]',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80"
                alt="福岡城市夜景"
                className="w-full h-full object-cover"
              />

              {/* 漸層遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* 浮動資訊卡 */}
              <motion.div
                className="absolute bottom-6 left-6 p-5 rounded-xl backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#c9aa7c15' }}
                  >
                    <span className="text-lg">⛳</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      出發日期
                    </p>
                    <p className="text-lg font-bold" style={{ color: '#1a4a5e' }}>
                      2025/10/12
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 第二張浮動卡 */}
              <motion.div
                className="absolute top-6 right-6 p-4 rounded-xl backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(201,170,124,0.9)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <p className="text-sm font-bold text-white">5 天 4 夜</p>
                <p className="text-xs text-white/80">深度體驗</p>
              </motion.div>
            </div>

            {/* 裝飾圓圈 */}
            <div
              className="absolute -top-4 -left-4 w-24 h-24 rounded-full border-2"
              style={{
                borderColor: 'rgba(201,170,124,0.4)',
                backgroundColor: 'rgba(201,170,124,0.05)',
              }}
            />
            <div
              className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full border"
              style={{ borderColor: 'rgba(255,255,255,0.15)' }}
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
