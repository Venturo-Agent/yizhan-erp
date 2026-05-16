/**
 * 結帳明細列印 — 支出明細表
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { COLORS, thStyle, tdStyle, fmt } from './print-closing-shared'

const LABELS = {
  EXPENSE_DETAILS: '支出明細',
  TH_REQUEST_NUMBER: '請款單號',
  TH_SUPPLIER: '供應商',
  TH_CATEGORY: '類別',
  TH_AMOUNT: '金額',
  EXPENSE_SUBTOTAL: '支出小計',
} as const

interface CostRow {
  code?: string | null
  request_number?: string | null
  supplier_name?: string | null
  request_type?: string | null
  amount?: number | null
}

interface PrintClosingExpenseTableProps {
  costs: CostRow[]
  expenseTotal: number
  SectionHeader: React.ComponentType<{ children: React.ReactNode }>
}

export function PrintClosingExpenseTable({
  costs,
  expenseTotal,
  SectionHeader,
}: PrintClosingExpenseTableProps) {
  const t = useTranslations('tour')
  return (
    <>
      <SectionHeader>{LABELS.EXPENSE_DETAILS}</SectionHeader>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
        }}
      >
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
            <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
            <th style={thStyle}>{LABELS.TH_REQUEST_NUMBER}</th>
            <th style={thStyle}>{LABELS.TH_SUPPLIER}</th>
            <th style={thStyle}>{LABELS.TH_CATEGORY}</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>{LABELS.TH_AMOUNT}</th>
          </tr>
        </thead>
        <tbody>
          {costs.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '16px' }}>
                {t('closingReportNoExpense')}
              </td>
            </tr>
          ) : (
            costs.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gold}` }}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                <td style={tdStyle}>{c.code || c.request_number || '-'}</td>
                <td style={tdStyle}>{c.supplier_name || '-'}</td>
                <td style={tdStyle}>{c.request_type || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>NT$ {fmt(c.amount || 0)}</td>
              </tr>
            ))
          )}
          <tr style={{ borderTop: `1px solid ${COLORS.gold}` }}>
            <td colSpan={3} />
            <td style={{ ...tdStyle, textAlign: 'right', color: COLORS.lightGray }}>
              {LABELS.EXPENSE_SUBTOTAL}
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
              NT$ {fmt(expenseTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
