'use client'

import { ContentContainer } from '@/components/layout/content-container'
import { Card } from '@/components/ui/card'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell } from '@/components/table-cells'
import { Users, ShoppingCart, TrendingUp, Trophy } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { DateRange } from './DateRangeSelector'
import { useSalesPerformance, type SalesPerformanceRow } from '../_hooks/useSalesPerformance'

const COMPONENT_LABELS = {
  TITLE: '業務員業績排行',
  HEADER_NOTICE: '按下訂日區間、列出每位業務員的成單數、訂單總額、平均單價。',
  COL_RANK: '排名',
  COL_NAME: '業務員',
  COL_ORDER_COUNT: '訂單數',
  COL_TOTAL: '訂單總額',
  COL_AVG: '平均單價',
  STAT_SALES: '上榜業務員',
  STAT_ORDERS: '總訂單數',
  STAT_AMOUNT: '總訂單金額',
  STAT_TOP: '冠軍業務員',
  EMPTY: '此區間沒有訂單資料',
  NO_TOP: '—',
} as const

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  isCurrency = false,
  text,
  variant,
}: {
  title: string
  value?: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  isCurrency?: boolean
  text?: string
  variant?: 'income' | 'expense'
}) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-morandi-secondary mb-1">{title}</p>
          {text !== undefined ? (
            <p className="text-2xl font-bold text-morandi-primary truncate">{text}</p>
          ) : isCurrency ? (
            <CurrencyCell amount={value || 0} variant={variant} className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold text-morandi-primary">{value || 0}</p>
          )}
        </div>
        <Icon size={24} className={iconColor} />
      </div>
    </Card>
  )
}

interface SalesPerformanceTabProps {
  dateRange: DateRange
}

export function SalesPerformanceTab({ dateRange }: SalesPerformanceTabProps) {
  const { rows, stats, loading, error } = useSalesPerformance(dateRange)
  const topSalesName = rows[0]?.sales_name || COMPONENT_LABELS.NO_TOP

  const columns: TableColumn<SalesPerformanceRow>[] = [
    {
      key: 'rank',
      label: COMPONENT_LABELS.COL_RANK,
      width: '70',
      align: 'center',
      render: value => {
        const rank = Number(value) || 0
        const isTop3 = rank <= 3
        return (
          <span className={`text-sm font-semibold ${isTop3 ? 'text-morandi-primary' : 'text-morandi-secondary'}`}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
          </span>
        )
      },
    },
    {
      key: 'sales_name',
      label: COMPONENT_LABELS.COL_NAME,
      render: value => <span className="text-sm font-medium">{String(value || '')}</span>,
    },
    {
      key: 'order_count',
      label: COMPONENT_LABELS.COL_ORDER_COUNT,
      width: '100',
      align: 'right',
      render: value => <span className="text-sm">{Number(value) || 0}</span>,
    },
    {
      key: 'total_amount',
      label: COMPONENT_LABELS.COL_TOTAL,
      width: '140',
      align: 'right',
      render: value => <CurrencyCell amount={Number(value) || 0} variant="income" />,
    },
    {
      key: 'avg_amount',
      label: COMPONENT_LABELS.COL_AVG,
      width: '140',
      align: 'right',
      render: value => <CurrencyCell amount={Number(value) || 0} />,
    },
  ]

  if (error) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-morandi-red">{error}</div>
        </div>
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-morandi-primary">
            {COMPONENT_LABELS.TITLE}
          </h2>
          <p className="text-sm text-morandi-secondary mt-1">
            {COMPONENT_LABELS.HEADER_NOTICE}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title={COMPONENT_LABELS.STAT_SALES}
            value={stats.sales_count}
            icon={Users}
            iconColor="text-morandi-secondary"
          />
          <StatCard
            title={COMPONENT_LABELS.STAT_ORDERS}
            value={stats.total_orders}
            icon={ShoppingCart}
            iconColor="text-morandi-secondary"
          />
          <StatCard
            title={COMPONENT_LABELS.STAT_AMOUNT}
            value={stats.total_amount}
            icon={TrendingUp}
            iconColor="text-morandi-income"
            isCurrency
            variant="income"
          />
          <StatCard
            title={COMPONENT_LABELS.STAT_TOP}
            text={topSalesName}
            icon={Trophy}
            iconColor="text-morandi-income"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Spinner size="lg" className="text-morandi-secondary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-morandi-secondary">
            {COMPONENT_LABELS.EMPTY}
          </Card>
        ) : (
          <EnhancedTable columns={columns} data={rows} />
        )}
      </div>
    </ContentContainer>
  )
}
