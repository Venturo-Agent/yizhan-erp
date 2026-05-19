'use client'

import { ContentContainer } from '@/components/layout/content-container'

const COMPONENT_LABELS = {
  UNCLOSED_TOURS_LIST: '未結案列表',
  DAYS_UNIT: '天',
  HEADER_NOTICE: '顯示回程日超過 7 天仍未結案的團體，請儘速完成結案作業。',
} as const
import { Card } from '@/components/ui/card'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { AlertCircle, Calendar, TrendingUp, TrendingDown} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import {
  useUnclosedTours,
  UnclosedTourData,
} from '@/app/(main)/finance/reports/_hooks/useUnclosedTours'

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  isCurrency = false,
  variant,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  isCurrency?: boolean
  variant?: 'income' | 'expense'
}) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-morandi-secondary mb-1">{title}</p>
          {isCurrency ? (
            <CurrencyCell amount={value} variant={variant} className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold text-morandi-primary">{value}</p>
          )}
        </div>
        <Icon size={24} className={iconColor} />
      </div>
    </Card>
  )
}

export function UnclosedToursTab() {
  const t = useTranslations('finance')
  const { tours: unclosedTours, stats, loading, error } = useUnclosedTours()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" className="text-morandi-secondary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-morandi-red">{error}</div>
      </div>
    )
  }

  const columns: TableColumn<UnclosedTourData>[] = [
    {
      key: 'code',
      label: '團號',
      width: '120',
      render: value => <span className="font-mono text-sm font-medium">{String(value || '')}</span>,
    },
    {
      key: 'name',
      label: '團名',
      width: '180',
      render: value => <span className="text-sm truncate">{String(value || '-')}</span>,
    },
    {
      key: 'return_date',
      label: '回程日',
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'expected_closing_date',
      label: '預計結案日',
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'days_overdue',
      label: '逾期天數',
      width: '100',
      render: value => {
        const days = Number(value) || 0
        return (
          <span
            className={`font-medium ${days > 14 ? 'text-morandi-red' : days > 7 ? 'text-morandi-gold' : 'text-morandi-secondary'}`}
          >
            {days} {COMPONENT_LABELS.DAYS_UNIT}
          </span>
        )
      },
    },
    {
      key: 'total_revenue',
      label: '總收入',
      width: '120',
      render: value => <CurrencyCell amount={Number(value) || 0} variant="income" />,
    },
    {
      key: 'total_cost',
      label: '總成本',
      width: '120',
      render: value => <CurrencyCell amount={Number(value) || 0} variant="expense" />,
    },
    {
      key: 'profit',
      label: '利潤',
      width: '120',
      render: (_, row) => {
        const profit = (row.total_revenue || 0) - (row.total_cost || 0)
        return (
          <CurrencyCell
            amount={profit}
            variant={profit >= 0 ? 'income' : 'expense'}
            className="font-medium"
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <ContentContainer>
        <div className="flex items-start gap-3 p-4 bg-morandi-gold/5 border border-morandi-gold/20 rounded-lg">
          <AlertCircle size={20} className="text-morandi-gold flex-shrink-0 mt-0.5" />
          <p className="text-sm text-morandi-primary">
            {COMPONENT_LABELS.HEADER_NOTICE}
          </p>
        </div>
      </ContentContainer>

      <ContentContainer>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('unclosedToursCount')}
            value={stats.count}
            icon={Calendar}
            iconColor="text-morandi-red"
          />
          <StatCard
            title={t('totalIncomeLabel')}
            value={stats.totalRevenue}
            icon={TrendingUp}
            iconColor="text-morandi-green"
            isCurrency
            variant="income"
          />
          <StatCard
            title={t('totalCostLabel')}
            value={stats.totalCost}
            icon={TrendingDown}
            iconColor="text-morandi-red"
            isCurrency
            variant="expense"
          />
          <StatCard
            title={t('netProfitLabel')}
            value={stats.netProfit}
            icon={TrendingUp}
            iconColor={stats.netProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red'}
            isCurrency
            variant={stats.netProfit >= 0 ? 'income' : 'expense'}
          />
        </div>
      </ContentContainer>

      <ContentContainer>
        <h3 className="text-lg font-semibold text-morandi-primary mb-4">{COMPONENT_LABELS.UNCLOSED_TOURS_LIST}</h3>
        <EnhancedTable
          columns={columns}
          data={unclosedTours}
          emptyMessage="目前沒有未結案的團體"
          searchable
          searchableFields={['code', 'name']}
          searchPlaceholder="搜尋團號或團名..."
        />
      </ContentContainer>
    </div>
  )
}
