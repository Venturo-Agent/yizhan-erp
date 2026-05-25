'use client'

import { useMemo } from 'react'
import { EmptyValue } from '@/components/ui/empty-value'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { TrendingUp, Receipt as ReceiptIcon } from 'lucide-react'
import { ReportStatCard } from './ReportStatCard'
import { ReportSectionTitle } from './ReportSectionTitle'
import { useReceiptsInRange } from '../_hooks/useReceiptsInRange'
import type { Receipt } from '@/types/receipt.types'
import { RECEIPT_PAYMENT_METHOD_LABELS } from '@/types/receipt.types'
import type { DateRange } from './DateRangeSelector'

const COMPONENT_LABELS = {
  STATS_BY_METHOD: '依付款方式統計',
  RECEIPT_DETAILS: '收款單明細',
  COUNT_UNIT: '筆',
} as const

interface IncomeTabProps {
  dateRange: DateRange
}

export function IncomeTab({ dateRange }: IncomeTabProps) {
  // 只撈選取範圍的收款單（不全撈整張表）；filteredReceipts 仍用 coalesce 日期精確 trim、數字不變
  const { rows: receipts, loading } = useReceiptsInRange(dateRange)

  const filteredReceipts = useMemo(() => {
    const { startDate, endDate } = dateRange
    return receipts.filter(r => {
      const d = r.receipt_date || r.created_at?.split('T')[0] || ''
      return d >= startDate && d <= endDate
    })
  }, [receipts, dateRange])

  const stats = useMemo(() => {
    const tourReceipts = filteredReceipts.filter(r => r.tour_id)
    const companyReceipts = filteredReceipts.filter(r => !r.tour_id)
    const totalAmount = filteredReceipts.reduce(
      (sum, r) => sum + (r.receipt_amount || 0),
      0
    )
    const tourAmount = tourReceipts.reduce((sum, r) => sum + (r.receipt_amount || 0), 0)
    const companyAmount = companyReceipts.reduce(
      (sum, r) => sum + (r.receipt_amount || 0),
      0
    )
    const byPaymentMethod = filteredReceipts.reduce(
      (acc, r) => {
        const method = r.payment_method || 'other'
        if (!acc[method]) acc[method] = { count: 0, amount: 0 }
        acc[method].count += 1
        acc[method].amount += r.receipt_amount || 0
        return acc
      },
      {} as Record<string, { count: number; amount: number }>
    )
    return {
      receiptCount: filteredReceipts.length,
      totalAmount,
      tourAmount,
      tourCount: tourReceipts.length,
      companyAmount,
      companyCount: companyReceipts.length,
      byPaymentMethod,
    }
  }, [filteredReceipts])

  const columns: TableColumn<Receipt>[] = [
    {
      key: 'receipt_number',
      label: '收款單號',
      width: '150',
      render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
    },
    {
      key: 'receipt_date',
      label: '收款日期',
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'payment_method',
      label: '付款方式',
      width: '100',
      render: value => {
        const method = String(value || '')
        return (
          <span className="text-sm">{RECEIPT_PAYMENT_METHOD_LABELS[method] || method || <EmptyValue />}</span>
        )
      },
    },
    {
      key: 'receipt_amount',
      label: '金額',
      width: '120',
      render: (value, row) => (
        <CurrencyCell amount={Number(value) || Number(row.receipt_amount) || 0} variant="income" />
      ),
    },
    {
      key: 'handler_name',
      label: '經手人',
      width: '100',
      render: value => <span className="text-sm">{String(value || '-')}</span>,
    },
    {
      key: 'notes',
      label: '備註',
      width: '150',
      render: value => <span className="text-sm truncate">{String(value || '-')}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ReportStatCard
          title={`團體收款（${stats.tourCount} 筆）`}
          value={stats.tourAmount}
          variant="income"
          isCurrency
        />
        <ReportStatCard
          title={`公司收款（${stats.companyCount} 筆）`}
          value={stats.companyAmount}
          variant="income"
          isCurrency
        />
        <ReportStatCard
          title={`收款合計（${stats.receiptCount} 筆）`}
          value={stats.totalAmount}
          variant="income"
          isCurrency
        />
      </div>

      {Object.keys(stats.byPaymentMethod).length > 0 && (
        <div>
          <ReportSectionTitle icon={TrendingUp} title={COMPONENT_LABELS.STATS_BY_METHOD} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stats.byPaymentMethod).map(([method, data]) => (
              <div key={method} className="p-4 bg-morandi-container/30 rounded-lg">
                <p className="text-sm text-morandi-secondary">
                  {RECEIPT_PAYMENT_METHOD_LABELS[method] || method}
                </p>
                <p className="text-lg font-semibold text-morandi-primary">{data.count} {COMPONENT_LABELS.COUNT_UNIT}</p>
                <CurrencyCell amount={data.amount} variant="income" className="text-sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <ReportSectionTitle icon={ReceiptIcon} title={COMPONENT_LABELS.RECEIPT_DETAILS} />
        <EnhancedTable
          columns={columns}
          data={filteredReceipts}
          loading={loading}
          emptyMessage="此區間沒有收款單"
        />
      </div>
    </div>
  )
}
