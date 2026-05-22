'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Plane,
  TrendingUp,
} from 'lucide-react'
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
  icon: Icon,
  iconColor,
  amountColor,
  loading,
}: {
  label: string
  amount: number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  amountColor: string
  loading: boolean
}) {
  return (
    <Card className="border-0 bg-morandi-container/30 hover:bg-morandi-container/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-morandi-secondary">
            {label}
          </span>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className={`text-xl font-bold tabular-nums ${amountColor}`}>
          {loading ? '...' : formatCurrency(amount)}
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
    <>
      {/* 收入列 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownCircle className="h-4 w-4 text-morandi-green" />
          <h3 className="text-sm font-semibold text-morandi-primary">{LABELS.SECTION_INCOME}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label={LABELS.CARD_TOUR_INCOME}
            amount={stats.tourIncome}
            icon={Plane}
            iconColor="text-morandi-green/60"
            amountColor="text-morandi-green"
            loading={isLoading}
          />
          <StatCard
            label={LABELS.CARD_COMPANY_INCOME}
            amount={stats.companyIncome}
            icon={Building2}
            iconColor="text-morandi-green/60"
            amountColor="text-morandi-green"
            loading={isLoading}
          />
          <StatCard
            label={LABELS.CARD_TOTAL_INCOME}
            amount={stats.totalIncome}
            icon={TrendingUp}
            iconColor="text-morandi-green"
            amountColor="text-morandi-green"
            loading={isLoading}
          />
        </div>
      </div>

      {/* 支出列 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpCircle className="h-4 w-4 text-morandi-red" />
          <h3 className="text-sm font-semibold text-morandi-primary">{LABELS.SECTION_EXPENSE}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label={LABELS.CARD_TOUR_EXPENSE}
            amount={stats.tourExpense}
            icon={Plane}
            iconColor="text-morandi-red/60"
            amountColor="text-morandi-red"
            loading={isLoading}
          />
          <StatCard
            label={LABELS.CARD_COMPANY_EXPENSE}
            amount={stats.companyExpense}
            icon={Building2}
            iconColor="text-morandi-red/60"
            amountColor="text-morandi-red"
            loading={isLoading}
          />
          <StatCard
            label={LABELS.CARD_TOTAL_EXPENSE}
            amount={stats.totalExpense}
            icon={ArrowUpCircle}
            iconColor="text-morandi-red"
            amountColor="text-morandi-red"
            loading={isLoading}
          />
        </div>
      </div>

      {/* 淨額 */}
      <div className="flex justify-end">
        <Card className="border-2 border-morandi-gold/30 w-full md:w-1/3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-morandi-secondary">
                {LABELS.CARD_NET}
              </span>
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${stats.balance >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}
            >
              {isLoading ? '...' : formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
