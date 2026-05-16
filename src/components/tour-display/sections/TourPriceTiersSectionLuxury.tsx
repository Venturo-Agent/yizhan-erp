'use client'

import { motion } from 'framer-motion'
import type { TourPageData } from '@/app/(main)/tours/_types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

import { LUXURY } from './utils/luxuryTokens'

interface TourPriceTiersSectionLuxuryProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

// 格式化價格（加千分位逗號）
const formatPrice = (value: string): string => {
  if (!value) return ''
  const numericValue = value.replace(/[^\d]/g, '')
  if (!numericValue) return value
  return Number(numericValue).toLocaleString('en-US')
}

// 根據索引決定卡片主色
const getCardStyle = (index: number) => {
  if (index % 2 === 0) {
    return {
      headerBg: `${LUXURY.secondary}10`,
      headerBorder: `${LUXURY.secondary}20`,
      titleColor: LUXURY.secondary,
    }
  }
  return {
    headerBg: `${LUXURY.primary}05`,
    headerBorder: `${LUXURY.primary}20`,
    titleColor: LUXURY.primary,
  }
}

export function TourPriceTiersSectionLuxury({ data, viewMode }: TourPriceTiersSectionLuxuryProps) {
  const isMobile = viewMode === 'mobile'
  const priceTiers = data.priceTiers

  if (!data.showPriceTiers || !priceTiers || priceTiers.length === 0) {
    return null
  }

  return (
    <section
      className={isMobile ? 'py-12' : 'py-24'}
      style={{ backgroundColor: LUXURY.background }}
    >
      <div className={isMobile ? 'px-4' : 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* 標題區 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span
            className="block mb-2 italic"
            style={{
              color: LUXURY.secondary,
              fontFamily: LUXURY.font.serif,
              fontSize: isMobile ? '1rem' : '1.125rem',
            }}
          >
            Investment
          </span>
          <h2
            className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}
            style={{
              color: LUXURY.text,
              fontFamily: LUXURY.font.serif,
            }}
          >
            {TOURS_LABELS.LABEL_1385}
          </h2>
        </motion.div>

        {/* 價格卡片 */}
        <div
          className={`grid gap-8 ${
            isMobile
              ? 'grid-cols-1'
              : priceTiers.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : 'md:grid-cols-2'
          }`}
        >
          {priceTiers.map((tier, index) => {
            const cardStyle = getCardStyle(index)

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl overflow-hidden shadow-sm border border-border flex flex-col hover:shadow-md transition-shadow duration-300"
              >
                {/* 卡片頭部 */}
                <div
                  className="p-6 text-center"
                  style={{
                    backgroundColor: cardStyle.headerBg,
                    borderBottom: `1px solid ${cardStyle.headerBorder}`,
                  }}
                >
                  <h3
                    className="text-lg font-bold uppercase tracking-widest"
                    style={{ color: cardStyle.titleColor }}
                  >
                    {tier.label}
                  </h3>
                  {tier.sublabel && (
                    <p className="text-xs mt-1" style={{ color: LUXURY.muted }}>
                      {tier.sublabel}
                    </p>
                  )}
                </div>

                {/* 價格內容 */}
                <div className="p-8 flex-grow flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium" style={{ color: LUXURY.muted }}>
                      NT$
                    </span>
                    <span
                      className={`font-bold ${isMobile ? 'text-4xl' : 'text-5xl'}`}
                      style={{
                        color: LUXURY.primary,
                        fontFamily: LUXURY.font.serif,
                      }}
                    >
                      {formatPrice(tier.price) || '---'}
                    </span>
                    {tier.priceNote && (
                      <span className="text-sm font-medium" style={{ color: LUXURY.muted }}>
                        {tier.priceNote}
                      </span>
                    )}
                  </div>

                  {/* 加購說明 */}
                  {tier.addon && (
                    <p
                      className="text-center text-sm leading-relaxed max-w-xs"
                      style={{ color: LUXURY.muted }}
                    >
                      {tier.addon}
                    </p>
                  )}
                </div>

                {/* 選擇按鈕 */}
                <div className="p-6 pt-0 text-center">
                  <button
                    className="w-full py-3 border text-xs font-bold uppercase tracking-widest rounded-md transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      borderColor: LUXURY.primary,
                      color: LUXURY.primary,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = LUXURY.primary
                      e.currentTarget.style.color = '#FFFFFF'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = LUXURY.primary
                    }}
                  >
                    Select Plan
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
