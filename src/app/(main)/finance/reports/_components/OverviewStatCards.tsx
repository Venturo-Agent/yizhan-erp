'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format-currency'

const LABELS = {
  SECTION_INCOME: '收入',
  CARD_TOUR_INCOME: '團體收入',
  CARD_COMPANY_INCOME: '公司收入',
  CARD_TOTAL_INCOME: '收入合計',
  SECTION_EXPENSE: '支出',
  CARD_TOUR_EXPENSE: '團體支出',
  CARD_COMPANY_EXPENSE: '公司支出',
  CARD_TOTAL_EXPENSE: '支出合計',
  CARD_NET: '淨額',
} as const

function StatCard({
  label,
  amount,
  amountColor,
  loading,
}: {
  label: string
  amount: number
  amountColor: string
  loading: boolean
}) {
  return (
    <Card className="bg-card border-border/60 hover:border-morandi-gold/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-morandi-secondary whitespace-nowrap">
            {label}
          </span>
          <span className={`text-xl font-bold tabular-nums ${amountColor}`}>
            {loading ? '...' : formatCurrency(amount)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

interface Stats {
  tourIncome: number
  companyIncome: number
  totalIncome: number
  tourExpense: number
  companyExpense: number
  totalExpense: number
  balance: number
}

interface OverviewStatCardsProps {
  stats: Stats
  isLoading: boolean
}

export function OverviewStatCards({ stats, isLoading }: OverviewStatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* 第 1 列 - 收入 */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label={LABELS.CARD_TOUR_INCOME}
          amount={stats.tourIncome}
          amountColor="text-status-success"
          loading={isLoading}
        />
        <StatCard
          label={LABELS.CARD_COMPANY_INCOME}
          amount={stats.companyIncome}
          amountColor="text-status-success"
          loading={isLoading}
        />
        <StatCard
          label={LABELS.CARD_TOTAL_INCOME}
          amount={stats.totalIncome}
          amountColor="text-status-success"
          loading={isLoading}
        />
      </div>

      {/* 第 4 欄 - 淨額（跨兩列、stacked、置中、邊框跟一般卡一致）*/}
      <Card className="bg-card border-border/60 hover:border-morandi-gold/40 transition-colors md:row-span-2">
        <CardContent className="h-full p-4 flex flex-col items-center justify-center gap-2">
          <span className="text-sm font-medium text-morandi-secondary">{LABELS.CARD_NET}</span>
          <span
            className={`text-3xl font-bold tabular-nums ${stats.balance >= 0 ? 'text-status-success' : 'text-status-danger'}`}
          >
            {isLoading ? '...' : formatCurrency(stats.balance)}
          </span>
        </CardContent>
      </Card>

      {/* 第 2 列 - 支出 */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label={LABELS.CARD_TOUR_EXPENSE}
          amount={stats.tourExpense}
          amountColor="text-status-danger"
          loading={isLoading}
        />
        <StatCard
          label={LABELS.CARD_COMPANY_EXPENSE}
          amount={stats.companyExpense}
          amountColor="text-status-danger"
          loading={isLoading}
        />
        <StatCard
          label={LABELS.CARD_TOTAL_EXPENSE}
          amount={stats.totalExpense}
          amountColor="text-status-danger"
          loading={isLoading}
        />
      </div>
    </div>
  )
}
