'use client'
/**
 * TourTableColumns - Table column definitions for tours list
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { TableColumn } from '@/components/ui/enhanced-table'
import { EmptyValue } from '@/components/ui/empty-value'
import { Tour } from '@/stores/types'
import { DateCell } from '@/components/table-cells'
import { StatusBadge } from '@/components/ui/status-badge'
import { TOUR_TABLE } from '../_constants'
import { useTourDisplayResolver } from '../_utils/tour-display'

interface UseTourTableColumnsParams {
  ordersByTourId?: Map<string, { sales_person: string | null; assistant: string | null }>
}

export function useTourTableColumns({ ordersByTourId }: UseTourTableColumnsParams) {
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'code',
        label: TOUR_TABLE.col_code,
        sortable: true,
        width: '7.5rem',
        render: (value, _row) => {
          const code = String(value || '')
          return (
            <Link
              href={`/tours/${code}`}
              onClick={e => e.stopPropagation()}
              className="text-sm text-morandi-gold hover:text-morandi-gold-hover hover:underline font-medium"
            >
              {code}
            </Link>
          )
        },
      },
      {
        key: 'name',
        label: TOUR_TABLE.col_name,
        sortable: true,
        // 完全不設 width / minWidth：搭配 table-fixed、name 欄位 auto 吃剩餘空間
        render: value => (
          <span className="text-sm text-morandi-primary">{String(value || '')}</span>
        ),
      },
      {
        key: 'departure_date',
        label: TOUR_TABLE.col_departure,
        sortable: true,
        width: '6.75rem',
        render: (value, row) => {
          const tour = row as Tour
          return <DateCell date={tour.departure_date} showIcon={false} />
        },
      },
      {
        key: 'return_date',
        label: TOUR_TABLE.col_return,
        sortable: true,
        width: '6.75rem',
        render: (value, row) => {
          const tour = row as Tour
          return <DateCell date={tour.return_date} showIcon={false} />
        },
      },

      {
        key: 'status',
        label: TOUR_TABLE.col_status,
        sortable: true,
        width: '5.5rem',
        render: (value, row) => {
          // DB status 是 SSOT；自動推進靠 pg_cron job `tour-status-auto-advance`
          // （每天台北 00:05、auto_advance_tour_status function）
          const tour = row as Tour
          return <StatusBadge type="tour" status={tour.status || ''} />
        },
      },
    ],
    [ordersByTourId]
  )
}

/**
 * useTemplateTableColumns - 提案/模板精簡版表格欄位
 */
interface UseTemplateTableColumnsParams {
  onConvert?: (tour: Tour) => void
}

export function useTemplateTableColumns({ onConvert: _onConvert }: UseTemplateTableColumnsParams) {
  const resolveDisplay = useTourDisplayResolver()
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'name',
        label: TOUR_TABLE.col_name,
        sortable: true,
        width: '15rem',
        render: value => (
          <span className="text-sm text-morandi-primary font-medium">{String(value || '')}</span>
        ),
      },
      {
        key: 'location',
        label: TOUR_TABLE.col_location,
        sortable: false,
        width: '8rem',
        render: (_value, row) => {
          const tour = row as Tour
          const { displayString } = resolveDisplay(tour)
          return <span className="text-sm text-morandi-primary">{displayString || <EmptyValue />}</span>
        },
      },
      {
        key: 'days_count',
        label: TOUR_TABLE.col_days,
        sortable: true,
        width: '5.5rem',
        render: value => (
          <span className="text-sm text-morandi-primary">
            {value ? `${value} ${TOUR_TABLE.col_days_unit}` : '-'}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: TOUR_TABLE.col_created,
        sortable: true,
        width: '8rem',
        render: value => <DateCell date={value as string | null} showIcon={false} />,
      },
    ],
    [resolveDisplay]
  )
}
