'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Eye, RotateCcw, Plus } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { ActionCell } from '@/components/table-cells'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CreateVoucherDialog } from './components/CreateVoucherDialog'
import { VoucherDetailDialog } from './components/VoucherDetailDialog'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { confirm } from '@/lib/ui/alert-dialog'
import { useTranslations } from 'next-intl'
import { COMMON_MESSAGES } from '@/constants/messages'
import { apiMutate } from '@/lib/swr/api-mutate'

const PAGE_LABELS = {
  STATUS_DRAFT: '草稿',
  STATUS_POSTED: '已過帳',
  STATUS_REVERSED: '已反沖',
  STATUS_LOCKED: '已鎖定',
} as const

interface JournalVoucher {
  id: string
  voucher_no: string
  voucher_date: string
  memo: string | null
  status: 'draft' | 'posted' | 'reversed' | 'locked' | null
  total_debit: number | null
  total_credit: number | null
  created_at: string | null
}

const statusConfig: Record<
  NonNullable<JournalVoucher['status']>,
  { label: string; tone: StatusTone }
> = {
  draft: { label: '草稿', tone: 'pending' },
  posted: { label: '已過帳', tone: 'success' },
  reversed: { label: '已反沖', tone: 'danger' },
  locked: { label: '已鎖定', tone: 'neutral' },
}

export default function VouchersPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
  })

  useEffect(() => {
    loadVouchers()
  }, [user?.workspace_id])

  const loadVouchers = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      let query = supabase
        .from('journal_vouchers')
        .select(
          'id, voucher_no, voucher_date, memo, status, total_debit, total_credit, created_by, workspace_id, created_at'
        )
        .eq('workspace_id', user.workspace_id)

      // 應用日期範圍篩選
      if (filters.startDate) {
        query = query.gte('voucher_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('voucher_date', filters.endDate)
      }

      // 應用狀態篩選
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status as never)
      }

      query = query
        .order('voucher_date', { ascending: false })
        .order('voucher_no', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      setVouchers(data || [])
    } catch (error) {
      logger.error('載入傳票失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 當篩選條件改變時重新載入
  useEffect(() => {
    if (user?.workspace_id) {
      loadVouchers()
    }
  }, [filters])

  const columns: TableColumn<JournalVoucher>[] = [
    {
      key: 'voucher_no',
      label: t('voucherNo'),
      width: '140px',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono text-sm">{row.voucher_no}</span>
      ),
    },
    {
      key: 'voucher_date',
      label: t('date'),
      width: '120px',
    },
    {
      key: 'memo',
      label: t('description'),
      render: (_: unknown, row: JournalVoucher) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{row.memo || '-'}</span>
      ),
    },
    {
      key: 'total_debit',
      label: t('debit'),
      width: '120px',
      align: 'right',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono">{(row.total_debit || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'total_credit',
      label: t('credit'),
      width: '120px',
      align: 'right',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono">{(row.total_credit || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      width: '100px',
      render: (_: unknown, row: JournalVoucher) => {
        if (!row.status) return <StatusBadge tone="neutral" label="-" />
        const config = statusConfig[row.status]
        return <StatusBadge tone={config.tone} label={config.label} />
      },
    },
    {
      key: 'actions',
      label: t('actions'),
      width: '180px',
      render: (_: unknown, row: JournalVoucher) => (
        <ActionCell
          actions={[
            {
              icon: Eye,
              label: t('view'),
              onClick: () => handleViewDetail(row),
            },
            // 反沖傳票：危險語意（紅）、僅已過帳（posted）時顯示
            ...(row.status === 'posted'
              ? [
                  {
                    icon: RotateCcw,
                    label: t('reverse'),
                    variant: 'danger' as const,
                    onClick: () => handleReverse(row),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ]

  const handleViewDetail = (voucher: JournalVoucher) => {
    setSelectedVoucher(voucher)
    setIsDetailDialogOpen(true)
  }

  const handleReverse = async (voucher: JournalVoucher) => {
    const confirmed = await confirm(
      `確定要反沖傳票 ${voucher.voucher_no} 嗎？\n\n會建立一張借貸對調的反沖傳票、原傳票狀態改為「已反沖」、不可復原。`,
      { title: '反沖傳票', type: 'warning' }
    )
    if (!confirmed) return

    try {
      const res = await apiMutate<{ voucher_no?: string; error?: string }>(
        `/api/accounting/vouchers/${voucher.id}/reverse`,
        { method: 'POST' }
      )
      if (!res.ok) {
        toast.error(res.error ?? COMMON_MESSAGES.UNKNOWN_ERROR)
        return
      }
      toast.success(`${COMMON_MESSAGES.OPERATION_SUCCESS}、反沖傳票編號：${res.data?.voucher_no}`)
      loadVouchers()
    } catch (error) {
      logger.error('反沖傳票失敗:', error)
      toast.error(COMMON_MESSAGES.OPERATION_FAILED + '、請稍後再試')
    }
  }

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
  }

  const handleCreateSuccess = () => {
    loadVouchers()
  }

  return (
    <>
      <ListPageLayout
        title={t('voucherManagement')}
        data={vouchers}
        columns={columns}
        loading={isLoading}
        searchable={false}
        headerActions={
          <div className="flex gap-2 items-center flex-wrap">
            <DatePicker
              value={filters.startDate}
              onChange={v => setFilters({ ...filters, startDate: v })}
              className="w-40"
            />
            <DatePicker
              value={filters.endDate}
              onChange={v => setFilters({ ...filters, endDate: v })}
              className="w-40"
            />
            <Select
              value={filters.status}
              onValueChange={value => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="draft">{PAGE_LABELS.STATUS_DRAFT}</SelectItem>
                <SelectItem value="posted">{PAGE_LABELS.STATUS_POSTED}</SelectItem>
                <SelectItem value="reversed">{PAGE_LABELS.STATUS_REVERSED}</SelectItem>
                <SelectItem value="locked">{PAGE_LABELS.STATUS_LOCKED}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => setFilters({ startDate: '', endDate: '', status: 'all' })}
            >
              清除
            </Button>
          </div>
        }
        primaryAction={{
          label: '新增傳票',
          icon: Plus,
          onClick: handleCreate,
        }}
      />

      <CreateVoucherDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <VoucherDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        voucher={
          selectedVoucher
            ? {
                ...selectedVoucher,
                status: selectedVoucher.status || 'draft',
                total_debit: selectedVoucher.total_debit || 0,
                total_credit: selectedVoucher.total_credit || 0,
              }
            : null
        }
      />
    </>
  )
}
