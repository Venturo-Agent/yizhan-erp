'use client'

import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { Building } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { usePayables, type PayableRow } from '../_hooks/usePayables'
import { getStatusLabelFor } from '@/lib/design/status-tone-map'
import { ReportStatCard } from './ReportStatCard'
import { ReportSectionTitle } from './ReportSectionTitle'

const COMPONENT_LABELS = {
  TITLE: '應付帳款明細',
  HEADER_NOTICE: '已確認 / 已拋出納但未付清的請款單、按請款天數由久到近排序。> 90 天為逾期應付。',
  COL_SUPPLIER: '供應商',
  COL_REQUEST: '請款單號',
  COL_TOUR: '團號',
  COL_DATE: '請款日',
  COL_AMOUNT: '應付金額',
  COL_STATUS: '狀態',
  COL_DAYS: '請款天數',
  COL_BUCKET: '帳齡',
  STAT_COUNT: '應付筆數',
  STAT_TOTAL: '應付總額',
  STAT_OVERDUE_COUNT: '逾期筆數',
  STAT_OVERDUE_AMOUNT: '逾期金額',
  EMPTY: '沒有未付清的請款單',
  BUCKET_CURRENT: '尚未到期',
  BUCKET_D30: '30 天內',
  BUCKET_D60: '31-60 天',
  BUCKET_D90: '61-90 天',
  BUCKET_OVERDUE: '> 90 天逾期',
} as const

const BUCKET_LABELS: Record<PayableRow['aging_bucket'], string> = {
  current: COMPONENT_LABELS.BUCKET_CURRENT,
  d30: COMPONENT_LABELS.BUCKET_D30,
  d60: COMPONENT_LABELS.BUCKET_D60,
  d90: COMPONENT_LABELS.BUCKET_D90,
  d90_plus: COMPONENT_LABELS.BUCKET_OVERDUE,
}

const BUCKET_COLORS: Record<PayableRow['aging_bucket'], string> = {
  current: 'text-morandi-secondary',
  d30: 'text-morandi-primary',
  d60: 'text-morandi-primary',
  d90: 'text-morandi-expense',
  d90_plus: 'text-status-danger font-semibold',
}

export function PayablesTab() {
  const { rows, stats, loading, error } = usePayables()

  const columns: TableColumn<PayableRow>[] = [
    {
      key: 'supplier_name',
      label: COMPONENT_LABELS.COL_SUPPLIER,
      render: value => <span className="text-sm font-medium">{String(value || '')}</span>,
    },
    {
      key: 'request_code',
      label: COMPONENT_LABELS.COL_REQUEST,
      width: '140',
      render: value => <span className="font-mono text-sm">{String(value || '—')}</span>,
    },
    {
      key: 'tour_code',
      label: COMPONENT_LABELS.COL_TOUR,
      width: '130',
      render: value => (
        <span className="font-mono text-sm text-morandi-secondary">{String(value || '—')}</span>
      ),
    },
    {
      key: 'request_date',
      label: COMPONENT_LABELS.COL_DATE,
      width: '110',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'amount',
      label: COMPONENT_LABELS.COL_AMOUNT,
      width: '120',
      align: 'right',
      render: value => (
        <CurrencyCell amount={Number(value) || 0} variant="expense" className="font-semibold" />
      ),
    },
    {
      key: 'status',
      label: COMPONENT_LABELS.COL_STATUS,
      width: '90',
      render: value => (
        <span className="text-sm">{getStatusLabelFor('payment_request', String(value))}</span>
      ),
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
        const bucket = value as PayableRow['aging_bucket']
        return <span className={`text-sm ${BUCKET_COLORS[bucket]}`}>{BUCKET_LABELS[bucket]}</span>
      },
    },
  ]

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-status-danger">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ReportStatCard title={COMPONENT_LABELS.STAT_COUNT} value={stats.count} />
        <ReportStatCard
          title={COMPONENT_LABELS.STAT_TOTAL}
          value={stats.total_payable}
          isCurrency
          variant="expense"
        />
        <ReportStatCard title={COMPONENT_LABELS.STAT_OVERDUE_COUNT} value={stats.overdue_count} />
        <ReportStatCard
          title={COMPONENT_LABELS.STAT_OVERDUE_AMOUNT}
          value={stats.overdue_amount}
          isCurrency
          variant="expense"
        />
      </div>

      <div>
        <ReportSectionTitle icon={Building} title={COMPONENT_LABELS.TITLE} />
        <p className="text-sm text-morandi-secondary mb-2">{COMPONENT_LABELS.HEADER_NOTICE}</p>
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Spinner size="lg" className="text-morandi-secondary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-morandi-secondary">{COMPONENT_LABELS.EMPTY}</div>
        ) : (
          <EnhancedTable columns={columns} data={rows} />
        )}
      </div>
    </div>
  )
}
