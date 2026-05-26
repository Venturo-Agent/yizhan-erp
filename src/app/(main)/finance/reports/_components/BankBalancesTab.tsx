'use client'

import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell } from '@/components/table-cells'
import { Banknote, Star } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useBankBalances, type BankBalanceRow } from '../_hooks/useBankBalances'
import { ReportStatCard } from './ReportStatCard'
import { ReportSectionTitle } from './ReportSectionTitle'

const COMPONENT_LABELS = {
  TITLE: '銀行餘額',
  HEADER_NOTICE:
    '所有啟用中的銀行帳戶 + 即時餘額（從會計傳票分錄聚合計算）。未綁定會計科目的帳戶餘額顯示為「未綁定」。',
  COL_DEFAULT: '預設',
  COL_CODE: '代號',
  COL_NAME: '帳戶名稱',
  COL_BANK: '銀行',
  COL_ACCOUNT_NUMBER: '帳號',
  COL_COA: '對應科目',
  COL_CURRENCY: '幣別',
  COL_BALANCE: '餘額',
  STAT_COUNT: '帳戶數',
  STAT_BALANCE: '帳戶餘額合計',
  STAT_UNLINKED: '未綁定科目',
  EMPTY: '沒有啟用中的銀行帳戶、請至「財務設定 → 銀行帳戶」新增',
  UNLINKED_BADGE: '未綁定',
  FOREIGN_NOTE:
    '⚠️ 外幣支援：目前所有帳戶一律按 TWD 計算、外幣帳戶需等 schema 加上 currency 欄位後實作。',
} as const

export function BankBalancesTab() {
  const { rows, stats, loading, error } = useBankBalances()

  const columns: TableColumn<BankBalanceRow>[] = [
    {
      key: 'is_default',
      label: COMPONENT_LABELS.COL_DEFAULT,
      width: '60',
      align: 'center',
      render: value => (value ? <Star className="h-4 w-4 text-morandi-income inline" /> : null),
    },
    {
      key: 'code',
      label: COMPONENT_LABELS.COL_CODE,
      width: '90',
      render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
    },
    {
      key: 'name',
      label: COMPONENT_LABELS.COL_NAME,
      render: value => <span className="text-sm font-medium">{String(value || '')}</span>,
    },
    {
      key: 'bank_name',
      label: COMPONENT_LABELS.COL_BANK,
      width: '140',
      render: value => <span className="text-sm">{String(value || '—')}</span>,
    },
    {
      key: 'account_number',
      label: COMPONENT_LABELS.COL_ACCOUNT_NUMBER,
      width: '160',
      render: value => (
        <span className="font-mono text-sm text-morandi-secondary">{String(value || '—')}</span>
      ),
    },
    {
      key: 'account_code',
      label: COMPONENT_LABELS.COL_COA,
      width: '140',
      render: (value, row) => {
        if (!value) {
          return <span className="text-xs text-morandi-red">{COMPONENT_LABELS.UNLINKED_BADGE}</span>
        }
        return (
          <span className="text-sm">
            <span className="font-mono">{String(value)}</span>
            {row.account_name && (
              <span className="text-morandi-secondary ml-1">{row.account_name}</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'currency',
      label: COMPONENT_LABELS.COL_CURRENCY,
      width: '70',
      align: 'center',
      render: value => <span className="text-sm">{String(value || 'TWD')}</span>,
    },
    {
      key: 'balance',
      label: COMPONENT_LABELS.COL_BALANCE,
      width: '140',
      align: 'right',
      render: value => {
        if (value === null || value === undefined) {
          return <span className="text-sm text-morandi-secondary">—</span>
        }
        const n = Number(value)
        return (
          <CurrencyCell
            amount={n}
            variant={n >= 0 ? 'income' : 'expense'}
            className="font-semibold"
          />
        )
      },
    },
  ]

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-morandi-red">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ReportStatCard title={COMPONENT_LABELS.STAT_COUNT} value={stats.count} />
        <ReportStatCard
          title={COMPONENT_LABELS.STAT_BALANCE}
          value={stats.total_balance}
          isCurrency
        />
        <ReportStatCard title={COMPONENT_LABELS.STAT_UNLINKED} value={stats.unlinked_count} />
      </div>

      <div>
        <ReportSectionTitle icon={Banknote} title={COMPONENT_LABELS.TITLE} />
        <p className="text-sm text-morandi-secondary mb-1">{COMPONENT_LABELS.HEADER_NOTICE}</p>
        <p className="text-xs text-morandi-secondary mb-2">{COMPONENT_LABELS.FOREIGN_NOTE}</p>
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
