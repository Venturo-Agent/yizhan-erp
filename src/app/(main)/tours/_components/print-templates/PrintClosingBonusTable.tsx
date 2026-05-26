/**
 * 結帳明細列印 — 獎金明細表
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { COLORS, thStyle, tdStyle, fmt } from './print-closing-shared'

const LABELS = {
  BONUS_DETAILS: '獎金明細',
  TH_ITEM: '項目',
  TH_DESCRIPTION: '說明',
  TH_AMOUNT: '金額',
} as const

export interface BonusDetailRow {
  label: string
  sub?: string
  amount: number
}

interface PrintClosingBonusTableProps {
  detailRows: BonusDetailRow[]
  SectionHeader: React.ComponentType<{ children: React.ReactNode }>
}

export function PrintClosingBonusTable({ detailRows, SectionHeader }: PrintClosingBonusTableProps) {
  const t = useTranslations('tour')
  return (
    <>
      <SectionHeader>{LABELS.BONUS_DETAILS}</SectionHeader>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
        }}
      >
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
            <th style={thStyle}>{LABELS.TH_ITEM}</th>
            <th style={thStyle}>{LABELS.TH_DESCRIPTION}</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>{LABELS.TH_AMOUNT}</th>
          </tr>
        </thead>
        <tbody>
          {detailRows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', padding: '16px' }}>
                {t('closingReportNoBonus')}
              </td>
            </tr>
          ) : (
            detailRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gold}` }}>
                <td style={{ ...tdStyle, color: COLORS.brown }}>{row.label}</td>
                <td style={{ ...tdStyle, color: COLORS.lightGray }}>{row.sub || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>NT$ {fmt(row.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}
