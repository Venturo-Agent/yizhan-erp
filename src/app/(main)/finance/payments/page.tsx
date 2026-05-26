'use client'
/**
 * 收款管理頁面（B 階段：伺服器主導分頁）
 *
 * 功能：
 * 1. 收款單列表（含 [全部 / 團體收款 / 公司收款] 三 tab）
 * 2. 「只看未付」篩選（丙案：分頁情境下「未付」當篩選、不當排序）
 * 3. 支援 4 種收款方式（現金/匯款/刷卡/支票）
 * 4. 會計確認實收金額流程
 *
 * 資料層（紅線 F）：
 * - 讀取走 useReceiptsListView（伺服器分頁 + tab + 未付篩選 + server 搜尋/排序）。
 * - 列動作（核准/編輯/刪除）+ 樂觀更新走 useReceiptListActions。
 * - 寫入後 refreshAll() 同刷兩個 cache：entity（給 tours/treasury/reports 共用）+ 本頁 list-view 分頁 key。
 */

import { logger } from '@/lib/utils/logger'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Plus, Edit2, CheckSquare, Undo2, Printer, XCircle } from 'lucide-react'
import { confirm, prompt } from '@/lib/ui/alert-dialog'
import { toast } from 'sonner'
import { DateCell, StatusCell, CurrencyCell, ActionCell } from '@/components/table-cells'

type ReceiptTabValue = 'all' | 'tour' | 'company'
type ReceiptStatusFilter = 'all' | 'unpaid'

interface ReceiptTabConfig {
  value: ReceiptTabValue
  label: string
}

// Dynamic imports for dialogs (reduce initial bundle)
const AddReceiptDialog = dynamic(
  () => import('./_components/AddReceiptDialog').then(m => m.AddReceiptDialog),
  { loading: () => null }
)
const RefundReceiptDialog = dynamic(
  () => import('./_components/RefundReceiptDialog').then(m => m.RefundReceiptDialog),
  { loading: () => null }
)
const ReceiptPrintDialog = dynamic(
  () => import('./_components/ReceiptPrintDialog').then(m => m.ReceiptPrintDialog),
  { loading: () => null }
)

// Hooks
import { useReceiptsListView } from './_hooks/useReceiptsListView'
import { useReceiptListActions } from './_hooks/useReceiptListActions'
import { invalidateReceipts, invalidatePaymentRequests } from '@/data'
import { apiMutate } from '@/lib/swr/api-mutate'

// Types
import type { Receipt } from '@/stores'
import { useBranches } from '@/data/hooks/useBranches'

const PAGE_SIZE = 15

export default function PaymentsPage() {
  const t = useTranslations('finance')
  const { branches } = useBranches()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { can, loading: permLoading } = useCapabilities()

  // 讀取 URL 參數（從快速收款按鈕傳入）
  const urlOrderId = searchParams.get('order_id')
  const urlTourId = searchParams.get('tour_id')

  // 列表狀態（伺服器分頁）
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ReceiptTabValue>('all')
  const [statusFilter, setStatusFilter] = useState<ReceiptStatusFilter>('all')
  const [sortBy, setSortBy] = useState('receipt_date')
  // 預設排序（待確認舊在上/已確認新在上 + 狀態分群）由 useReceiptsListView 的 list_sort_group/list_sort_key 決定。
  // sortBy==='receipt_date' 時走那組生成欄；sortOrder 只在使用者點「其他欄位」排序時才生效。
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // UI 狀態（對話框）
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [refundingReceipt, setRefundingReceipt] = useState<Receipt | null>(null)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)

  // 根據 capability 顯示 tab
  const canTour = can(CAPABILITIES.FINANCE_READ_PAYMENTS)
  const canCompany = can(CAPABILITIES.FINANCE_READ_PAYMENTS_COMPANY)

  const visibleTabs = useMemo<ReceiptTabConfig[]>(() => {
    const tabs: ReceiptTabConfig[] = []
    if (canTour || canCompany) tabs.push({ value: 'all', label: '全部' })
    if (canTour) tabs.push({ value: 'tour', label: '團體收款' })
    if (canCompany) tabs.push({ value: 'company', label: '公司收款' })
    return tabs
  }, [canTour, canCompany])

  // 伺服器分頁讀取（tab 範圍 + 未付篩選 + server 搜尋/排序、見 useReceiptsListView）
  const {
    items: rawReceipts,
    totalCount,
    loading,
    refresh: refreshListView,
  } = useReceiptsListView({
    page,
    pageSize: PAGE_SIZE,
    tab: activeTab,
    canTour,
    canCompany,
    statusFilter,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortOrder,
  })

  // 寫入後同刷兩個 cache（難點、紅線 F）：
  // - entity（invalidateReceipts）：tours 財務分頁 / finance dashboard / treasury / reports 共用、不刷會顯示舊資料
  // - 本頁 list-view 分頁 key（refreshListView）：invalidateReceipts 刷不到這個 key
  const refreshAll = useCallback(async () => {
    // 收款核准若有手續費會自動產生「手續費請款單」(payment_request)→ 必失效 PR 快取、
    // 否則請款頁/其他 PR 讀取看不到那張單（C2 stale-read）
    await Promise.all([invalidateReceipts(), invalidatePaymentRequests()])
    await refreshListView()
  }, [refreshListView])

  // 列動作（核准/編輯/刪除）+ 樂觀更新；receipts = rawReceipts 套 optimistic 覆寫後
  const { receipts, handleConfirmReceipt, handleUpdateReceipt, handleDeleteReceipt } =
    useReceiptListActions(rawReceipts, refreshAll)

  // 如果有 URL 參數，自動開啟新增對話框
  useEffect(() => {
    if (urlOrderId) {
      setIsDialogOpen(true)
    }
  }, [urlOrderId])

  // 當對話框關閉時，清除 URL 參數和編輯狀態
  const handleAddDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingReceipt(null)
      if (urlOrderId) {
        // 清除 URL 參數，避免重新開啟
        router.replace('/finance/payments')
      }
    }
  }

  // 載入收款單進行編輯
  const loadReceiptForEdit = useCallback((receipt: Receipt) => {
    setEditingReceipt(receipt)
    setIsDialogOpen(true)
  }, [])

  // 客戶自助付款對帳:確認(pending_verify → confirmed)
  // William 2026-05-14 拍板:走 /api/payments/[id]/verify、不走既有 handleConfirmReceipt
  // 因為新流程要寫 verified_by / verified_at 審計欄位、且要走 capability 守門
  const handleVerifyPayment = useCallback(
    async (receiptId: string) => {
      const ok = await confirm(t('verifyConfirmMessage'))
      if (!ok) return
      try {
        const res = await apiMutate(`/api/payments/${receiptId}/verify`, { method: 'POST' })
        if (!res.ok) {
          toast.error(res.error || t('verifyFailed'))
          return
        }
        toast.success(t('verifySuccess'))
        await refreshAll()
      } catch (err) {
        logger.error('verify payment failed:', err)
        toast.error(t('paymentsNetworkError'))
      }
    },
    [refreshAll, t]
  )

  // 客戶自助付款對帳:退回(pending_verify → rejected、必填原因)
  const handleRejectPayment = useCallback(
    async (receiptId: string) => {
      const reason = await prompt(t('rejectPromptMessage'), {
        title: t('rejectPromptTitle'),
        placeholder: t('rejectPromptPlaceholder'),
      })
      if (!reason || !reason.trim()) return
      try {
        const res = await apiMutate(`/api/payments/${receiptId}/reject`, {
          method: 'POST',
          body: { reason: reason.trim() },
        })
        if (!res.ok) {
          toast.error(res.error || t('rejectFailed'))
          return
        }
        toast.success(t('rejectSuccess'))
        await refreshAll()
      } catch (err) {
        logger.error('reject payment failed:', err)
        toast.error(t('paymentsNetworkError'))
      }
    },
    [refreshAll, t]
  )

  // 處理列點擊 - 開啟編輯對話框
  const handleRowClick = useCallback(
    (receipt: Receipt) => {
      loadReceiptForEdit(receipt)
    },
    [loadReceiptForEdit]
  )

  // 表格欄位：tour_name 不設 width、由 table-fixed 自動吃剩餘空間、跟旅遊團列表一致
  const columns: TableColumn<Receipt>[] = [
    { key: 'receipt_number', label: t('receiptNumberCol'), sortable: true, width: '140px' },
    {
      key: 'receipt_date',
      label: t('receiptDateCol'),
      sortable: true,
      width: '90px',
      render: value => <DateCell date={String(value)} showIcon={false} />,
    },
    {
      // 分公司 column(2026-05-20 加):集中管帳場景下、會計要分清這筆收款是哪間分公司的
      key: 'branch_id' as keyof Receipt,
      label: '分公司',
      width: '100px',
      render: (_value, row) => {
        const branchId = (row as unknown as { branch_id?: string | null }).branch_id
        const branch = branches.find(b => b.id === branchId)
        return (
          <div className={`text-sm ${branch ? 'text-morandi-primary' : 'text-morandi-muted'}`}>
            {branch?.name || '—'}
          </div>
        )
      },
    },
    { key: 'tour_name', label: t('tourNameCol'), sortable: true },
    {
      key: 'receipt_amount',
      label: t('receiptAmountCol'),
      sortable: true,
      width: '120px',
      render: value => (
        <div className="whitespace-nowrap">
          <CurrencyCell amount={Number(value)} />
        </div>
      ),
    },
    {
      key: 'actual_amount',
      label: t('actualAmountCol'),
      sortable: true,
      width: '120px',
      // 實收金額：核准前顯示灰色短 dash
      render: (value, row) => {
        if (row.status !== 'confirmed') {
          return <span className="text-morandi-muted text-sm">-</span>
        }
        return (
          <div className="whitespace-nowrap">
            <CurrencyCell amount={Number(value) || 0} />
          </div>
        )
      },
    },
    {
      key: 'payment_method_id',
      label: t('paymentMethodCol'),
      width: '90px',
      // SSOT：唯一真相是 payment_methods.name (FK join)
      // 抓不到顯示「-」、不再用 5 大類中文 fallback 污染
      render: (_, row) => <span className="text-sm">{row.payment_methods?.name || '-'}</span>,
    },
    {
      key: 'status',
      label: t('statusCol'),
      width: '90px',
      render: value => <StatusCell type="receipt" status={String(value)} />,
    },
  ]

  const renderReceiptActions = (row: Receipt) => {
    const isPending = row.status === 'pending' || row.status === 'pending_verify'
    const isCompleted = row.status === 'confirmed' || row.status === 'refunded'
    const canRefund = row.status === 'confirmed' && !row.refunded_at

    return (
      <ActionCell
        actions={[
          ...(isPending
            ? [
                {
                  icon: CheckSquare,
                  label: '核准',
                  onClick: () => {
                    if (row.status === 'pending_verify') {
                      void handleVerifyPayment(row.id)
                    } else {
                      handleConfirmReceipt(row.id)
                    }
                  },
                  variant: 'success' as const,
                },
              ]
            : []),
          ...(isCompleted
            ? [
                {
                  icon: Printer,
                  label: '收據',
                  onClick: () => {
                    setPrintingReceipt(row)
                    setIsPrintDialogOpen(true)
                  },
                },
              ]
            : []),
          ...(row.status === 'pending_verify'
            ? [
                {
                  icon: XCircle,
                  label: t('rejectPayment'),
                  onClick: () => void handleRejectPayment(row.id),
                  variant: 'danger' as const,
                },
              ]
            : []),
          ...(canRefund
            ? [
                {
                  icon: Undo2,
                  label: '退款',
                  onClick: () => {
                    setRefundingReceipt(row)
                    setIsRefundDialogOpen(true)
                  },
                  variant: 'danger' as const,
                },
              ]
            : []),
          {
            icon: Edit2,
            label: isCompleted ? t('viewLabel') : t('editLabel'),
            onClick: () => loadReceiptForEdit(row),
          },
        ]}
      />
    )
  }

  if (permLoading) return null // ModuleGuard 已在外層顯示 loading
  if (!canTour && !canCompany) return <UnauthorizedPage />

  return (
    <>
      <ListPageLayout
        title={t('paymentManagement')}
        data={receipts}
        // 只在「真的沒資料」時顯示骨架屏；換頁/排序/切 tab 靠 keepPreviousData 保留前頁資料、不閃白
        loading={loading && receipts.length === 0}
        columns={columns}
        renderActions={renderReceiptActions}
        searchPlaceholder={t('searchReceiptPlaceholder')}
        searchValue={searchQuery}
        onSearchChange={value => {
          setSearchQuery(value)
          setPage(1) // 搜尋變更必歸第一頁、避免分頁錯位
        }}
        onRowClick={handleRowClick}
        defaultSort={{ key: sortBy, direction: sortOrder }}
        onSort={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
          setPage(1)
        }}
        serverPagination={{
          currentPage: page,
          pageSize: PAGE_SIZE,
          totalCount,
          onPageChange: setPage,
        }}
        primaryAction={{
          label: t('addPayment'),
          icon: Plus,
          onClick: () => setIsDialogOpen(true),
        }}
        statusTabs={visibleTabs.length > 1 ? visibleTabs : undefined}
        activeStatusTab={activeTab}
        onStatusTabChange={tab => {
          setActiveTab(tab as ReceiptTabValue)
          setPage(1) // 切 tab 必歸第一頁
        }}
        headerActions={
          // 丙案：分頁情境下「未付」當篩選、不當排序（比排序更直覺）
          <Select
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value as ReceiptStatusFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="unpaid">只看未付</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* 新增/編輯收款對話框 */}
      <AddReceiptDialog
        open={isDialogOpen}
        onOpenChange={handleAddDialogClose}
        onSuccess={refreshAll}
        defaultOrderId={urlOrderId || undefined}
        defaultTourId={urlTourId || undefined}
        editingReceipt={editingReceipt}
        onUpdate={handleUpdateReceipt}
        onDelete={handleDeleteReceipt}
      />

      {/* 退款對話框 */}
      <RefundReceiptDialog
        open={isRefundDialogOpen}
        onOpenChange={setIsRefundDialogOpen}
        receipt={refundingReceipt}
        onSuccess={() => {
          void refreshAll()
          setRefundingReceipt(null)
        }}
      />

      {/* 列印收據對話框 */}
      <ReceiptPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        receipt={printingReceipt}
      />
    </>
  )
}
