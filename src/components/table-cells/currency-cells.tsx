'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format-currency'

// ========== 類型定義 ==========

interface CurrencyCellProps {
  amount: number
  currency?: 'TWD' | 'USD' | 'CNY'
  variant?: 'default' | 'income' | 'expense'
  showSign?: boolean
  className?: string
}

// ========== 輔助函數 ==========

function formatCurrency(amount: number, currency: 'TWD' | 'USD' | 'CNY' = 'TWD'): string {
  return formatCurrencyUtil(amount, currency)
}

// ========== 組件 ==========

/**
 * CurrencyCell - 金額單元格
 *
 * 統一的金額顯示組件，支援不同幣別和顏色變體
 *
 * @example
 * ```tsx
 * <CurrencyCell amount={tour.price} />
 * <CurrencyCell amount={payment.amount} variant="income" />
 * <CurrencyCell amount={-500} showSign />
 * ```
 */
export function CurrencyCell({
  amount,
  currency = 'TWD',
  variant = 'default',
  showSign = false,
  className,
}: CurrencyCellProps) {
  const isNegative = amount < 0

  const colorClass = cn(
    'text-sm font-medium',
    variant === 'income' && 'text-morandi-green',
    variant === 'expense' && 'text-morandi-red',
    variant === 'default' && isNegative && 'text-morandi-red',
    variant === 'default' && !isNegative && 'text-morandi-primary',
    className
  )

  return (
    <div className={colorClass}>
      {showSign && (isNegative ? '-' : '+')}
      {formatCurrency(amount, currency)}
    </div>
  )
}
