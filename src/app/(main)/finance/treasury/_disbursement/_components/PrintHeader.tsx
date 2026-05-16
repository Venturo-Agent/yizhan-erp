'use client'
/**
 * PrintHeader
 * 出納單列印預覽 — 頁首區塊
 * 包含：Logo（左）、標題（中）、單號 + 日期（右）
 */

import React from 'react'
import type { DisbursementOrder } from '@/stores/types'
import { formatDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { getLogoStyle } from '@/hooks/useWorkspaceSettings'

// Morandi 色系（與主檔共用、保持一致）
const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
}

interface PrintHeaderProps {
  order: DisbursementOrder
  logoUrl: string | null | undefined
}

export function PrintHeader({ order, logoUrl }: PrintHeaderProps) {
  const t = useTranslations('finance')
  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: '16px',
        marginBottom: '28px',
        borderBottom: `1px solid ${COLORS.gold}`,
      }}
    >
      {/* Logo 區域 - 左上（沒設 logo_url 就留空、避免洩漏其他租戶 logo）*/}
      {logoUrl && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          <img
            src={logoUrl}
            alt={t('disbursementCompanyLogoAlt')}
            style={getLogoStyle('print')}
          />
        </div>
      )}

      {/* 標題 - 置中 */}
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '3px',
            color: COLORS.gold,
            fontWeight: 500,
            marginBottom: '4px',
          }}
        >
          DISBURSEMENT
        </div>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: COLORS.brown,
            margin: 0,
          }}
        >
          {t('printTitle')}
        </h1>
      </div>

      {/* 單號和日期 - 右上 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          textAlign: 'right',
          fontSize: '11px',
          color: COLORS.gray,
        }}
      >
        <div style={{ fontWeight: 600 }}>{order.order_number || '-'}</div>
        <div style={{ color: COLORS.lightGray, marginTop: '2px' }}>
          {order.disbursement_date ? formatDate(order.disbursement_date) : '-'}
        </div>
      </div>
    </div>
  )
}
