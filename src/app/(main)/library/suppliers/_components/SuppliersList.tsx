'use client'
/**
 * SuppliersList - 供應商列表（含類別顯示）
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE } from '@/components/table-cells'
import { cn } from '@/lib/utils'
import { Edit2, Trash2 } from 'lucide-react'
import { Supplier } from '../_types'

interface SuppliersListProps {
  suppliers: Supplier[]
  loading?: boolean
  onEdit?: (supplier: Supplier) => void
  onDelete?: (supplier: Supplier) => void
  /** 伺服器分頁模式：suppliers 已是「當前頁」、不在 client 端再 slice */
  serverPagination?: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
  }
  /** 排序變更回調（伺服器排序、列表頁負責歸第一頁 + 重查）*/
  onSort?: (column: string, direction: 'asc' | 'desc') => void
}

// 供應商類型中文對應（module-level — SKIP i18n, uses complex data structure）
export const TYPE_LABELS: Record<string, string> = {
  hotel: '飯店',
  restaurant: '餐廳',
  transport: '交通',
  attraction: '景點',
  guide: '導遊',
  agency: '旅行社',
  ticketing: '票務',
  employee: '員工',
  other: '其他',
}

export const SuppliersList: React.FC<SuppliersListProps> = ({
  suppliers,
  loading = false,
  onEdit,
  onDelete,
  serverPagination,
  onSort,
}) => {
  const t = useTranslations('library')

  const columns: TableColumn[] = [
    {
      key: 'code',
      label: t('supplierCode'),
      sortable: true,
      render: value => (
        <span className="font-mono text-sm text-morandi-secondary">{String(value || '-')}</span>
      ),
    },
    {
      key: 'name',
      label: t('supplierName'),
      sortable: true,
      render: value => (
        <span className="font-medium text-morandi-primary">{String(value || '')}</span>
      ),
    },
    {
      key: 'bank_code',
      label: '銀行代碼',
      sortable: true,
      render: value => <span className="text-morandi-primary">{String(value || '-')}</span>,
    },
    {
      key: 'bank_account',
      label: t('supplierBankAccount'),
      sortable: true,
      render: value => <span className="text-morandi-secondary">{String(value || '-')}</span>,
    },
    {
      key: 'notes',
      label: t('supplierNotes'),
      sortable: false,
      render: value => <span className="text-sm text-morandi-muted">{String(value || '-')}</span>,
    },
  ]

  return (
    <EnhancedTable
      columns={columns}
      data={suppliers}
      loading={loading}
      serverPagination={serverPagination}
      onSort={onSort}
      actions={row => {
        const supplier = row as Supplier
        return (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(supplier)
                }}
                className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
                title={t('supplierEdit')}
              >
                <Edit2 size="0.95em" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(supplier)
                }}
                className={cn(ACTION_BUTTON_BASE, 'text-status-danger hover:bg-status-danger-bg')}
                title={t('supplierDelete')}
              >
                <Trash2 size="0.95em" />
              </Button>
            )}
          </div>
        )
      }}
    />
  )
}
