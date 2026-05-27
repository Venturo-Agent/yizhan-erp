'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckSquare, XCircle } from 'lucide-react'
import { ActionCell } from '@/components/table-cells'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CreateCheckDialog } from './components/CreateCheckDialog'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'
import { COMMON_MESSAGES } from '@/constants/messages'
import { confirm } from '@/lib/ui/alert-dialog'

const PAGE_LABELS = {
  UNCASHED_CHECKS: '未兌現支票',
  UNCASHED_AMOUNT: '未兌現金額',
  OVERDUE_CHECKS: '逾期支票',
} as const

interface Check {
  id: string
  check_number: string
  check_date: string
  due_date: string
  amount: number
  payee_name: string
  status: 'pending' | 'cleared' | 'voided' | 'bounced'
  memo: string | null
  created_at: string
}

const statusConfig = {
  pending: { label: '未兌現', variant: 'secondary' as const, color: 'text-morandi-gold' },
  cleared: { label: '已兌現', variant: 'default' as const, color: 'text-status-success' },
  voided: { label: '作廢', variant: 'outline' as const, color: 'text-morandi-secondary' },
  bounced: { label: '退票', variant: 'destructive' as const, color: 'text-status-danger' },
}

export default function ChecksPage() {
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [checks, setChecks] = useState<Check[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadChecks()
  }, [user?.workspace_id])

  const loadChecks = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      // 列表只抓顯示/操作需要的欄位，減少 payload
      const { data, error } = await supabase
        .from('checks')
        .select('id,check_number,check_date,due_date,amount,payee_name,status,memo,created_at')
        .eq('workspace_id', user.workspace_id)
        .order('due_date', { ascending: true })
      if (error) throw error
      setChecks((data || []) as Check[])
    } catch (error) {
      logger.error('載入票據失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const columns: TableColumn<Check>[] = [
    {
      key: 'check_number',
      label: '支票號碼',
      width: '140px',
      render: (_: unknown, row: Check) => (
        <span className="font-mono text-sm">{row.check_number}</span>
      ),
    },
    {
      key: 'check_date',
      label: '開票日',
      width: '100px',
    },
    {
      key: 'due_date',
      label: '到期日',
      width: '100px',
      render: (_: unknown, row: Check) => {
        const isOverdue = new Date(row.due_date) < new Date() && row.status === 'pending'
        return (
          <span className={isOverdue ? 'text-status-danger font-semibold' : ''}>
            {row.due_date}
          </span>
        )
      },
    },
    {
      key: 'payee_name',
      label: '受款人',
      render: (_: unknown, row: Check) => <span className="text-sm">{row.payee_name}</span>,
    },
    {
      key: 'amount',
      label: '金額',
      width: '120px',
      align: 'right',
      render: (_: unknown, row: Check) => (
        <span className="font-mono font-semibold">${row.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '100px',
      render: (_: unknown, row: Check) => {
        const config = statusConfig[row.status as keyof typeof statusConfig]
        if (!config) return <Badge variant="outline">-</Badge>
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '操作',
      width: '200px',
      render: (_: unknown, row: Check) => (
        <ActionCell
          actions={[
            {
              icon: CheckSquare,
              label: '標記已兌現',
              onClick: () => handleClearCheck(row),
              variant: 'success',
              hidden: row.status !== 'pending',
            },
            {
              icon: XCircle,
              label: '作廢',
              onClick: () => handleVoidCheck(row),
              variant: 'danger',
              hidden: row.status !== 'pending',
            },
          ]}
        />
      ),
    },
  ]

  const handleClearCheck = async (check: Check) => {
    const confirmed = await confirm(`確定標記支票 ${check.check_number} 為已兌現？`, {
      title: '確認兌現',
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('checks')
        .update({ status: 'cleared' })
        .eq('id', check.id)
      if (error) throw error
      loadChecks()
    } catch (error) {
      logger.error('更新票據狀態失敗:', error)
      toast.error(COMMON_MESSAGES.OPERATION_FAILED)
    }
  }

  const handleVoidCheck = async (check: Check) => {
    const confirmed2 = await confirm(`確定作廢支票 ${check.check_number}？`, {
      title: '確認作廢',
      type: 'warning',
    })
    if (!confirmed2) return

    try {
      const { error } = await supabase
        .from('checks')
        .update({ status: 'voided' })
        .eq('id', check.id)
      if (error) throw error
      loadChecks()
    } catch (error) {
      logger.error('更新票據狀態失敗:', error)
      toast.error('操作失敗，請稍後再試')
    }
  }

  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  // 統計資料
  const stats = {
    pending: checks.filter(c => c.status === 'pending').length,
    pendingAmount: checks.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    overdue: checks.filter(c => c.status === 'pending' && new Date(c.due_date) < new Date()).length,
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b">
          <div className="bg-status-warning-bg p-4 rounded-lg">
            <div className="text-sm text-status-warning mb-1">{PAGE_LABELS.UNCASHED_CHECKS}</div>
            <div className="text-2xl font-bold text-status-warning">{stats.pending} 張</div>
          </div>
          <div className="bg-status-info/10 p-4 rounded-lg">
            <div className="text-sm text-status-info mb-1">{PAGE_LABELS.UNCASHED_AMOUNT}</div>
            <div className="text-2xl font-bold text-morandi-primary">
              ${stats.pendingAmount.toLocaleString()}
            </div>
          </div>
          <div className="bg-status-danger/10 p-4 rounded-lg">
            <div className="text-sm text-status-danger mb-1">{PAGE_LABELS.OVERDUE_CHECKS}</div>
            <div className="text-2xl font-bold text-morandi-primary">{stats.overdue} 張</div>
          </div>
        </div>

        <div className="flex-1">
          <ListPageLayout
            title={t('checkManagement')}
            data={checks}
            columns={columns}
            loading={isLoading}
            searchable={false}
            primaryAction={{
              label: '新增票據',
              icon: Plus,
              onClick: handleCreate,
            }}
          />
        </div>
      </div>

      <CreateCheckDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadChecks}
      />
    </>
  )
}
