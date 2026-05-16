'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TourPageData, HotelInfo } from '@/app/(main)/tours/_types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

import { LUXURY } from './utils/luxuryTokens'

interface TourHotelsSectionLuxuryProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

export function TourHotelsSectionLuxury({ data, viewMode }: TourHotelsSectionLuxuryProps) {
  const isMobile = viewMode === 'mobile'
  const hotels = data.hotels || []

  if (!data.showHotels || hotels.length === 0) return null

  const isSingleHotel = hotels.length === 1

  return (
    <section className={isMobile ? 'py-12' : 'py-24'} style={{ backgroundColor: '#151515' }}>
      <div className={isMobile ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* 標題區 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span
            className="block mb-2 italic"
            style={{
              color: LUXURY.secondary,
              fontFamily: LUXURY.font.serif,
              fontSize: isMobile ? '1rem' : '1.125rem',
            }}
          >
            Rest & Relax
          </span>
          <h2
            className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}
            style={{
              color: '#ECECEC',
              fontFamily: LUXURY.font.serif,
            }}
          >
            {TOURS_LABELS.LABEL_4386}
          </h2>
        </motion.div>

        {/* 單一飯店：左右佈局 */}
        {isSingleHotel && !isMobile ? (
          <SingleHotelLayout hotel={hotels[0]} />
        ) : (
          /* 多個飯店：網格佈局 */
          <div
            className={`grid ${
              isMobile
                ? 'grid-cols-1 gap-8'
                : hotels.length === 2
                  ? 'md:grid-cols-2 gap-8 max-w-4xl mx-auto'
                  : hotels.length === 3
                    ? 'md:grid-cols-3 gap-8'
                    : 'md:grid-cols-2 lg:grid-cols-4 gap-8'
            }`}
          >
            {hotels.map((hotel, index) => (
              <HotelCard key={index} hotel={hotel} isMobile={isMobile} delay={index * 0.1} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// 單一飯店佈局（左圖右文）
function SingleHotelLayout({ hotel }: { hotel: HotelInfo }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 收集所有圖片
  const allImages: string[] = []
  if (hotel.images && hotel.images.length > 0) {
    allImages.push(...hotel.images.filter(Boolean))
  } else if (hotel.image) {
    allImages.push(hotel.image)
  }

  const hasMultipleImages = allImages.length > 1
  const currentImage = allImages[currentIndex] || null

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1))
  }

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto"
    >
      {/* 左側：圖片輪播 */}
      <div
        className="relative aspect-[4/3] rounded-lg overflow-hidden group"
        style={{ boxShadow: LUXURY.shadow.frame }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={hotel.name || TOURS_LABELS.HOTEL}
            className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: LUXURY.text }}
          >
            <span className="text-white/50 text-sm">{TOURS_LABELS.EMPTY_2912}</span>
          </div>
        )}

        {/* 遮罩 */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors pointer-events-none" />

        {/* 左右切換按鈕 */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label={TOURS_LABELS.PREV}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label={TOURS_LABELS.NEXT}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            {/* 圖片指示器 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={e => {
                    e.stopPropagation()
                    setCurrentIndex(idx)
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-card w-6' : 'bg-card/50 hover:bg-card/80'
                  }`}
                  aria-label={`${TOURS_LABELS.SWITCH_TO_PREFIX}${idx + 1}${TOURS_LABELS.SWITCH_TO_SUFFIX}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 右側：文字說明 */}
      <div className="space-y-6">
        <div>
          <span
            className="text-sm uppercase tracking-widest block mb-2"
            style={{ color: LUXURY.secondary }}
          >
            Featured Stay
          </span>
          <h3
            className="text-3xl font-bold mb-4"
            style={{
              color: '#ECECEC',
              fontFamily: LUXURY.font.serif,
            }}
          >
            {hotel.name || TOURS_LABELS.SELECTED_HOTEL}
          </h3>

          {/* 分隔線 */}
          <div className="w-16 h-0.5 mb-6" style={{ backgroundColor: LUXURY.secondary }} />
        </div>

        {hotel.description && (
          <p className="text-base leading-relaxed" style={{ color: '#B2BEC3' }}>
            {hotel.description}
          </p>
        )}

        {/* 圖片數量提示 */}
        {hasMultipleImages && (
          <p className="text-xs" style={{ color: LUXURY.muted }}>
            {TOURS_LABELS.PHOTO_COUNT_PREFIX}
            {allImages.length}
            {TOURS_LABELS.PHOTO_COUNT_SUFFIX}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// 飯店卡片組件（多個飯店時使用）
function HotelCard({
  hotel,
  isMobile,
  delay,
}: {
  hotel: HotelInfo
  isMobile: boolean
  delay: number
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 收集所有圖片：優先使用 images 陣列，否則用 image
  const allImages: string[] = []
  if (hotel.images && hotel.images.length > 0) {
    allImages.push(...hotel.images.filter(Boolean))
  } else if (hotel.image) {
    allImages.push(hotel.image)
  }

  const hasMultipleImages = allImages.length > 1
  const currentImage = allImages[currentIndex] || null

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1))
  }

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="group cursor-pointer"
    >
      {/* 圖片區 */}
      <div
        className="relative h-64 rounded-md overflow-hidden mb-6"
        style={{ boxShadow: LUXURY.shadow.frame }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={hotel.name || TOURS_LABELS.HOTEL}
            className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: LUXURY.text }}
          >
            <span className="text-white/50 text-sm">{TOURS_LABELS.NO_IMAGE}</span>
          </div>
        )}

        {/* 遮罩 */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors pointer-events-none" />

        {/* 左右切換按鈕 - 只有多張圖片時顯示 */}
        {hasMultipleImages && (
          <>
            {/* 左箭頭 */}
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label={TOURS_LABELS.PREV}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>

            {/* 右箭頭 */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label={TOURS_LABELS.NEXT}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>

            {/* 圖片指示器 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={e => {
                    e.stopPropagation()
                    setCurrentIndex(idx)
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-card w-4' : 'bg-card/50 hover:bg-card/80'
                  }`}
                  aria-label={`${TOURS_LABELS.SWITCH_TO_PREFIX}${idx + 1}${TOURS_LABELS.SWITCH_TO_SUFFIX}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 文字區 */}
      <div className="text-center px-2">
        <h3
          className={`font-medium mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}
          style={{
            color: '#ECECEC',
            fontFamily: LUXURY.font.serif,
          }}
        >
          {hotel.name || TOURS_LABELS.SELECTED_HOTEL}
        </h3>

        {/* 分隔線 */}
        <div className="w-8 h-px mx-auto mb-3" style={{ backgroundColor: LUXURY.secondary }} />

        {/* 描述 */}
        {hotel.description && (
          <p className="text-xs leading-relaxed" style={{ color: '#B2BEC3' }}>
            {hotel.description}
          </p>
        )}
      </div>
    </motion.div>
  )
}
