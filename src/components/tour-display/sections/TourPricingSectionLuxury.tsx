'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Info, ChevronDown } from 'lucide-react'
import type { TourPageData } from '@/app/(main)/tours/_types/tour-display.types'
import type {} from '@/stores/types/tour.types'
import { TOURS_LABELS } from './constants/labels'

import { LUXURY } from './utils/luxuryTokens'

interface TourPricingSectionLuxuryProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

export function TourPricingSectionLuxury({ data, viewMode }: TourPricingSectionLuxuryProps) {
  const isMobile = viewMode === 'mobile'
  const pricingDetails = data.pricingDetails
  const cancellationPolicy = data.cancellationPolicy || []

  // 控制每個 accordion 的開合狀態
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    included: false,
    excluded: false,
    cancellation: false,
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // 如果沒有任何費用資訊，不顯示
  if (!data.showPricingDetails && !data.showCancellationPolicy) return null
  if (!pricingDetails && cancellationPolicy.length === 0) return null

  const includedItems = pricingDetails?.included_items?.filter(item => item.included) || []
  const excludedItems = pricingDetails?.excluded_items?.filter(item => !item.included) || []

  return (
    <section
      className={isMobile ? 'py-12' : 'py-20'}
      style={{ backgroundColor: LUXURY.background }}
    >
      <div className={isMobile ? 'px-4' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* 標題區 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h2
            className={`font-bold pl-4 ${isMobile ? 'text-xl' : 'text-2xl'}`}
            style={{
              color: LUXURY.text,
              fontFamily: LUXURY.font.serif,
              borderLeft: `4px solid ${LUXURY.secondary}`,
            }}
          >
            {TOURS_LABELS.LABEL_2102}
          </h2>
        </motion.div>

        {/* Accordion 區塊 */}
        <div className="space-y-4">
          {/* 費用包含 */}
          {includedItems.length > 0 && (
            <AccordionItem
              title={TOURS_LABELS.LABEL_4285}
              isOpen={openSections.included}
              onToggle={() => toggleSection('included')}
              icon={<Check size="1.125em" />}
              iconBgColor={`${LUXURY.primary}15`}
              iconColor={LUXURY.primary}
              isMobile={isMobile}
            >
              <ul
                className="space-y-3 pt-6 text-sm leading-relaxed"
                style={{ color: LUXURY.muted }}
              >
                {includedItems.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: LUXURY.primary }}
                    />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </AccordionItem>
          )}

          {/* 費用不含 */}
          {excludedItems.length > 0 && (
            <AccordionItem
              title={TOURS_LABELS.LABEL_1779}
              isOpen={openSections.excluded}
              onToggle={() => toggleSection('excluded')}
              icon={<X size="1.125em" />}
              iconBgColor={`${LUXURY.accent}15`}
              iconColor={LUXURY.accent}
              isMobile={isMobile}
            >
              <ul
                className="space-y-3 pt-6 text-sm leading-relaxed"
                style={{ color: LUXURY.muted }}
              >
                {excludedItems.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: LUXURY.accent }}
                    />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </AccordionItem>
          )}

          {/* 取消與退費政策 */}
          {data.showCancellationPolicy && cancellationPolicy.length > 0 && (
            <AccordionItem
              title={TOURS_LABELS.LABEL_63}
              isOpen={openSections.cancellation}
              onToggle={() => toggleSection('cancellation')}
              icon={<Info size="1.125em" />}
              iconBgColor={`${LUXURY.secondary}15`}
              iconColor={LUXURY.secondary}
              isMobile={isMobile}
            >
              <div
                className="pt-6 text-sm leading-relaxed space-y-4"
                style={{ color: LUXURY.muted }}
              >
                <p>{TOURS_LABELS.LABEL_6529}</p>
                <ul className="list-disc pl-5 space-y-2">
                  {cancellationPolicy.map((policy, index) => (
                    <li key={index}>{policy}</li>
                  ))}
                </ul>
              </div>
            </AccordionItem>
          )}
        </div>
      </div>
    </section>
  )
}

// Accordion 項目組件
function AccordionItem({
  title,
  isOpen,
  onToggle,
  icon,
  iconBgColor,
  iconColor,
  isMobile,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  icon: React.ReactNode
  iconBgColor: string
  iconColor: string
  isMobile: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-6 cursor-pointer select-none transition-colors hover:bg-muted"
        style={{ backgroundColor: isOpen ? '#fafafa' : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: iconBgColor, color: iconColor }}
          >
            {icon}
          </span>
          <span
            className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}
            style={{ color: LUXURY.text }}
          >
            {title}
          </span>
        </div>
        <ChevronDown
          size="1.25em"
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: LUXURY.muted }}
        />
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="p-6 pt-0 border-t border-border bg-card">{children}</div>
      </motion.div>
    </motion.div>
  )
}
