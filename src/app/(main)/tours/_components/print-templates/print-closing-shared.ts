/**
 * 結帳明細列印 — 共用常數（COLORS / thStyle / tdStyle / SectionHeader）
 * 不含任何 React JSX（純 TS），可在所有 print-closing-* 子組件 import
 */

import React from 'react'

export const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  red: '#B84C4C',
}

export const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'left',
  fontWeight: 600,
  color: COLORS.brown,
  fontSize: '10px',
}

export const tdStyle: React.CSSProperties = {
  padding: '6px',
  fontSize: '10px',
  color: COLORS.gray,
  verticalAlign: 'middle',
}

export const fmt = (n: number) => n.toLocaleString('zh-TW')

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '信用卡',
  check: '支票',
}
