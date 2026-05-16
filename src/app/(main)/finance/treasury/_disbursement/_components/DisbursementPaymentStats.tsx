'use client'

import React from 'react'
import { CurrencyCell } from '@/components/table-cells'
import { useTranslations } from 'next-intl'

interface PaymentMethodStat {
  name: string
  amount: number
}

interface DisbursementPaymentStatsProps {
  stats: PaymentMethodStat[]
  total: number
}

/**
 * 付款方式統計區塊
 * 顯示各付款方式的金額分布與合計
 */
export function DisbursementPaymentStats({ stats, total }: DisbursementPaymentStatsProps) {
  const t = useTranslations('finance')
  if (stats.length === 0) return null

  return (
    <div className="p-4 bg-morandi-background/50 rounded-lg">
      <h3 className="text-sm font-semibold text-morandi-primary mb-3">付款方式統計</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.name} className="flex items-center justify-between">
            <span className="text-sm text-morandi-secondary">{stat.name}</span>
            <CurrencyCell amount={stat.amount} className="font-semibold text-morandi-gold" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-morandi-container/30">
        <span className="text-sm font-semibold text-morandi-primary">
          {t('disbursementSubtotal')}
        </span>
        <CurrencyCell amount={total} className="font-bold text-lg text-morandi-gold" />
      </div>
    </div>
  )
}
