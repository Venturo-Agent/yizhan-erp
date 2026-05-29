'use client'
/**
 * QuotationInfo - 報價單基本資訊區
 */

import React from 'react'
import { formatDateTW } from '@/lib/utils/format-date'

interface QuotationInfoProps {
  quoteName: string
  totalParticipants: number
  validUntil?: string
  tierLabel?: string
}

export const QuotationInfo: React.FC<QuotationInfoProps> = ({
  quoteName,
  totalParticipants,
  validUntil,
  tierLabel,
}) => {
  const _formatValidUntil = () => {
    if (validUntil) {
      return formatDateTW(validUntil)
    }
    return formatDateTW(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  }

  return (
    <div className="mb-6">
      {tierLabel && (
        <div
          className="mb-3 px-3 py-2 rounded-md inline-block"
          style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}
        >
          <span className="text-sm font-semibold">{tierLabel}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex">
          <span className="font-semibold w-32">{'行程名稱：'}</span>
          <span className="flex-1 border-b border-border">{quoteName || '精選旅遊行程'}</span>
        </div>
        <div className="flex">
          <span className="font-semibold w-32">{'總人數：'}</span>
          <span className="flex-1 border-b border-border">
            {totalParticipants} {'人'}
          </span>
        </div>
      </div>
    </div>
  )
}
