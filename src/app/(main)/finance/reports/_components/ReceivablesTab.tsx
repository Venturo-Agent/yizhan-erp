'use client'

import { ContentContainer } from '@/components/layout/content-container'
import { Card } from '@/components/ui/card'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { Receipt, AlertTriangle, Hourglass, Users } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useReceivables, type ReceivableRow } from '../_hooks/useReceivables'

const COMPONENT_LABELS = {
  TITLE: '應收帳款明細',
  HEADER_NOTICE: '所有尚未收清的訂單、按欠款天數由久到近排序。> 90 天為逾期應收。',
  COL_CUSTOMER: '客戶',
  COL_ORDER: '訂單號',
  COL_TOUR: '團號',
  COL_TOTAL: '訂單總額',
  COL_PAID: '已付',
  COL_REMAINING: '應收',
  COL_DAYS: '欠款天數',
  COL_BUCKET: '帳齡',
  COL_CREATED: '下訂日',
  STAT_COUNT: '應收筆數',
  STAT_TOTAL: '應收總額',
  STAT_OVERDUE_COUNT: '逾期筆數',
  STAT_OVERDUE_AMOUNT: '逾期金額',
  EMPTY: '沒有未收清的訂單、帳款狀態良好',
  BUCKET_CURRENT: '尚未到期',
  BUCKET_D30: '30 天內',
  BUCKET_D60: '31-60 天',
  BUCKET_D90: '61-90 天',
  BUCKET_OVERDUE: '> 90 天逾期',
} as const

const BUCKET_LABELS: Record<ReceivableRow['aging_bucket'], string> = {
  current: COMPONENT_LABELS.BUCKET_CURRENT,
  d30: COMPONENT_LABELS.BUCKET_D30,
  d60: COMPONENT_LABELS.BUCKET_D60,
  d90: COMPONENT_LABELS.BUCKET_D90,
  d90_plus: COMPONENT_LABELS.BUCKET_OVERDUE,
}

const BUCKET_COLORS: Record<ReceivableRow['aging_bucket'], string> = {
  current: 'text-morandi-secondary',
  d30: 'text-morandi-primary',
  d60: 'text-morandi-primary',
  d90: 'text-morandi-expense',
  d90_plus: 'text-morandi-red font-semibold',
}

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
    <Card className="p-3 border-0 bg-morandi-container/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-morandi-secondary mb-1">{title}</p>
          {isCurrency ? (
            <CurrencyCell amount={value} variant={variant} className="text-lg font-bold tabular-nums" />
          ) : (
            <p className="text-lg font-bold text-morandi-primary tabular-nums">{value}</p>
          )}
        </div>
        <Icon size={18} className={iconColor} />
      </div>
    </Card>
  )
}

export function ReceivablesTab() {
  const { rows, stats, loading, error } = useReceivables()

  const columns: TableColumn<ReceivableRow>[] = [
    {
      key: 'customer_name',
      label: COMPONENT_LABELS.COL_CUSTOMER,
      render: value => <span className="text-sm font-medium">{String(value || '')}</span>,
    },
    {
      key: 'order_code',
      label: COMPONENT_LABELS.COL_ORDER,
      width: '130',
      render: value => <span className="font-mono text-sm">{String(value || '—')}</span>,
    },
    {
      key: 'tour_code',
      label: COMPONENT_LABELS.COL_TOUR,
      width: '130',
      render: value => <span className="font-mono text-sm text-morandi-secondary">{String(value || '—')}</span>,
    },
    {
      key: 'created_at',
      label: COMPONENT_LABELS.COL_CREATED,
      width: '110',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'total_amount',
      label: COMPONENT_LABELS.COL_TOTAL,
      width: '120',
      align: 'right',
      render: value => <CurrencyCell amount={Number(value) || 0} />,
    },
    {
      key: 'paid_amount',
      label: COMPONENT_LABELS.COL_PAID,
      width: '120',
      align: 'right',
      render: value => <CurrencyCell amount={Number(value) || 0} variant="income" />,
    },
    {
      key: 'remaining_amount',
      label: COMPONENT_LABELS.COL_REMAINING,
      width: '120',
      align: 'right',
      render: value => <CurrencyCell amount={Number(value) || 0} variant="expense" className="font-semibold" />,
    },
    {
      key: 'days_overdue',
      label: COMPONENT_LABELS.COL_DAYS,
      width: '90',
      align: 'right',
      render: value => <span className="text-sm">{Number(value) || 0}</span>,
    },
    {
      key: 'aging_bucket',
      label: COMPONENT_LABELS.COL_BUCKET,
      width: '110',
      render: value => {
        const bucket = value as ReceivableRow['aging_bucket']
        return <span className={`text-sm ${BUCKET_COLORS[bucket]}`}>{BUCKET_LABELS[bucket]}</span>
      },
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
          <h2 className="text-lg font-semibold text-morandi-primary">{COMPONENT_LABELS.TITLE}</h2>
          <p className="text-sm text-morandi-secondary mt-1">{COMPONENT_LABELS.HEADER_NOTICE}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title={COMPONENT_LABELS.STAT_COUNT}
            value={stats.count}
            icon={Users}
            iconColor="text-morandi-secondary"
          />
          <StatCard
            title={COMPONENT_LABELS.STAT_TOTAL}
            value={stats.total_receivable}
            icon={Receipt}
            iconColor="text-morandi-expense"
            isCurrency
            variant="expense"
          />
          <StatCard
            title={COMPONENT_LABELS.STAT_OVERDUE_COUNT}
            value={stats.overdue_count}
            icon={Hourglass}
            iconColor="text-morandi-red"
          />
          <StatCard
            title={COMPONENT_LABELS.STAT_OVERDUE_AMOUNT}
            value={stats.overdue_amount}
            icon={AlertTriangle}
            iconColor="text-morandi-red"
            isCurrency
            variant="expense"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Spinner size="lg" className="text-morandi-secondary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-morandi-secondary">{COMPONENT_LABELS.EMPTY}</Card>
        ) : (
          <EnhancedTable columns={columns} data={rows} />
        )}
      </div>
    </ContentContainer>
  )
}
