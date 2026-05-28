'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import dynamic from 'next/dynamic'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useRequestTable } from '@/app/(main)/finance/requests/_hooks/useRequestTable'
import {
  useRequestsListView,
  type RequestScopeTab,
  type RequestStatusFilter,
} from '@/app/(main)/finance/requests/_hooks/useRequestsListView'
import { invalidatePaymentRequests } from '@/data'
import { PaymentRequest } from '@/stores/types'
import { useTranslations } from 'next-intl'

// Dynamic imports for dialogs (reduce initial bundle)
const AddRequestDialog = dynamic(
  () =>
    import('@/app/(main)/finance/requests/_components/AddRequestDialog').then(
      m => m.AddRequestDialog
    ),
  { loading: () => null }
)

interface TabConfig {
  value: RequestScopeTab
  label: string
}

const PAGE_SIZE = 15

export default function RequestsPage() {
  const t = useTranslations('finance')
  const { can, loading: permLoading } = useCapabilities()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null)

  // 列表狀態（伺服器分頁）
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<RequestScopeTab>('all')
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all')
  const [sortBy, setSortBy] = useState('request_date')
  // 預設排序（未付舊在上/已付新在上 + 狀態分群）由 useRequestsListView 的 list_sort_group/list_sort_key 決定。
  // sortBy==='request_date' 時走那組生成欄；sortOrder 只在使用者點「其他欄位」排序時才生效。
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // 讀取 URL 參數（從快速請款按鈕傳入）
  const urlTourId = searchParams.get('tour_id')
  const urlOrderId = searchParams.get('order_id')

  // 如果有 URL 參數，自動開啟新增對話框
  useEffect(() => {
    if (urlTourId) {
      setIsAddDialogOpen(true)
    }
  }, [urlTourId])

  // 當對話框關閉時，清除 URL 參數
  const handleAddDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open && urlTourId) {
      router.replace('/finance/requests')
    }
  }

  // 根據 capability 顯示 tab
  const canTour = can(CAPABILITIES.FINANCE_READ_REQUESTS)
  const canCompany = can(CAPABILITIES.FINANCE_READ_REQUESTS_COMPANY)
  const canSalary = can(CAPABILITIES.FINANCE_READ_REQUESTS_SALARY)

  const visibleTabs = useMemo<TabConfig[]>(() => {
    const tabs: TabConfig[] = []
    // 至少有一個 capability 才顯示「全部」
    if (canTour || canCompany || canSalary) {
      tabs.push({ value: 'all', label: '全部' })
    }
    if (canTour) tabs.push({ value: 'tour', label: '團體請款' })
    if (canCompany) tabs.push({ value: 'company', label: '公司請款' })
    if (canSalary) tabs.push({ value: 'salary', label: '薪資' })
    return tabs
  }, [canTour, canCompany, canSalary])

  // 伺服器分頁讀取（tab 範圍 + 未付篩選 + server 搜尋/排序、見 useRequestsListView）
  const {
    items: paymentRequests,
    totalCount,
    loading,
    refresh: refreshListView,
  } = useRequestsListView({
    page,
    pageSize: PAGE_SIZE,
    tab: activeTab,
    canTour,
    canCompany,
    canSalary,
    statusFilter,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortOrder,
  })

  // 寫入後同刷兩個 cache（紅線 F）：
  // - entity（invalidatePaymentRequests）：treasury / disbursement / reports 共用、不刷會顯示舊資料
  // - 本頁 list-view 分頁 key（refreshListView）：invalidatePaymentRequests 刷不到這個 key
  const refreshAll = useCallback(async () => {
    await invalidatePaymentRequests()
    await refreshListView()
  }, [refreshListView])

  // 表格欄位（只取 columns、排序/分頁走 server）
  const { tableColumns } = useRequestTable(paymentRequests)

  // 點擊行打開詳細對話框
  const handleRowClick = (request: PaymentRequest) => {
    setSelectedRequest(request)
  }

  if (permLoading) return null // ModuleGuard 已在外層顯示 loading
  // 沒有任何 capability → 整頁擋
  if (!canTour && !canCompany && !canSalary) return <UnauthorizedPage />

  // 如果當前 tab 沒資格（例如沒人賦予 salary 但 URL 切到了），fallback 到第一個有資格的
  if (!visibleTabs.find(tab => tab.value === activeTab)) {
    const fallback = visibleTabs[0]?.value || 'all'
    if (fallback !== activeTab) {
      setActiveTab(fallback)
    }
  }

  return (
    <>
      <ListPageLayout
        title={t('requestsManage')}
        data={paymentRequests}
        // 只在「真的沒資料」時顯示骨架屏；換頁/排序/切 tab 靠 keepPreviousData 保留前頁資料、不閃白
        loading={loading && paymentRequests.length === 0}
        columns={tableColumns}
        searchPlaceholder="搜尋請款單號 / 團名 / 訂單編號"
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
          label: t('addRequest'),
          icon: Plus,
          onClick: () => setIsAddDialogOpen(true),
        }}
        statusTabs={visibleTabs.length > 1 ? visibleTabs : undefined}
        activeStatusTab={activeTab}
        onStatusTabChange={tab => {
          setActiveTab(tab as RequestScopeTab)
          setPage(1) // 切 tab 必歸第一頁
        }}
        headerActions={
          // 丙案：分頁情境下「未付」當篩選、不當排序（比排序更直覺）
          <Select
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value as RequestStatusFilter)
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
        rootDataTutorial="requests-header"
        tableDataTutorial="requests-table"
      />

      <AddRequestDialog
        open={isAddDialogOpen || !!selectedRequest}
        onOpenChange={open => {
          if (!open) {
            setIsAddDialogOpen(false)
            setSelectedRequest(null)
            handleAddDialogClose(open)
          }
        }}
        onSuccess={refreshAll}
        defaultTourId={urlTourId || undefined}
        defaultOrderId={urlOrderId || undefined}
        editingRequest={selectedRequest}
      />
    </>
  )
}
