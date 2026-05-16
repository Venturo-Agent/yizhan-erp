'use client'

import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { SectionTitle } from './SectionTitle'
import type { TourPageData, CoverStyleType } from '@/app/(main)/tours/_types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

interface TourFAQSectionProps {
  data: TourPageData
  viewMode?: 'desktop' | 'mobile'
  coverStyle?: CoverStyleType
}

export function TourFAQSection({
  data,
  viewMode = 'desktop',
  coverStyle = 'original',
}: TourFAQSectionProps) {
  const faqs = data.faqs
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  if (!data.showFaqs || !faqs || faqs.length === 0) {
    return null
  }

  const isMobile = viewMode === 'mobile'

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <section className={cn('py-12 bg-morandi-container/20', isMobile && 'py-8')}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle title={TOURS_LABELS.LABEL_2640} coverStyle={coverStyle} className="mb-8" />

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                'bg-card rounded-xl border border-morandi-container/50 overflow-hidden',
                'transition-shadow duration-200',
                expandedIndex === index && 'shadow-md'
              )}
            >
              {/* 問題標題 - 可點擊展開 */}
              <button
                type="button"
                onClick={() => toggleExpand(index)}
                className={cn(
                  'w-full flex items-center justify-between p-4 text-left',
                  'hover:bg-morandi-container/10 transition-colors'
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <span
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full bg-morandi-gold text-white',
                      'flex items-center justify-center font-bold',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}
                  >
                    Q
                  </span>
                  <span
                    className={cn(
                      'font-medium text-morandi-primary',
                      isMobile ? 'text-sm' : 'text-base'
                    )}
                  >
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'flex-shrink-0 w-5 h-5 text-morandi-secondary transition-transform duration-200',
                    expandedIndex === index && 'transform rotate-180'
                  )}
                />
              </button>

              {/* 答案內容 - 展開時顯示 */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  expandedIndex === index ? 'max-h-96' : 'max-h-0'
                )}
              >
                <div className="px-4 pb-4 pt-0">
                  <div className="flex items-start gap-3 pl-0">
                    <span
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full bg-morandi-primary/10 text-morandi-primary',
                        'flex items-center justify-center font-bold',
                        isMobile ? 'text-xs' : 'text-sm'
                      )}
                    >
                      A
                    </span>
                    <p
                      className={cn(
                        'text-morandi-secondary leading-relaxed',
                        isMobile ? 'text-sm' : 'text-base'
                      )}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
