'use client'
/**
 * 收款管理頁面（重構版）
 *
 * 功能：
 * 1. 收款單列表（含 [全部 / 團體收款 / 公司收款] 三 tab）
 * 2. 支援 4 種收款方式（現金/匯款/刷卡/支票）
 * 4. 會計確認實收金額流程
 * 5. Realtime 即時同步
 */

import { logger } from '@/lib/utils/logger'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Plus, Edit2, CheckSquare, Undo2, Printer, Layers, XCircle } from 'lucide-react'
import { confirm, prompt } from '@/lib/ui/alert-dialog'
import { toast } from 'sonner'
import { DateCell, StatusCell, CurrencyCell } from '@/components/table-cells'
import { isTourReceipt, isCompanyReceipt } from '@/lib/finance/type-guards'

type ReceiptTabValue = 'all' | 'tour' | 'company'

interface ReceiptTabConfig {
  value: ReceiptTabValue
  label: string
}

// Dynamic imports for dialogs (reduce initial bundle)
const AddReceiptDialog = dynamic(
  () => import('./_components/AddReceiptDialog').then(m => m.AddReceiptDialog),
  { loading: () => null }
)
const BatchReceiptDialog = dynamic(
  () => import('./_components/BatchReceiptDialog').then(m => m.BatchReceiptDialog),
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
import { usePaymentData } from './hooks/usePaymentData'

// Utils

// Types
import type { Receipt } from '@/stores'

export default function PaymentsPage() {
  const t = useTranslations('finance')
  const searchParams = useSearchParams()
  const router = useRouter()

  // 資料與業務邏輯
  const {
    receipts,
    loading,
    invalidateReceipts,
    handleConfirmReceipt,
    handleUpdateReceipt,
    handleDeleteReceipt,
  } = usePaymentData()
  const { can, loading: permLoading } = useCapabilities()

  // 讀取 URL 參數（從快速收款按鈕傳入）
  const urlOrderId = searchParams.get('order_id')
  const urlTourId = searchParams.get('tour_id')

  // UI 狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [refundingReceipt, setRefundingReceipt] = useState<Receipt | null>(null)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ReceiptTabValue>('all')

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

  // Tab filter + 預設排序：待確認優先 + 日期最早優先（讓 user 看到最遠還沒處理的）
  const filteredByTab = useMemo(() => {
    let list: typeof receipts
    if (activeTab === 'all') {
      list = receipts.filter(r => {
        if (canTour && isTourReceipt(r)) return true
        if (canCompany && isCompanyReceipt(r)) return true
        return false
      })
    } else if (activeTab === 'tour') list = receipts.filter(isTourReceipt)
    else if (activeTab === 'company') list = receipts.filter(isCompanyReceipt)
    else list = receipts

    return [...list].sort((a, b) => {
      // 1. 「待會計處理」status 排最前(pending_verify = 客戶自助付款待對帳、pending = 會計手動建未核准)
      const isPendingA = a.status === 'pending' || a.status === 'pending_verify' ? 0 : 1
      const isPendingB = b.status === 'pending' || b.status === 'pending_verify' ? 0 : 1
      if (isPendingA !== isPendingB) return isPendingA - isPendingB
      // 2. 同 status 內、receipt_date 早的在前
      const aDate = a.receipt_date ? new Date(a.receipt_date).getTime() : 0
      const bDate = b.receipt_date ? new Date(b.receipt_date).getTime() : 0
      return aDate - bDate
    })
  }, [receipts, activeTab, canTour, canCompany])

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
        const res = await fetch(`/api/payments/${receiptId}/verify`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error || t('verifyFailed'))
          return
        }
        toast.success(t('verifySuccess'))
        await invalidateReceipts()
      } catch (err) {
        logger.error('verify payment failed:', err)
        toast.error(t('paymentsNetworkError'))
      }
    },
    [invalidateReceipts]
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
        const res = await fetch(`/api/payments/${receiptId}/reject`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error || t('rejectFailed'))
          return
        }
        toast.success(t('rejectSuccess'))
        await invalidateReceipts()
      } catch (err) {
        logger.error('reject payment failed:', err)
        toast.error(t('paymentsNetworkError'))
      }
    },
    [invalidateReceipts]
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
      render: (_, row) => (
        <span className="text-sm">{row.payment_methods?.name || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: t('statusCol'),
      width: '90px',
      render: value => <StatusCell type="receipt" status={String(value)} />,
    },
  ]

  // 操作欄固定三槽：[主操作] [退款/退回] [鉛筆]
  // 中間槽用 spacer 佔位、讓鉛筆永遠在同一欄
  const renderReceiptActions = (row: Receipt) => {
    const isPending = row.status === 'pending' || row.status === 'pending_verify'
    const isCompleted = row.status === 'confirmed' || row.status === 'refunded'
    const canRefund = row.status === 'confirmed' && !row.refunded_at

    return (
      <div className="flex items-center gap-1 whitespace-nowrap">
        {/* 槽 1: 主操作 */}
        {isPending && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async e => {
              e.stopPropagation()
              if (row.status === 'pending_verify') {
                await handleVerifyPayment(row.id)
              } else {
                await handleConfirmReceipt(row.id)
                await invalidateReceipts()
              }
            }}
            className="h-7 px-2 text-xs text-morandi-green hover:text-morandi-green hover:bg-morandi-green/10"
          >
            <CheckSquare size={14} className="mr-1" />
            核准
          </Button>
        )}
        {isCompleted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              setPrintingReceipt(row)
              setIsPrintDialogOpen(true)
            }}
            className="h-7 px-2 text-xs text-morandi-secondary hover:text-morandi-primary"
          >
            <Printer size={14} className="mr-1" />
            收據
          </Button>
        )}

        {/* 槽 2: 退回 / 退款，或 spacer 佔位 */}
        {row.status === 'pending_verify' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              void handleRejectPayment(row.id)
            }}
            className="h-7 px-2 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
          >
            <XCircle size={14} className="mr-1" />
            {t('rejectPayment')}
          </Button>
        )}
        {canRefund && (
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              setRefundingReceipt(row)
              setIsRefundDialogOpen(true)
            }}
            className="h-7 px-2 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
          >
            <Undo2 size={14} className="mr-1" />
            退款
          </Button>
        )}
        {!row.status.startsWith('pending') && !canRefund && (
          <div className="h-7 w-[52px] shrink-0" />
        )}

        {/* 槽 3: 鉛筆永遠在最後 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            loadReceiptForEdit(row)
          }}
          className="h-7 px-2 text-xs text-morandi-secondary hover:text-morandi-primary"
        >
          <Edit2 size={14} className="mr-1" />
          {isCompleted ? t('viewLabel') : t('editLabel')}
        </Button>
      </div>
    )
  }

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
  if (!canTour && !canCompany) return <UnauthorizedPage />

  return (
    <>
      <ListPageLayout
        title={t('paymentManagement')}
        data={filteredByTab}
        loading={loading}
        columns={columns}
        renderActions={renderReceiptActions}
        searchFields={['receipt_number', 'tour_name']}
        searchPlaceholder={t('searchReceiptPlaceholder')}
        onRowClick={handleRowClick}
        // 不設 defaultSort、用 filteredByTab 已經 sort 過的順序（status pending → 日期 asc）
        initialPageSize={15}
        primaryAction={{
          label: t('addPayment'),
          icon: Plus,
          onClick: () => setIsDialogOpen(true),
        }}
        headerActions={
          <Button
            variant="header-outline"
            size="sm"
            onClick={() => setIsBatchDialogOpen(true)}
            className="mr-2"
          >
            <Layers size="0.95em" className="mr-1" />
            批量收款
          </Button>
        }
        statusTabs={visibleTabs.length > 1 ? visibleTabs : undefined}
        activeStatusTab={activeTab}
        onStatusTabChange={tab => setActiveTab(tab as ReceiptTabValue)}
      />

      {/* 新增/編輯收款對話框 */}
      <AddReceiptDialog
        open={isDialogOpen}
        onOpenChange={handleAddDialogClose}
        onSuccess={invalidateReceipts}
        defaultOrderId={urlOrderId || undefined}
        defaultTourId={urlTourId || undefined}
        editingReceipt={editingReceipt}
        onUpdate={handleUpdateReceipt}
        onDelete={handleDeleteReceipt}
      />

      {/* 批量收款對話框 */}
      <BatchReceiptDialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen} />

      {/* 退款對話框 */}
      <RefundReceiptDialog
        open={isRefundDialogOpen}
        onOpenChange={setIsRefundDialogOpen}
        receipt={refundingReceipt}
        onSuccess={() => {
          invalidateReceipts()
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
