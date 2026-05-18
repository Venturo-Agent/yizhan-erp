import { useMemo, useCallback } from 'react'
import { TableColumn, useEnhancedTable } from '@/components/ui/enhanced-table'
import { PaymentRequest } from '@/stores/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { getStatusLabelFor } from '@/lib/design/status-tone-map'
import { useTranslations } from 'next-intl'
import { useBranches } from '@/data/hooks/useBranches'

export function useRequestTable(payment_requests: PaymentRequest[]) {
  const t = useTranslations('finance')
  const { branches } = useBranches()
  // Table columns configuration
  const tableColumns: TableColumn<PaymentRequest>[] = useMemo(
    () => [
      {
        key: 'code',
        label: t('disbursementRequestNumber'),
        sortable: true,
        render: (value: unknown, row: PaymentRequest) => {
          // 優先顯示 code，fallback 到 request_number
          const displayCode = (value as string) || row.request_number || ''
          return (
            <div className="font-medium text-morandi-primary">
              {displayCode || <span className="text-morandi-muted">—</span>}
            </div>
          )
        },
      },
      {
        key: 'branch_id',
        label: '分公司',
        sortable: false,
        render: (_value: unknown, row: PaymentRequest) => {
          const branchId = (row as unknown as { branch_id?: string | null }).branch_id
          const branch = branches.find(b => b.id === branchId)
          return (
            <div className={`text-sm ${branch ? 'text-morandi-primary' : 'text-morandi-muted'}`}>
              {branch?.name || '—'}
            </div>
          )
        },
      },
      {
        key: 'tour_name',
        label: t('disbursementTourNameTh'),
        sortable: true,
        render: (value: unknown, row: PaymentRequest) => {
          // 顯示團名，fallback 到團號
          const displayName = (value as string) || row.tour_code || ''
          return (
            <div className="font-medium text-morandi-primary">
              {displayName || <span className="text-morandi-muted">—</span>}
            </div>
          )
        },
      },
      {
        key: 'order_number',
        label: t('requestOrderNumber'),
        sortable: true,
        render: (value: unknown, _row: PaymentRequest) => {
          const displayValue = value as string
          return (
            <div className="text-sm text-morandi-primary">
              {displayValue || <span className="text-morandi-muted">—</span>}
            </div>
          )
        },
      },
      {
        key: 'request_date',
        label: t('requestDateLabel'),
        sortable: true,
        render: (value: unknown, row: PaymentRequest) => (
          <div className="text-sm">
            <div className={row.is_special_billing ? 'text-morandi-gold font-medium' : ''}>
              <DateCell date={value as string | null} showIcon={false} />
            </div>
            {row.is_special_billing && <div className="text-xs text-morandi-gold">⚠️ 特殊出帳</div>}
          </div>
        ),
      },
      {
        key: 'amount',
        label: t('printAmount'),
        sortable: true,
        render: (value: unknown) => (
          <CurrencyCell amount={value as number} className="font-semibold text-morandi-gold" />
        ),
      },
      {
        key: 'status',
        label: t('requestStatusLabel'),
        sortable: true,
        render: (value: unknown) => {
          const status = (value || 'pending') as string
          return <StatusBadge type="payment_request" status={status} />
        },
      },
    ],
    [t, branches]
  )

  // Sort function
  const sortFunction = useCallback(
    (data: PaymentRequest[], column: string, direction: 'asc' | 'desc') => {
      return [...data].sort((a, b) => {
        let aValue: string | number | Date, bValue: string | number | Date

        switch (column) {
          case 'code':
            aValue = a.code || a.request_number || ''
            bValue = b.code || b.request_number || ''
            break
          case 'tour_name':
            aValue = a.tour_name || ''
            bValue = b.tour_name || ''
            break
          case 'order_number':
            aValue = a.order_number || ''
            bValue = b.order_number || ''
            break
          case 'request_date':
            aValue = new Date(a.request_date || 0) // Now request_date exists
            bValue = new Date(b.request_date || 0)
            break
          case 'amount': // Renamed from total_amount
            aValue = a.amount
            bValue = b.amount
            break
          case 'status':
            aValue = getStatusLabelFor('payment_request', a.status || 'pending')
            bValue = getStatusLabelFor('payment_request', b.status || 'pending')
            break
          default:
            return 0
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1
        if (aValue > bValue) return direction === 'asc' ? 1 : -1
        return 0
      })
    },
    []
  )

  // Filter function
  const filterFunction = useCallback((data: PaymentRequest[], filters: Record<string, string>) => {
    return data.filter(request => {
      const requestStatus = request.status || 'pending' // Provide default for filtering
      const requestCode = request.code || request.request_number || ''
      return (
        (!filters.code || requestCode.toLowerCase().includes(filters.code.toLowerCase())) &&
        (!filters.tour_name ||
          (request.tour_name || '').toLowerCase().includes(filters.tour_name.toLowerCase())) &&
        (!filters.order_number ||
          (request.order_number || '')
            .toLowerCase()
            .includes(filters.order_number.toLowerCase())) &&
        (!filters.request_date || (request.request_date || '').includes(filters.request_date)) &&
        (!filters.amount || request.amount.toString().includes(filters.amount)) &&
        (!filters.status || requestStatus === filters.status)
      )
    })
  }, [])

  // Use PaymentRequest[] as the generic type for useEnhancedTable
  const {
    data: filteredAndSortedRequests,
    handleSort,
    handleFilter,
  } = useEnhancedTable<PaymentRequest>(payment_requests, sortFunction, filterFunction)

  return {
    tableColumns,
    filteredAndSortedRequests,
    handleSort,
    handleFilter,
  }
}

