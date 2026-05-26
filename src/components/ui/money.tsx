/**
 * <Money /> — 金額顯示 SSOT
 *
 * 用法：
 *   <Money amount={1000} />                       → NT$1,000
 *   <Money amount={1000} currency="USD" />        → $1,000.00
 *   <Money amount={50000} currency="JPY" />       → JPY 50,000
 *   <Money amount={500} variant="income" />       → 綠色 NT$500
 *   <Money amount={500} variant="expense" />      → 紅色 NT$500
 *   <Money amount={500} showSymbol={false} />     → 500
 *   <Money amount={null} />                       → — (EmptyValue)
 *
 * 行為：
 *   - 內部用 `tabular-nums` 不跳動
 *   - null/undefined → fallback 到 <EmptyValue />
 *   - variant 顏色用 status-success / status-danger token
 *
 * 注意：不能塞進 JSX 屬性（如 title=）；屬性場景請直接用 `formatMoneyWithCurrency(n, currency)`。
 */
import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatMoneyWithCurrency } from '@/lib/utils/format-currency'
import { EmptyValue } from './empty-value'

export type MoneyVariant = 'default' | 'income' | 'expense' | 'neutral'

interface MoneyProps {
  amount: number | null | undefined
  /** 預設 'TWD' */
  currency?: string
  /**
   * default → 沿用 text 顏色
   * income  → 綠色（status-success）
   * expense → 紅色（status-danger）
   * neutral → 灰色（morandi-muted）
   */
  variant?: MoneyVariant
  /** 自訂小數位數、預設依 currency */
  decimals?: number
  /** 是否顯示貨幣符號、預設 true */
  showSymbol?: boolean
  className?: string
}

const VARIANT_CLASSES: Record<MoneyVariant, string> = {
  default: '',
  income: 'text-status-success',
  expense: 'text-status-danger',
  neutral: 'text-morandi-muted',
}

export function Money({
  amount,
  currency = 'TWD',
  variant = 'default',
  decimals,
  showSymbol = true,
  className,
}: MoneyProps) {
  if (amount === null || amount === undefined) {
    return <EmptyValue />
  }

  const formatted = formatMoneyWithCurrency(amount, currency, { showSymbol, decimals })

  return (
    <span className={cn('tabular-nums', VARIANT_CLASSES[variant], className)}>{formatted}</span>
  )
}
