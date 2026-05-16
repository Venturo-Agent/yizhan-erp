/**
 * 結帳明細列印 — 收入明細表
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { COLORS, thStyle, tdStyle, fmt, PAYMENT_METHOD_MAP } from './print-closing-shared'
import { formatDate } from '@/lib/utils'

const LABELS = {
  INCOME_DETAILS: '收入明細',
  TH_RECEIPT_NUMBER: '收款單號',
  TH_DATE: '日期',
  TH_PAYMENT_METHOD: '收款方式',
  TH_AMOUNT: '金額',
  INCOME_SUBTOTAL: '收入小計',
} as const

interface ReceiptRow {
  receipt_number?: string
  receipt_date?: string
  receipt_amount?: number
  amount?: number
  payment_method?: string
}

interface PrintClosingIncomeTableProps {
  receipts: ReceiptRow[]
  receiptTotal: number
  SectionHeader: React.ComponentType<{ children: React.ReactNode }>
}

export function PrintClosingIncomeTable({
  receipts,
  receiptTotal,
  SectionHeader,
}: PrintClosingIncomeTableProps) {
  const t = useTranslations('tour')
  return (
    <>
      <SectionHeader>{LABELS.INCOME_DETAILS}</SectionHeader>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
        }}
      >
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '32%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
            <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
            <th style={thStyle}>{LABELS.TH_RECEIPT_NUMBER}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{LABELS.TH_DATE}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{LABELS.TH_PAYMENT_METHOD}</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>{LABELS.TH_AMOUNT}</th>
          </tr>
        </thead>
        <tbody>
          {receipts.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '16px' }}>
                {t('closingReportNoIncome')}
              </td>
            </tr>
          ) : (
            receipts.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gold}` }}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                <td style={tdStyle}>{r.receipt_number || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {r.receipt_date ? formatDate(r.receipt_date) : '-'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {r.payment_method
                    ? PAYMENT_METHOD_MAP[r.payment_method] || r.payment_method
                    : '-'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  NT$ {fmt(r.receipt_amount ?? r.amount ?? 0)}
                </td>
              </tr>
            ))
          )}
          <tr style={{ borderTop: `1px solid ${COLORS.gold}` }}>
            <td colSpan={3} />
            <td style={{ ...tdStyle, textAlign: 'right', color: COLORS.lightGray }}>
              {LABELS.INCOME_SUBTOTAL}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: 'right',
                fontWeight: 600,
                color: COLORS.brown,
                fontSize: '11px',
              }}
            >
              NT$ {fmt(receiptTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
