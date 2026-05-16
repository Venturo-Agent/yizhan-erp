'use client'

import { cn } from '@/lib/utils'
import { SectionTitle } from './SectionTitle'
import type { TourPageData, CoverStyleType } from '@/app/(main)/tours/_types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

interface TourNoticesSectionProps {
  data: TourPageData
  viewMode?: 'desktop' | 'mobile'
  coverStyle?: CoverStyleType
}

export function TourNoticesSection({
  data,
  viewMode = 'desktop',
  coverStyle = 'original',
}: TourNoticesSectionProps) {
  const notices = data.notices || []
  const cancellationPolicy = data.cancellationPolicy || []

  const hasNotices = data.showNotices && notices.length > 0
  const hasCancellation = data.showCancellationPolicy && cancellationPolicy.length > 0

  if (!hasNotices && !hasCancellation) {
    return null
  }

  const isMobile = viewMode === 'mobile'

  return (
    <section className={cn('py-12 bg-muted', isMobile && 'py-8')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'grid gap-8',
            hasNotices && hasCancellation ? 'lg:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {/* 提醒事項 */}
          {hasNotices && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <SectionTitle
                title={TOURS_LABELS.LABEL_1403}
                subtitle="NOTICES"
                coverStyle={coverStyle}
                className="mb-6"
              />

              <ul className="space-y-3">
                {notices.map((notice, index) => (
                  <li
                    key={index}
                    className={cn(
                      'flex gap-3 text-morandi-secondary leading-relaxed',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}
                  >
                    <span className="text-status-warning font-bold flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 取消政策 */}
          {hasCancellation && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <SectionTitle
                title={TOURS_LABELS.LABEL_5312}
                subtitle="CANCELLATION"
                coverStyle={coverStyle}
                className="mb-6"
              />

              <ul className="space-y-4">
                {cancellationPolicy.map((policy, index) => (
                  <li
                    key={index}
                    className={cn(
                      'flex gap-3 text-morandi-secondary leading-relaxed',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}
                  >
                    <span className="text-morandi-red flex-shrink-0 mt-0.5">
                      <span className="inline-block w-5 h-5 rounded-full bg-status-danger-bg text-center text-xs font-bold leading-5">
                        {index + 1}
                      </span>
                    </span>
                    <span>{policy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
