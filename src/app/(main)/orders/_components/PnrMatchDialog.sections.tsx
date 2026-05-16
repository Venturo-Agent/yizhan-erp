'use client'

import type { ParsedPNR } from '@/lib/pnr-parser'
import { useTranslations } from 'next-intl'

interface TourMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  pnr?: string | null
}

interface UnmatchedMembersSectionProps {
  unmatchedMembers: TourMember[]
}

// 未在 PNR 中的團員列表
export function UnmatchedMembersSection({ unmatchedMembers }: UnmatchedMembersSectionProps) {
  const t = useTranslations('orders')
  if (unmatchedMembers.length === 0) return null
  return (
    <div className="p-3 bg-morandi-gold/10 rounded-lg">
      <p className="text-sm font-medium text-morandi-gold mb-2">
        {t('notInPnr')} ({unmatchedMembers.length}{' '}
        {t('personUnit')})：
      </p>
      <div className="flex flex-wrap gap-2">
        {unmatchedMembers.map(m => (
          <span
            key={m.id}
            className="px-2 py-1 bg-card rounded text-xs border border-morandi-gold/30"
          >
            {m.chinese_name || m.passport_name}
          </span>
        ))}
      </div>
    </div>
  )
}

interface FlightInfoSectionProps {
  parsedPnr: ParsedPNR
}

// 航班資訊區塊
export function FlightInfoSection({ parsedPnr }: FlightInfoSectionProps) {
  const t = useTranslations('orders')
  if (!parsedPnr.segments || parsedPnr.segments.length === 0) return null
  return (
    <div className="p-3 bg-status-info/10 rounded-lg">
      <p className="text-sm font-medium text-status-info mb-2">
        {t('flightInfo')}
      </p>
      <div className="space-y-1">
        {parsedPnr.segments.map((seg, i) => (
          <div key={i} className="text-xs font-mono text-status-info">
            <span>
              {seg.airline}
              {seg.flightNumber} {seg.origin}→{seg.destination} {seg.departureDate}{' '}
              {seg.departureTime}
            </span>
            {seg.via && seg.via.length > 0 && (
              <span className="ml-2 text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">
                {t('stopover')}{' '}
                {seg.via
                  .map(v => `${v.city}${v.duration ? ` (${v.duration})` : ''}`)
                  .join(', ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
