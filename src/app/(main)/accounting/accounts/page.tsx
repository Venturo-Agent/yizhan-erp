'use client'

import { useState, useEffect } from 'react'
import { useRealtimeReload } from '@/hooks/use-realtime-reload'
import { useRouter } from 'next/navigation'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Star, Edit, ChevronRight, ChevronDown } from 'lucide-react'
import { ActionCell } from '@/components/table-cells'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { updateChartOfAccount } from '@/data/entities/chart-of-accounts'
import { supabase } from '@/lib/supabase/client'
import { generateAccountChildCode } from '@/lib/codes'
import { useAuthStore } from '@/stores/auth-store'
import { CreateAccountDialog } from './components/CreateAccountDialog'
import { EditAccountDialog } from './components/EditAccountDialog'
import { ACCOUNTS_TABS } from './components/accounts-tabs'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

const PAGE_LABELS = {
  SYSTEM: '系統',
  FAVORITE_REMOVED: '已取消常用',
  FAVORITE_ADDED: '已標記為常用',
  UPDATE_FAILED: '更新失敗',
} as const

interface Account {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost' | string
  is_active: boolean | null
  is_system_locked: boolean | null
  is_favorite: boolean | null
  description: string | null
  parent_id: string | null
}

// 根據科目代碼計算層級（用於縮排）
function getAccountLevel(code: string): number {
  if (code.length === 1) return 0 // 大類：1, 2, 3...
  if (code.length === 2) return 1 // 中類：11, 12, 21...
  if (code.length === 4) return 2 // 明細：1100, 1110...
  if (code.includes('-')) return 3 // 子明細：1100-1, 1100-2...
  return 2
}

const typeConfig = {
  asset: { label: '資產', color: 'text-status-info' },
  liability: { label: '負債', color: 'text-status-danger' },
  equity: { label: '權益', color: 'text-morandi-secondary' },
  revenue: { label: '收入', color: 'text-status-success' },
  expense: { label: '費用', color: 'text-status-warning' },
  cost: { label: '成本', color: 'text-morandi-gold' },
}

export default function AccountsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const t = useTranslations('accounting')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [parentForNew, setParentForNew] = useState<Account | null>(null) // 新增子科目的父科目

  // 判斷科目是否有子科目
  const hasChildren = (accountId: string) => {
    return accounts.some(a => a.parent_id === accountId)
  }

  // 切換展開/折疊
  const toggleExpand = (accountId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  // 判斷科目是否應該顯示
  const isVisible = (account: Account): boolean => {
    if (!account.parent_id) return true // 頂層永遠顯示
    // 檢查所有祖先是否都展開
    let current = account
    while (current.parent_id) {
      if (!expandedIds.has(current.parent_id)) return false
      const parent = accounts.find(a => a.id === current.parent_id)
      if (!parent) break
      current = parent
    }
    return true
  }

  // 過濾可見的科目
  const visibleAccounts = accounts.filter(isVisible)

  // 建議的下一個子科目編號（透過 RPC + advisory lock 防競態）
  const [suggestedChildCode, setSuggestedChildCode] = useState('')

  // 新增子科目
  const handleAddChild = async (parent: Account) => {
    setParentForNew(parent)
    setSuggestedChildCode('') // 清空、避免閃過上一次的值

    if (user?.workspace_id) {
      try {
        const code = await generateAccountChildCode(user.workspace_id, parent.code)
        setSuggestedChildCode(code)
      } catch (err) {
        logger.error('產生子科目編號失敗', err)
      }
    }

    setCreateDialogOpen(true)
  }
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [user?.workspace_id])

  const loadAccounts = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select(
          'id, code, name, account_type, description, is_system_locked, is_active, workspace_id, parent_id, created_at, updated_at'
        )
        .eq('workspace_id', user.workspace_id)
        .order('code', { ascending: true })

      if (error) throw error
      // 補上 is_favorite 預設值（DB 可能沒有這個欄位）
      setAccounts(
        (data || []).map(d => ({
          ...d,
          is_favorite: ((d as Record<string, unknown>).is_favorite as boolean) ?? false,
        }))
      )
    } catch (error) {
      logger.error('載入科目失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 同事改科目表 → 自動重載（北極星 V2「同事改同步」）。chart_of_accounts 已在 realtime publication。
  useRealtimeReload('chart_of_accounts', loadAccounts)

  const toggleFavorite = async (accountId: string, currentFavorite: boolean) => {
    try {
      await updateChartOfAccount(accountId, { is_favorite: !currentFavorite })

      // 更新本地状态
      setAccounts(prev =>
        prev.map(acc => (acc.id === accountId ? { ...acc, is_favorite: !currentFavorite } : acc))
      )

      toast.success(currentFavorite ? PAGE_LABELS.FAVORITE_REMOVED : PAGE_LABELS.FAVORITE_ADDED)
    } catch (error) {
      logger.error('更新常用狀態失敗:', error)
      toast.error(PAGE_LABELS.UPDATE_FAILED)
    }
  }

  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setEditDialogOpen(true)
  }

  const columns: TableColumn<Account>[] = [
    {
      key: 'favorite',
      label: '常用',
      width: '60px',
      render: (_: unknown, row: Account) => (
        <button
          onClick={() => toggleFavorite(row.id, row.is_favorite || false)}
          className="hover:scale-110 transition-transform"
        >
          <Star
            size={18}
            className={
              row.is_favorite ? 'fill-status-warning text-status-warning' : 'text-muted-foreground'
            }
          />
        </button>
      ),
    },
    {
      key: 'code',
      label: '科目代號',
      width: '100px',
      render: (_: unknown, row: Account) => (
        <span className="font-mono font-semibold">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: '科目名稱',
      render: (_: unknown, row: Account) => {
        const level = getAccountLevel(row.code)
        const indent = level * 20 // 每層縮排 20px
        const hasChild = hasChildren(row.id)
        const isExpanded = expandedIds.has(row.id)

        return (
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            {hasChild ? (
              <button
                onClick={e => {
                  e.stopPropagation()
                  toggleExpand(row.id)
                }}
                className="mr-1 p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-5" /> // 占位符，保持對齊
            )}
            <span
              className={`font-medium ${level === 0 ? 'text-base font-bold' : level === 1 ? 'font-semibold' : ''}`}
            >
              {row.name}
            </span>
          </div>
        )
      },
    },
    {
      key: 'account_type',
      label: '類型',
      width: '100px',
      render: (_: unknown, row: Account) => {
        const config = typeConfig[row.account_type as keyof typeof typeConfig]
        if (!config) return <Badge variant="outline">-</Badge>
        return (
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: 'description',
      label: '說明',
      render: (_: unknown, row: Account) => (
        <span className="text-sm text-muted-foreground">{row.description || '-'}</span>
      ),
    },
    {
      key: 'is_system_locked',
      label: '系統科目',
      width: '100px',
      render: (_: unknown, row: Account) =>
        row.is_system_locked ? <Badge variant="secondary">{PAGE_LABELS.SYSTEM}</Badge> : null,
    },
    {
      key: 'is_active',
      label: '狀態',
      width: '80px',
      render: (_: unknown, row: Account) => (
        <Badge variant={row.is_active ? 'default' : 'outline'}>
          {row.is_active ? '啟用' : '停用'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      width: '180px',
      // 只收「操作欄按鈕」（新增子科目 / 編輯）進 ActionCell；
      // 樹狀展開/折疊（在科目名稱欄）與標記常用星星（在常用欄）屬「非操作欄」互動、保留原樣不收。
      render: (_: unknown, row: Account) => (
        <ActionCell
          actions={[
            {
              icon: Plus,
              label: t('addChildAccount'),
              onClick: () => handleAddChild(row),
            },
            {
              icon: Edit,
              label: '編輯',
              onClick: () => handleEdit(row),
            },
          ]}
        />
      ),
    },
  ]

  const handleCreate = () => {
    setParentForNew(null)
    setCreateDialogOpen(true)
  }

  return (
    <>
      <ListPageLayout
        title={t('accountChartManagementWithCount', { count: accounts.length })}
        statusTabs={ACCOUNTS_TABS}
        activeStatusTab="/accounting/accounts"
        onStatusTabChange={href => router.push(href)}
        data={visibleAccounts}
        columns={columns}
        loading={isLoading}
        searchable={false}
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => {
                // 展開所有
                const allIds = accounts.filter(a => hasChildren(a.id)).map(a => a.id)
                setExpandedIds(new Set(allIds))
              }}
            >
              全部展開
            </Button>
            <Button variant="soft-gold" size="sm" onClick={() => setExpandedIds(new Set())}>
              全部折疊
            </Button>
          </div>
        }
        primaryAction={{
          label: '新增科目',
          icon: Plus,
          onClick: handleCreate,
        }}
      />

      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadAccounts}
        parentAccount={parentForNew}
        suggestedCode={suggestedChildCode}
      />

      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadAccounts}
        account={selectedAccount as unknown as Parameters<typeof EditAccountDialog>[0]['account']}
      />
    </>
  )
}
