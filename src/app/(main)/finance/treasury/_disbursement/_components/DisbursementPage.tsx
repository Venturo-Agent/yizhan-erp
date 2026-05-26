'use client'
/**
 * DisbursementPage
 * 出納單管理主頁面
 *
 * 設計理念：
 * - 單一列表：全部出納單一覽、分類顯示在欄位內
 * - 點 pending 列 → 編輯 / 點 paid 列 → 詳情
 * - 分類差異化在「預覽」（PrintDisbursementPreview）時才呈現
 *
 * Phase 7（2026-05-17）：銀行欄位改顯示「玉山 3 筆 / 台新 2 筆」摘要
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableColumn } from '@/components/ui/enhanced-table'
import {
  useDisbursementOrders,
  deleteDisbursementOrder as deleteDisbursementOrderApi,
  updateDisbursementOrder as updateDisbursementOrderApi,
  updatePaymentRequest as updatePaymentRequestApi,
  invalidatePaymentRequests,
  invalidateDisbursementOrders,
} from '@/data'
import { useLinkedPaymentRequests } from '../_hooks/useLinkedPaymentRequests'
import { DateCell, CurrencyCell, ActionCell } from '@/components/table-cells'
import { DisbursementOrder } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'
import { CreateDisbursementWizardDialog } from './CreateDisbursementWizardDialog'
import { DisbursementPrintDialog } from './DisbursementPrintDialog'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { apiPost } from '@/lib/api/client'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth-store'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'

// Phase 7：銀行帳戶 group 摘要（per disbursement_order）
interface BankGroupSummary {
  bank_name: string
  item_count: number
}

/**
 * 撈 disbursement_order_items + bank_accounts，建立「出納單 → 銀行 group 摘要」map
 * 格式：Map<order_id, "玉山 3 筆 / 台新 2 筆">
 */
function useDisbursementBankGroupSummaries(workspaceId: string | undefined) {
  const [summaryMap, setSummaryMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!workspaceId) return
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamicFrom escape hatch
      const { data } = await (supabase as any)
        .from('disbursement_order_items')
        .select(
          'disbursement_order_id, from_bank_account_id, bank_accounts:from_bank_account_id(name)'
        )
        .eq('workspace_id', workspaceId)

      if (!data) return

      type DoiRow = {
        disbursement_order_id: string
        from_bank_account_id: string
        bank_accounts: { name: string } | null
      }

      // 計算每個 order 的 bank group count
      const orderBankMap = new Map<string, Map<string, number>>()
      for (const row of data as DoiRow[]) {
        if (!row.disbursement_order_id || !row.from_bank_account_id) continue
        if (!orderBankMap.has(row.disbursement_order_id)) {
          orderBankMap.set(row.disbursement_order_id, new Map())
        }
        const bankMap = orderBankMap.get(row.disbursement_order_id)!
        bankMap.set(row.from_bank_account_id, (bankMap.get(row.from_bank_account_id) ?? 0) + 1)
      }

      // 把 bank_account_id → name 備查
      const bankNameMap = new Map<string, string>()
      for (const row of data as DoiRow[]) {
        if (row.from_bank_account_id && row.bank_accounts?.name) {
          bankNameMap.set(row.from_bank_account_id, row.bank_accounts.name)
        }
      }

      // 組 summary 字串
      const result = new Map<string, string>()
      for (const [orderId, bankMap] of orderBankMap.entries()) {
        const groups: BankGroupSummary[] = Array.from(bankMap.entries()).map(([bankId, count]) => ({
          bank_name: bankNameMap.get(bankId) ?? bankId.slice(-4),
          item_count: count,
        }))
        result.set(orderId, groups.map(g => `${g.bank_name} ${g.item_count} 筆`).join(' / '))
      }
      setSummaryMap(result)
    })()
  }, [workspaceId])

  return summaryMap
}

export function DisbursementPage() {
  const t = useTranslations('finance')
  const { items: disbursement_orders } = useDisbursementOrders({ all: true })
  // 只撈「已連動到出納單」的請款單（最少欄位）、不再全撈整張表（效能 #2、見 useLinkedPaymentRequests）
  const { items: linkedRequests, refresh: refreshLinkedRequests } = useLinkedPaymentRequests()

  const user = useAuthStore(state => state.user)
  const bankGroupSummaries = useDisbursementBankGroupSummaries(user?.workspace_id)
  const { can, loading: permLoading } = useCapabilities()
  const canManage = can(CAPABILITIES.FINANCE_MANAGE_DISBURSEMENT)

  // 寫入後同刷兩個 cache（紅線 F）：entity（其他財務頁共用）+ 本頁 linkedRequests 分頁 key
  const refreshAll = useCallback(async () => {
    await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])
    await refreshLinkedRequests()
  }, [refreshLinkedRequests])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DisbursementOrder | null>(null)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printOrder, setPrintOrder] = useState<DisbursementOrder | null>(null)

  // 2026-05-14 品項級重構：建立 / 編輯 dialog 各自 fetch、不再從 page level 傳 pendingRequests

  // 固定排序（2026-05-21 William 拍板）：未付款 → 已付款；未付款內舊→新（最久沒付先處理）、已付款內新→舊（最近歷史在前）
  const sortedOrders = useMemo(() => {
    return [...disbursement_orders].sort((a, b) => {
      const aPending = a.status === 'pending' ? 0 : 1
      const bPending = b.status === 'pending' ? 0 : 1
      if (aPending !== bPending) return aPending - bPending
      const aDate = new Date(a.disbursement_date || a.created_at || 0).getTime()
      const bDate = new Date(b.disbursement_date || b.created_at || 0).getTime()
      // pending：asc（舊→新）/ paid：desc（新→舊）
      return a.status === 'pending' ? aDate - bDate : bDate - aDate
    })
  }, [disbursement_orders])

  // 表格欄位（兩區共用）
  const columns: TableColumn<DisbursementOrder>[] = useMemo(
    () => [
      {
        key: 'order_number',
        label: '出納單號',
        width: '140px',
        render: (value: unknown) => (
          <div className="font-medium text-morandi-primary">{String(value || '自動產生')}</div>
        ),
      },
      // 「分公司」column 拿掉(William 2026-05-20 拍板):出納單是 batch 動作、
      // 一張出納單可能跨多個分公司請款合在一起匯、列「分公司」反而誤導
      // (集中管帳場景下、一張出納單可能塞台北 3 張 + 高雄 2 張、貼一個分公司標籤無意義)
      {
        key: 'disbursement_date',
        label: '出帳日期',
        width: '110px',
        render: (value: unknown) => (
          <DateCell
            date={value as string | null}
            showIcon={false}
            className="text-morandi-secondary"
          />
        ),
      },
      {
        key: 'request_count' as keyof DisbursementOrder,
        label: '請款單數',
        width: '80px',
        render: (_value: unknown, row: DisbursementOrder) => (
          <div className="text-center">
            {linkedRequests.filter(r => r.disbursement_order_id === row.id).length}{' '}
            {t('disbursementUnit')}
          </div>
        ),
      },
      {
        // Phase 7：銀行帳戶欄改顯示「玉山 3 筆 / 台新 2 筆」摘要
        key: 'bank_account_id' as keyof DisbursementOrder,
        label: '銀行帳戶',
        width: '180px',
        render: (_value: unknown, row: DisbursementOrder) => {
          const summary = bankGroupSummaries.get(row.id)
          if (!summary) return <span className="text-morandi-muted text-xs">—</span>
          return <span className="text-sm text-morandi-secondary">{summary}</span>
        },
      },
      {
        key: 'amount',
        label: '總金額',
        width: '120px',
        align: 'right',
        render: (value: unknown) => (
          <CurrencyCell amount={Number(value) || 0} className="font-semibold text-morandi-gold" />
        ),
      },
      {
        key: 'status',
        label: '狀態',
        width: '80px',
        render: (value: unknown) => (
          <StatusBadge type="disbursement" status={String(value ?? '')} />
        ),
      },
    ],
    [linkedRequests, bankGroupSummaries]
  )

  // 2026-05-22 William 拍板：砍 detail dialog（內容跟列印單重複）
  // 點擊列：pending → 編輯 / paid → 直接開列印預覽
  const handleRowClick = useCallback((order: DisbursementOrder) => {
    if (order.status === 'pending') {
      setEditingOrder(order)
      setIsCreateDialogOpen(true)
    } else {
      setPrintOrder(order)
      setIsPrintDialogOpen(true)
    }
  }, [])

  const handlePreview = useCallback((order: DisbursementOrder) => {
    setPrintOrder(order)
    setIsPrintDialogOpen(true)
  }, [])

  const handleConfirmPaid = useCallback(
    async (order: DisbursementOrder) => {
      const confirmed = await confirm(t('disbursementConfirmPaid'), {
        title: t('disbursementConfirmPaidTitle'),
        type: 'warning',
      })
      if (!confirmed) return

      try {
        await updateDisbursementOrderApi(order.id, {
          status: 'paid',
          confirmed_by: user?.id || null,
          confirmed_at: new Date().toISOString(),
        })

        // 出納確認付款 → 自動產生會計傳票
        try {
          if (user?.workspace_id) {
            await apiPost('/api/accounting/vouchers/auto-create', {
              source_type: 'disbursement_order',
              source_id: order.id,
              workspace_id: user.workspace_id,
            })
          }
        } catch (err) {
          logger.error('產生出納傳票失敗:', err)
        }

        const orderLinkedRequests = linkedRequests.filter(r => r.disbursement_order_id === order.id)
        const tour_ids_to_recalculate = new Set<string>()
        for (const req of orderLinkedRequests) {
          await updatePaymentRequestApi(req.id, { status: 'paid' })
          if (req.tour_id) tour_ids_to_recalculate.add(req.tour_id)
        }

        for (const tour_id of tour_ids_to_recalculate) {
          await recalculateExpenseStats(tour_id)
        }

        await refreshAll()

        await alert(t('disbursementMarkedAsPaid'), 'success')
      } catch (error) {
        logger.error('確認出帳失敗:', error)
        await alert('確認出帳失敗', 'error')
      }
    },
    [user, linkedRequests, refreshAll]
  )

  const handleDelete = useCallback(
    async (order: DisbursementOrder) => {
      const confirmed = await confirm(`確定要刪除出納單 ${order.order_number || order.id}？`, {
        title: '刪除出納單',
        type: 'warning',
      })
      if (!confirmed) return

      try {
        await deleteDisbursementOrderApi(order.id)
        // 刪單會把連動請款單的 disbursement_order_id 釋放 → null、計數欄需更新
        await refreshAll()
        await alert(t('disbursementDeleted'), 'success')
      } catch (error) {
        logger.error(t('disbursementDeleteFailedColon'), error)
        await alert(t('disbursementDeleteFailed'), 'error')
      }
    },
    [refreshAll]
  )

  const handleCreateSuccess = useCallback(async () => {
    setIsCreateDialogOpen(false)
    setEditingOrder(null)
    await refreshAll()
  }, [refreshAll])

  const handleAdd = useCallback(() => {
    setEditingOrder(null)
    setIsCreateDialogOpen(true)
  }, [])

  const handleCreateDialogClose = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) setEditingOrder(null)
  }, [])

  // 操作按鈕渲染（順序：預覽 → 編輯 → 出帳 → 刪除）
  // 純文字按鈕（無圖示）→ ActionButton.icon optional、不傳就只渲染 label
  const renderActions = (row: DisbursementOrder) => {
    const canAct = row.status === 'pending' && canManage
    return (
      <ActionCell
        actions={[
          {
            label: t('disbursementActionPreview'),
            onClick: () => handlePreview(row),
          },
          {
            label: t('disbursementActionEdit'),
            onClick: () => {
              setEditingOrder(row)
              setIsCreateDialogOpen(true)
            },
            hidden: !canAct,
          },
          {
            label: t('disbursementActionPay'),
            onClick: () => handleConfirmPaid(row),
            variant: 'success',
            hidden: !canAct,
          },
          {
            label: t('disbursementActionDelete'),
            onClick: () => handleDelete(row),
            variant: 'danger',
            hidden: !canAct,
          },
        ]}
      />
    )
  }

  if (permLoading) return null // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.FINANCE_READ_DISBURSEMENT)) return <UnauthorizedPage />

  return (
    <>
      <ListPageLayout<DisbursementOrder>
        title={t('disbursementManagement')}
        icon={Wallet}
        data={sortedOrders}
        columns={columns}
        searchable
        searchPlaceholder="搜尋出納單號..."
        searchFields={['order_number']}
        onRowClick={handleRowClick}
        renderActions={renderActions}
        actionsWidth="180px"
        primaryAction={
          canManage
            ? {
                label: '新增出納單',
                icon: Plus,
                onClick: handleAdd,
              }
            : undefined
        }
      />

      {/* Dialogs — 新增 / 編輯共用同一個 wizard（2026-05-15 William 拍板統一） */}
      <CreateDisbursementWizardDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        onSuccess={handleCreateSuccess}
        editingOrder={editingOrder}
      />
      {/* 2026-05-22 William 拍板：砍 DisbursementDetailDialog、paid row 點擊直接開列印單（內容相同、避免維護兩套 UI） */}
      <DisbursementPrintDialog
        order={printOrder}
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
      />
    </>
  )
}
