/**
 * 結帳明細列印 — 利潤計算表（左右兩欄會計對照）
 */

import React from 'react'
import { COLORS, fmt } from './print-closing-shared'

const LABEL_PROFIT_TABLE = '利潤計算表'

interface ProfitColRow {
  label: string
  sub?: string
  amount: number
  highlight?: boolean
}

interface PrintClosingProfitTableProps {
  leftCol: ProfitColRow[]
  rightCol: ProfitColRow[]
  SectionHeader: React.ComponentType<{ children: React.ReactNode }>
}

export function PrintClosingProfitTable({
  leftCol,
  rightCol,
  SectionHeader,
}: PrintClosingProfitTableProps) {
  const renderCell = (row?: ProfitColRow) => {
    if (!row) return <span />
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '12px',
          padding: '8px 10px',
          background: row.highlight ? COLORS.lightBrown : 'transparent',
          borderBottom: `1px solid ${COLORS.gold}`,
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: row.highlight ? COLORS.brown : COLORS.gray,
            fontWeight: row.highlight ? 600 : 'normal',
          }}
        >
          {row.label}
          {row.sub && (
            <span style={{ marginLeft: '4px', color: COLORS.lightGray, fontSize: '9px' }}>
              （{row.sub}）
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: '11px',
            textAlign: 'right',
            // 2026-05-22 William 拍板：砍 monospace、跟 Income/Expense 表字體對齊
            color: row.highlight
              ? COLORS.gold
              : row.amount < 0
                ? COLORS.red
                : COLORS.brown,
            fontWeight: row.highlight ? 700 : 600,
          }}
        >
          NT$ {fmt(row.amount)}
        </span>
      </div>
    )
  }

  return (
    <>
      <SectionHeader>{LABEL_PROFIT_TABLE}</SectionHeader>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '24px',
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          {Array.from({ length: Math.max(leftCol.length, rightCol.length) }).map((_, idx) => (
            <tr key={idx}>
              <td style={{ verticalAlign: 'top', borderRight: `1px solid ${COLORS.gold}` }}>
                {renderCell(leftCol[idx])}
              </td>
              <td style={{ verticalAlign: 'top' }}>{renderCell(rightCol[idx])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
