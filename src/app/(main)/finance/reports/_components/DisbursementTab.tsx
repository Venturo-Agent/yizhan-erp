'use client'

import { useMemo } from 'react'
import { ContentContainer } from '@/components/layout/content-container'
import { Card } from '@/components/ui/card'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { EmptyValue } from '@/components/ui/empty-value'
import { CurrencyCell, DateCell, StatusCell } from '@/components/table-cells'
import { FileDown, Receipt, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useExpenseCategories } from '@/data/entities'
import { usePaymentRequestsInRange } from '../_hooks/usePaymentRequestsInRange'
import { useDisbursementOrdersInRange } from '../_hooks/useDisbursementOrdersInRange'
import { useLinkedPaymentRequests } from '@/app/(main)/finance/treasury/_disbursement/_hooks/useLinkedPaymentRequests'
import { PaymentRequest, DisbursementOrder } from '@/stores/types'
import type { DateRange } from './DateRangeSelector'

const COMPONENT_LABELS = {
  REQUEST_DETAILS: '請款單明細',
  DISBURSEMENT_DETAILS: '出納單明細',
  EMPTY_REQUESTS: '此區間沒有請款單',
  EMPTY_DISBURSEMENTS: '此區間沒有出納單',
  COUNT_UNIT: '筆',
} as const

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  isCurrency = false,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  isCurrency?: boolean
}) {
  return (
    <Card className="p-3 border-0 bg-morandi-container/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-morandi-secondary mb-1">{title}</p>
          {isCurrency ? (
            <CurrencyCell amount={value} className="text-lg font-bold tabular-nums" />
          ) : (
            <p className="text-lg font-bold text-morandi-primary tabular-nums">{value}</p>
          )}
        </div>
        <Icon size={18} className={iconColor} />
      </div>
    </Card>
  )
}

interface DisbursementTabProps {
  dateRange: DateRange
}

export function DisbursementTab({ dateRange }: DisbursementTabProps) {
  const t = useTranslations('finance')
  // 只撈選取範圍的請款/撥款單（不全撈）；下方仍用 request_date/disbursement_date 精確過濾、數字不變
  const { rows: paymentRequests } = usePaymentRequestsInRange(dateRange)
  const { rows: disbursementOrders } = useDisbursementOrdersInRange(dateRange)
  // 出納單「請款單數」欄需數所有連動請款（不限日期）→ 用 links hook、不能用範圍限制的 paymentRequests（會少算）
  const { items: linkedRequests } = useLinkedPaymentRequests()
  // 2026-05-21 Phase 2：類別顯示走 expense_categories.id 反查、舊 EXPENSE_TYPE_CONFIG 退休
  const { items: allCats } = useExpenseCategories({ all: true })
  const catNameById = useMemo(
    () => new Map((allCats ?? []).map(c => [c.id, c.name])),
    [allCats]
  )

  const filteredPaymentRequests = useMemo(() => {
    const { startDate, endDate } = dateRange
    return paymentRequests.filter(pr => {
      const d = pr.request_date?.split('T')[0] || ''
      return d >= startDate && d <= endDate
    })
  }, [paymentRequests, dateRange])

  const filteredDisbursementOrders = useMemo(() => {
    const { startDate, endDate } = dateRange
    return disbursementOrders.filter(d => {
      const dt = d.disbursement_date?.split('T')[0] || ''
      return dt >= startDate && dt <= endDate
    })
  }, [disbursementOrders, dateRange])

  const stats = useMemo(() => {
    const tourRequests = filteredPaymentRequests.filter(pr => pr.request_category === 'tour')
    const companyRequests = filteredPaymentRequests.filter(pr => pr.request_category === 'company')
    return {
      paymentRequestCount: filteredPaymentRequests.length,
      disbursementOrderCount: filteredDisbursementOrders.length,
      totalPaymentAmount: filteredPaymentRequests.reduce((sum, pr) => sum + (pr.amount || 0), 0),
      totalDisbursementAmount: filteredDisbursementOrders.reduce(
        (sum, d) => sum + (d.amount || 0),
        0
      ),
      tourAmount: tourRequests.reduce((sum, pr) => sum + (pr.amount || 0), 0),
      tourCount: tourRequests.length,
      companyAmount: companyRequests.reduce((sum, pr) => sum + (pr.amount || 0), 0),
      companyCount: companyRequests.length,
    }
  }, [filteredPaymentRequests, filteredDisbursementOrders])

  const paymentColumns: TableColumn<PaymentRequest>[] = [
    {
      key: 'code',
      label: '請款單號',
      width: '150',
      render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
    },
    {
      key: 'request_date',
      label: '請款日期',
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'request_category',
      label: '類別',
      width: '100',
      render: (value, row) => {
        if (value === 'company') {
          // 優先 expense_category_id 反查、fallback expense_type（舊資料）
          const rowExt = row as PaymentRequest & { expense_category_id?: string | null }
          const typeName =
            (rowExt.expense_category_id && catNameById.get(rowExt.expense_category_id)) ||
            rowExt.expense_type ||
            '公司'
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-morandi-gold/10 text-morandi-gold">
              {typeName}
            </span>
          )
        }
        return <span className="text-sm text-morandi-secondary">{row.tour_code || <EmptyValue />}</span>
      },
    },
    {
      key: 'request_type',
      label: '類型',
      width: '100',
      render: value => <span className="text-sm">{String(value || '-')}</span>,
    },
    {
      key: 'amount',
      label: '金額',
      width: '120',
      render: value => <CurrencyCell amount={Number(value) || 0} />,
    },
    {
      key: 'status',
      label: '狀態',
      width: '100',
      render: value => <StatusCell type="payment" status={value as string} />,
    },
  ]

  const disbursementColumns: TableColumn<DisbursementOrder>[] = [
    {
      key: 'order_number',
      label: '出納單號',
      width: '150',
      render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
    },
    {
      key: 'disbursement_date',
      label: '出帳日期',
      width: '120',
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'request_count',
      label: '請款單數',
      width: '100',
      render: (_value, row) => (
        <span className="text-sm">
          {linkedRequests.filter(pr => pr.disbursement_order_id === row.id).length} {COMPONENT_LABELS.COUNT_UNIT}
        </span>
      ),
    },
    {
      key: 'amount',
      label: '金額',
      width: '120',
      render: value => <CurrencyCell amount={Number(value) || 0} />,
    },
    {
      key: 'status',
      label: '狀態',
      width: '100',
      render: value => <StatusCell type="payment" status={value as string} />,
    },
  ]

  return (
    <div className="space-y-6">
      <ContentContainer>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatCard
            title={`團體請款（${stats.tourCount} 筆）`}
            value={stats.tourAmount}
            icon={Receipt}
            iconColor="text-morandi-gold"
            isCurrency
          />
          <StatCard
            title={`公司支出（${stats.companyCount} 筆）`}
            value={stats.companyAmount}
            icon={Receipt}
            iconColor="text-morandi-gold"
            isCurrency
          />
          <StatCard
            title={`請款合計（${stats.paymentRequestCount} 筆）`}
            value={stats.totalPaymentAmount}
            icon={FileDown}
            iconColor="text-morandi-gold"
            isCurrency
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title={t('disbursementCount')}
            value={stats.disbursementOrderCount}
            icon={Wallet}
            iconColor="text-morandi-green"
          />
          <StatCard
            title={t('totalDisbursementAmount')}
            value={stats.totalDisbursementAmount}
            icon={FileDown}
            iconColor="text-morandi-green"
            isCurrency
          />
        </div>
      </ContentContainer>

      <ContentContainer>
        <h3 className="text-lg font-semibold text-morandi-primary mb-4">{COMPONENT_LABELS.REQUEST_DETAILS}</h3>
        <EnhancedTable
          columns={paymentColumns}
          data={filteredPaymentRequests}
          emptyMessage={COMPONENT_LABELS.EMPTY_REQUESTS}
        />
      </ContentContainer>

      <ContentContainer>
        <h3 className="text-lg font-semibold text-morandi-primary mb-4">{COMPONENT_LABELS.DISBURSEMENT_DETAILS}</h3>
        <EnhancedTable
          columns={disbursementColumns}
          data={filteredDisbursementOrders}
          emptyMessage={COMPONENT_LABELS.EMPTY_DISBURSEMENTS}
        />
      </ContentContainer>
    </div>
  )
}
