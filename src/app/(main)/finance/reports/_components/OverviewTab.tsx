'use client'

import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell } from '@/components/table-cells'
import { FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useReceiptsInRange } from '../_hooks/useReceiptsInRange'
import { usePaymentRequestsInRange } from '../_hooks/usePaymentRequestsInRange'
import { useDraftTourIds } from '../_hooks/useDraftTourIds'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { DateRange } from './DateRangeSelector'
import { getStatusLabelFor } from '@/lib/design/status-tone-map'
import { OverviewStatCards } from './OverviewStatCards'
import { OverviewSupplierTable, type TransactionRow, type GroupedRow } from './OverviewSupplierTable'

import type { DetailGranularity } from '@/app/(main)/finance/reports/page'

const COMPONENT_LABELS = {
  GROUP_COMPANY: '公司',
  GROUP_NO_TOUR: '未指定團號',
  GROUP_INCOME: '收款',
  GROUP_NO_SUPPLIER: '未指定供應商',
  COL_DATE: '日期',
  COL_TYPE: '類型',
  TYPE_INCOME: '收入',
  TYPE_EXPENSE: '支出',
  COL_CATEGORY: '分類',
  CAT_TOUR: '團體',
  CAT_COMPANY: '公司',
  COL_DESCRIPTION: '說明',
  COL_AMOUNT: '金額',
  GROUP_LABEL_DAY: '日期',
  GROUP_LABEL_TOUR: '團號',
  GROUP_LABEL_SUPPLIER: '供應商',
  COL_INCOME: '收入',
  COL_EXPENSE: '支出',
  COL_NET: '淨額',
  COL_COUNT: '筆數',
  SECTION_TX_DETAIL: '交易明細',
  LOADING: '載入中...',
  EMPTY: '此區間無交易記錄',
} as const

interface OverviewTabProps {
  dateRange: DateRange
  granularity: DetailGranularity
}

export function OverviewTab({ dateRange, granularity }: OverviewTabProps) {
  // 只撈選取範圍的收款/請款（不全撈整張表）；下方統計仍用原本 coalesce 日期 + 狀態精確過濾、數字不變
  const { rows: receipts, loading: receiptsLoading } = useReceiptsInRange(dateRange)
  const { rows: paymentRequests, loading: prLoading } = usePaymentRequestsInRange(dateRange)
  // 只撈草稿團 id（template/proposal）、不全撈所有團
  const { rows: draftTourIdList, loading: draftLoading } = useDraftTourIds()

  const isLoading = receiptsLoading || prLoading || draftLoading

  // 草稿團（template/proposal）id 集合、用來擋工作台暫存資料入帳
  const draftTourIds = useMemo(() => new Set(draftTourIdList), [draftTourIdList])

  const stats = useMemo(() => {
    const { startDate, endDate } = dateRange

    // 只算已確認的收款單（status='confirmed'）才算收入
    const rangeReceipts = receipts.filter(r => {
      if (r.status !== 'confirmed') return false
      if (r.tour_id && draftTourIds.has(r.tour_id)) return false
      const d = (r.receipt_date || r.created_at)?.split('T')[0] || ''
      return d >= startDate && d <= endDate
    })
    const rangePayments = paymentRequests.filter(pr => {
      if (pr.tour_id && draftTourIds.has(pr.tour_id)) return false
      const d = (pr.request_date || pr.created_at || '')?.split('T')[0] || ''
      return d >= startDate && d <= endDate
    })

    const tourIncome = rangeReceipts
      .filter(r => r.tour_id)
      .reduce((sum, r) => sum + (r.actual_amount || r.receipt_amount || 0), 0)
    const companyIncome = rangeReceipts
      .filter(r => !r.tour_id)
      .reduce((sum, r) => sum + (r.actual_amount || r.receipt_amount || 0), 0)

    // 只算已付款的請款單才算支出（2026-05-15 SSOT：billed 已併入 paid）
    const confirmedPayments = rangePayments.filter(pr => pr.status === 'paid')
    const tourExpense = confirmedPayments
      .filter(pr => pr.request_category === 'tour')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0)
    const companyExpense = confirmedPayments
      .filter(pr => pr.request_category === 'company')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0)

    const totalIncome = tourIncome + companyIncome
    const totalExpense = tourExpense + companyExpense

    return {
      tourIncome,
      companyIncome,
      totalIncome,
      tourExpense,
      companyExpense,
      totalExpense,
      balance: totalIncome - totalExpense,
    }
  }, [receipts, paymentRequests, dateRange, draftTourIds])

  // 按筆明細
  const transactions = useMemo(() => {
    const { startDate, endDate } = dateRange
    const rows: TransactionRow[] = []

    receipts.forEach(r => {
      if (r.status !== 'confirmed') return // 只顯示已確認的收款
      if (r.tour_id && draftTourIds.has(r.tour_id)) return // 擋掉 template/proposal 團
      const d = (r.receipt_date || r.created_at)?.split('T')[0] || ''
      if (d < startDate || d > endDate) return
      rows.push({
        id: r.id,
        date: r.receipt_date || r.created_at,
        description: `${r.receipt_number} ${r.tour_name || r.order_number || ''}`.trim(),
        type: 'income',
        category: r.tour_id ? 'tour' : 'company',
        amount: r.actual_amount || r.receipt_amount || 0,
        status: getStatusLabelFor('receipt', r.status),
        tourCode: ((r as unknown as Record<string, unknown>).tour_code as string) || '',
        supplierName: '',
      })
    })

    paymentRequests.forEach(pr => {
      if (pr.status !== 'paid') return // 只顯示已付款（2026-05-15 SSOT：billed 已併入 paid）
      if (pr.tour_id && draftTourIds.has(pr.tour_id)) return // 擋掉 template/proposal 團
      const d = (pr.request_date || pr.created_at || '')?.split('T')[0] || ''
      if (d < startDate || d > endDate) return

      // 展開每個項目的供應商（items 從 join 帶出）
      const items = (
        pr as unknown as {
          items?: Array<{
            supplier_name?: string
            description?: string
            subtotal?: number
            category?: string
          }>
        }
      ).items
      if (items && items.length > 0) {
        items.forEach(item => {
          rows.push({
            id: `${pr.id}_${item.description || ''}`,
            date: pr.request_date || pr.created_at || '',
            description: `${pr.code || pr.request_number || ''} ${item.description || ''}`.trim(),
            type: 'expense',
            category: pr.request_category === 'company' ? 'company' : 'tour',
            amount: item.subtotal || 0,
            status: getStatusLabelFor('payment_request', pr.status),
            tourCode: pr.tour_code || '',
            supplierName: item.supplier_name || pr.supplier_name || '',
            requestCode: pr.code || pr.request_number || '',
          })
        })
      } else {
        // 沒有 items 的舊資料，用主表
        rows.push({
          id: pr.id,
          date: pr.request_date || pr.created_at || '',
          description:
            `${pr.code || pr.request_number || ''} ${pr.supplier_name || pr.tour_name || ''}`.trim(),
          type: 'expense',
          category: pr.request_category === 'company' ? 'company' : 'tour',
          amount: pr.amount || 0,
          status: getStatusLabelFor('payment_request', pr.status),
          tourCode: pr.tour_code || '',
          supplierName: pr.supplier_name || '',
          requestCode: pr.code || pr.request_number || '',
        })
      }
    })

    // 排序：先日期（新→舊），同日期收入在前、支出在後
    rows.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateCompare !== 0) return dateCompare
      if (a.type === 'income' && b.type === 'expense') return -1
      if (a.type === 'expense' && b.type === 'income') return 1
      return 0
    })
    return rows
  }, [receipts, paymentRequests, dateRange, draftTourIds])

  // 分組彙總
  const groupedRows = useMemo((): GroupedRow[] => {
    if (granularity === 'item') return []

    const groups = new Map<string, GroupedRow>()

    for (const tx of transactions) {
      let key = ''
      let label = ''

      if (granularity === 'day') {
        const d = tx.date?.split('T')[0] || ''
        key = d
        label = d ? format(new Date(d), 'MM/dd (EEE)', { locale: zhTW }) : '-'
      } else if (granularity === 'tour') {
        key = tx.tourCode || (tx.category === 'company' ? '__company__' : '__no_tour__')
        label = tx.tourCode || (tx.category === 'company' ? COMPONENT_LABELS.GROUP_COMPANY : COMPONENT_LABELS.GROUP_NO_TOUR)
      } else if (granularity === 'supplier') {
        key = tx.supplierName || (tx.type === 'income' ? '__income__' : '__no_supplier__')
        label = tx.supplierName || (tx.type === 'income' ? COMPONENT_LABELS.GROUP_INCOME : COMPONENT_LABELS.GROUP_NO_SUPPLIER)
      }

      if (!groups.has(key)) {
        groups.set(key, { id: key, label, income: 0, expense: 0, net: 0, count: 0, details: [] })
      }
      const g = groups.get(key)!
      if (tx.type === 'income') g.income += tx.amount
      else g.expense += tx.amount
      g.net = g.income - g.expense
      g.count += 1
      g.details!.push(tx)
    }

    const result = Array.from(groups.values())

    if (granularity === 'day') {
      result.sort((a, b) => b.id.localeCompare(a.id))
    } else {
      result.sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    }

    return result
  }, [transactions, granularity])

  // 按筆表格欄位
  const itemColumns: TableColumn<TransactionRow>[] = [
    {
      key: 'date',
      label: COMPONENT_LABELS.COL_DATE,
      width: '80',
      render: value => (
        <span className="text-sm">
          {value ? format(new Date(value as string), 'MM/dd', { locale: zhTW }) : '-'}
        </span>
      ),
    },
    {
      key: 'type',
      label: COMPONENT_LABELS.COL_TYPE,
      width: '70',
      render: value => (
        <Badge
          variant="outline"
          className={
            value === 'income'
              ? 'bg-morandi-green/10 text-morandi-green border-morandi-green/20 text-xs'
              : 'bg-morandi-red/10 text-morandi-red border-morandi-red/20 text-xs'
          }
        >
          {value === 'income' ? COMPONENT_LABELS.TYPE_INCOME : COMPONENT_LABELS.TYPE_EXPENSE}
        </Badge>
      ),
    },
    {
      key: 'category',
      label: COMPONENT_LABELS.COL_CATEGORY,
      width: '60',
      render: value => (
        <span className="text-xs text-morandi-secondary">
          {value === 'tour' ? COMPONENT_LABELS.CAT_TOUR : COMPONENT_LABELS.CAT_COMPANY}
        </span>
      ),
    },
    {
      key: 'description',
      label: COMPONENT_LABELS.COL_DESCRIPTION,
      render: value => (
        <span className="text-sm truncate max-w-[280px] block">{String(value)}</span>
      ),
    },
    {
      key: 'amount',
      label: COMPONENT_LABELS.COL_AMOUNT,
      width: '120',
      render: (value, row) => (
        <span
          className={`font-medium text-sm ${row.type === 'income' ? 'text-morandi-green' : 'text-morandi-red'}`}
        >
          {row.type === 'income' ? '+' : '-'}
          {formatCurrency(Number(value))}
        </span>
      ),
    },
  ]

  // 分組表格欄位
  const groupColumns: TableColumn<GroupedRow>[] = [
    {
      key: 'label',
      label: granularity === 'day' ? COMPONENT_LABELS.GROUP_LABEL_DAY : granularity === 'tour' ? COMPONENT_LABELS.GROUP_LABEL_TOUR : COMPONENT_LABELS.GROUP_LABEL_SUPPLIER,
      render: value => <span className="text-sm font-medium">{String(value)}</span>,
    },
    {
      key: 'income',
      label: COMPONENT_LABELS.COL_INCOME,
      width: '130',
      render: value => <CurrencyCell amount={Number(value)} variant="income" />,
    },
    {
      key: 'expense',
      label: COMPONENT_LABELS.COL_EXPENSE,
      width: '130',
      render: value => <CurrencyCell amount={Number(value)} variant="expense" />,
    },
    {
      key: 'net',
      label: COMPONENT_LABELS.COL_NET,
      width: '130',
      render: value => {
        const n = Number(value)
        return (
          <CurrencyCell
            amount={n}
            variant={n >= 0 ? 'income' : 'expense'}
            className="font-medium"
          />
        )
      },
    },
    {
      key: 'count',
      label: COMPONENT_LABELS.COL_COUNT,
      width: '70',
      render: value => <span className="text-sm text-morandi-secondary">{String(value)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <OverviewStatCards stats={stats} isLoading={isLoading} />

      {/* 明細區 — 不包 Card 殼、表格裸放、跟上方收入支出風格統一 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-3.5 w-3.5 text-morandi-primary" />
          <h3 className="text-xs font-semibold text-morandi-primary">
            {COMPONENT_LABELS.SECTION_TX_DETAIL}
          </h3>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-morandi-secondary">{COMPONENT_LABELS.LOADING}</div>
        ) : granularity === 'item' ? (
          transactions.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">{COMPONENT_LABELS.EMPTY}</div>
          ) : (
            <EnhancedTable
              columns={itemColumns}
              data={transactions.slice(0, 100)}
              emptyMessage={COMPONENT_LABELS.EMPTY}
            />
          )
        ) : groupedRows.length === 0 ? (
          <div className="text-center py-8 text-morandi-secondary">{COMPONENT_LABELS.EMPTY}</div>
        ) : granularity === 'supplier' ? (
          <OverviewSupplierTable rows={groupedRows} />
        ) : (
          <EnhancedTable
            columns={groupColumns}
            data={groupedRows}
            emptyMessage={COMPONENT_LABELS.EMPTY}
          />
        )}
      </div>
    </div>
  )
}
