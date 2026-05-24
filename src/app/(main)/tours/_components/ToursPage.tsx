'use client'
/**
 * ToursPage - Main tours list page component
 * 支援三種開團方式：正式開團 / 提案 / 模板
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useQuotesSlim, useOrdersSlim } from '@/data'
import { useItineraries } from '@/data'
import { useTourOperations } from '../_hooks/useTourOperations'
import { useTourActionButtons } from './TourActionButtons'
import { useToursPage } from '../_hooks/useToursPage'
import { useToursDialogs } from '../_hooks/useToursDialogs'
import type { Tour } from '@/stores/types'
import { useToursForm } from '../_hooks/useToursForm'
import { TourFilters } from './TourFilters'
import { TourTable } from './TourTable'
import { TourFormShell } from './TourFormShell'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ArchiveReasonDialog } from './ArchiveReasonDialog'
import { LinkItineraryToTourDialog } from './LinkItineraryToTourDialog'
import { TourItineraryDialog } from './TourItineraryDialog'
import { ConvertToTourDialog } from './ConvertToTourDialog'
import { TourEditDialog } from '@/app/(main)/tours/_components/tour-edit-dialog'
import { alert } from '@/lib/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AddOrderForm, OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { createOrder } from '@/data/entities/orders'
import { generateOrderNumber } from '@/lib/codes'
import { toast } from 'sonner'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { logger } from '@/lib/utils/logger'


const COMPONENT_LABELS = {
  ORDER_CREATED: '訂單建立成功',
  PROPOSAL_DUPLICATED: '已複製為新提案',
  DUPLICATE_FAILED: '複製失敗',
} as const

export const ToursPage: React.FC = () => {
  const t = useTranslations('tour')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()

  // Edit dialog state (using TourEditDialog instead of TourForm for edit mode)
  const [editDialogTour, setEditDialogTour] = useState<Tour | null>(null)

  // Convert dialog state (提案/模板轉正式團)
  const [convertDialogTour, setConvertDialogTour] = useState<Tour | null>(null)

  // Add order dialog state (報名訂單)
  const [addOrderDialogTour, setAddOrderDialogTour] = useState<Tour | null>(null)

  // 🔧 優化：只保留 quotes（TourActionButtons 需要），其他由 useTourOperations 內部處理
  const { items: quotes } = useQuotesSlim()
  const { items: allOrders } = useOrdersSlim()
  const { items: itineraries } = useItineraries({ all: true })

  // Build a map of tour_id → first order's sales_person/assistant for display in tour table
  const ordersByTourId = useMemo(() => {
    const map = new Map<string, { sales_person: string | null; assistant: string | null }>()
    for (const order of allOrders) {
      if (order.tour_id && !map.has(order.tour_id)) {
        map.set(order.tour_id, {
          sales_person: order.sales_person ?? null,
          assistant: order.assistant ?? null,
        })
      }
    }
    return map
  }, [allOrders])

  // 🔧 對話框狀態
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    type: string | null
    data: Tour | null
  }>({ isOpen: false, type: null, data: null })

  const openDialog = useCallback((type: string, data?: unknown) => {
    setDialogState({ isOpen: true, type, data: (data as Tour) || null })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState({ isOpen: false, type: null, data: null })
  }, [])

  const {
    filteredTours,
    loading,
    currentPage,
    setCurrentPage,
    totalCount,
    activeStatusTab,
    setActiveStatusTab,
    searchQuery,
    setSearchQuery,
    state,
    actions,
    handleSortChange,
  } = useToursPage()

  const {
    itineraryDialogTour,
    openItineraryDialog,
    closeItineraryDialog,
    tourItineraryDialogTour,
    openTourItineraryDialog: _openTourItineraryDialog,
    closeTourItineraryDialog,
    archiveDialogTour,
    isArchiving,
    openArchiveDialog,
    closeArchiveDialog,
    confirmArchive,
    deleteConfirm,
    openDeleteDialog,
    closeDeleteDialog,
  } = useToursDialogs()

  const {
    submitting,
    setSubmitting,
    formError,
    setFormError,
    newTour,
    setNewTour,
    newOrder,
    setNewOrder,
    getStatusColor,
    setSelectedTour,
  } = state

  const { handleOpenCreateDialog, resetForm, handleNavigationEffect } = useToursForm({
    state,
    openDialog,
  })

  // Handler for opening edit dialog (now uses TourEditDialog instead of TourForm)
  const handleOpenEditDialog = useCallback((tour: Tour) => {
    setEditDialogTour(tour)
  }, [])

  // Handler for closing edit dialog
  const handleCloseEditDialog = useCallback(() => {
    setEditDialogTour(null)
  }, [])

  // 🔧 優化：useTourOperations 不再需要外部傳入 quotes/itineraries/addOrder 等
  const operations = useTourOperations({
    actions,
    resetForm,
    closeDialog,
    setSubmitting,
    setFormError,
    workspaceId: user?.workspace_id,
  })

  const handleAddTour = useCallback(async () => {
    const fromQuoteId = searchParams.get('fromQuote')
    operations.handleAddTour(newTour, newOrder, fromQuoteId ?? undefined)
  }, [operations, newTour, newOrder, searchParams])

  // 防連點：刪除提交中（紅線：五大方向 5 防連點）
  const [isDeleting, setIsDeleting] = useState(false)
  const handleDeleteTour = useCallback(async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const result = await operations.handleDeleteTour(deleteConfirm.tour)
      closeDeleteDialog()
      if (result.success) {
        actions.refresh()
      } else if (result.error) {
        await alert(result.error, 'error')
      }
    } finally {
      setIsDeleting(false)
    }
  }, [operations, deleteConfirm.tour, closeDeleteDialog, actions, isDeleting])

  // 處理報名（建立訂單）
  const handleAddOrder = useCallback(
    async (orderData: OrderFormData) => {
      try {
        const tour = addOrderDialogTour
        if (!tour) return

        // 訂單編號走 RPC + advisory lock、防同 tour 並發新增撞號
        const orderNumber = await generateOrderNumber(orderData.tour_id)

        // 從 tour.selling_price_per_person 估算初始金額
        const sellingPricePerPerson = tour.selling_price_per_person || 0
        const estimatedPeople = orderData.member_count || 2
        const initialTotalAmount = sellingPricePerPerson * estimatedPeople

        await createOrder({
          order_number: orderNumber,
          tour_id: orderData.tour_id,
          tour_name: tour.name,
          contact_person: orderData.contact_person,
          sales_person: orderData.sales_person,
          member_count: orderData.member_count || 0,
          total_amount: orderData.total_amount || initialTotalAmount,
          paid_amount: 0,
          payment_status: 'unpaid',
          remaining_amount: orderData.total_amount || initialTotalAmount,
          workspace_id: user?.workspace_id,
        })
        toast.success(COMPONENT_LABELS.ORDER_CREATED)
        setAddOrderDialogTour(null)
        router.push(`/tours/${tour.code}?tab=orders`)
      } catch (error) {
        toast.error('建立訂單失敗，請稍後再試')
      }
    },
    [user?.workspace_id, addOrderDialogTour, allOrders, router]
  )

  // 開團轉換（提案 → 正式團）
  const handleConvertTour = useCallback((tour: Tour) => {
    setConvertDialogTour(tour)
  }, [])

  // 複製模板 → 新提案（status='proposal'、清空團號與日期）
  const handleCopyTemplate = useCallback(
    async (tour: Tour) => {
      try {
        const { id: _id, created_at: _c, updated_at: _u, ...rest } = tour
        await actions.create({
          ...rest,
          name: `${tour.name} (副本)`,
          status: TOUR_STATUS.PROPOSAL,
          code: '',
          departure_date: null,
          return_date: null,
          archived: false,
          archive_reason: null,
        } as Omit<Tour, 'id' | 'created_at' | 'updated_at'>)
        toast.success(COMPONENT_LABELS.PROPOSAL_DUPLICATED)
      } catch (err) {
        logger.error('複製模板失敗', err)
        toast.error(COMPONENT_LABELS.DUPLICATE_FAILED)
      }
    },
    [actions]
  )

  const { renderActions } = useTourActionButtons({
    quotes,
    activeStatusTab,
    user,
    operations,
    onEditTour: handleOpenEditDialog,
    setSelectedTour,
    setDeleteConfirm: state => state.tour && openDeleteDialog(state.tour),
    onAddOrder: setAddOrderDialogTour,
    itineraries,
    onOpenItineraryDialog: openItineraryDialog,
    onOpenArchiveDialog: openArchiveDialog,
    onOpenRequirementsDialog: undefined,
    onConvertTour: handleConvertTour,
    onCopyTemplate: handleCopyTemplate,
  })

  // 點擊整列導航到詳情頁面
  const handleRowClick = useCallback(
    (row: unknown) => {
      const item = row as Tour
      router.push(`/tours/${item.code}`)
    },
    [router]
  )

  // 開團（正式團）
  const handleOpenTourDialog = useCallback(async () => {
    // 硬 gate：沒有出帳銀行帳戶不能開團
    const res = await fetch('/api/setup/status').then(r => r.ok ? r.json() : null).catch(() => null)
    if (res) {
      const bankTodo = res.todos?.find((t: { key: string; done: boolean }) => t.key === 'bank_accounts')
      if (bankTodo && !bankTodo.done) {
        await alert('請先設定至少一個出帳銀行帳戶，才能建立旅遊團。\n\n前往：財務設定 → 銀行帳戶', 'warning')
        return
      }
    }
    handleOpenCreateDialog()
  }, [handleOpenCreateDialog])

  // 提案（客戶詢價）
  const handleOpenProposalDialog = useCallback(() => {
    setNewTour({
      name: '',
      countryId: '',
      countryName: '',
      countryCode: '',
      cityCode: '',
      departure_date: '',
      return_date: '',
      price: 0,
      status: TOUR_STATUS.PROPOSAL,
      isSpecial: false,
      max_participants: 20,
      description: '',
    })
    openDialog('create')
  }, [setNewTour, openDialog])

  // 開模板（標準行程）
  const handleOpenTemplateDialog = useCallback(() => {
    setNewTour({
      name: '',
      countryId: '',
      countryName: '',
      countryCode: '',
      cityCode: '',
      departure_date: '',
      return_date: '',
      price: 0,
      status: TOUR_STATUS.TEMPLATE,
      isSpecial: false,
      max_participants: 20,
      description: '',
    })
    openDialog('create')
  }, [setNewTour, openDialog])

  const handleConvertConfirm = useCallback(
    async (
      tour: Tour,
      payload: {
        departure_date: string
        return_date: string
        controller_id: string
        city_code?: string
        orderData?: {
          contact_person?: string
          sales_person?: string
          member_count?: number
          total_amount?: number
        }
      }
    ) => {
      await operations.handleConvertToOfficial(tour, payload)
    },
    [operations]
  )

  useEffect(() => {
    handleNavigationEffect()
  }, [handleNavigationEffect])

  return (
    <div className="h-full flex flex-col">
      <TourFilters
        searchQuery={searchQuery}
        onSearchChange={(query: string) => {
          setSearchQuery(query)
          setCurrentPage(1)  // 搜尋時回第一頁、避免落在空頁
        }}
        activeTab={activeStatusTab}
        onTabChange={(tab: string) => {
          setActiveStatusTab(tab)
          setCurrentPage(1)
        }}
        onAddTour={handleOpenTourDialog}
        onAddProposal={handleOpenProposalDialog}
        onAddTemplate={handleOpenTemplateDialog}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <TourTable
            tours={filteredTours}
            loading={loading}
            onSort={handleSortChange}
            onRowClick={handleRowClick}
            renderActions={renderActions}
            getStatusColor={getStatusColor}
            ordersByTourId={ordersByTourId}
            activeTab={activeStatusTab}
            onConvertTour={handleConvertTour}
            serverPagination={{
              currentPage,
              pageSize: state.pageSize,
              totalCount,
              onPageChange: setCurrentPage,
            }}
          />
        </div>
      </div>

      {/* TourForm only for create mode */}
      <TourFormShell
        isOpen={dialogState.isOpen && dialogState.type === 'create'}
        onClose={() => {
          resetForm()
          closeDialog()
        }}
        mode="create"
        newTour={newTour}
        setNewTour={setNewTour}
        newOrder={newOrder}
        setNewOrder={setNewOrder}
        submitting={submitting}
        formError={formError}
        onSubmit={handleAddTour}
        isFromProposal={false}
      />

      {/* TourEditDialog for edit mode */}
      {editDialogTour && (
        <TourEditDialog
          isOpen={!!editDialogTour}
          onClose={handleCloseEditDialog}
          tour={editDialogTour}
          onSuccess={() => {
            // Refresh is handled by SWR mutate in the hook
          }}
        />
      )}

      {/* ConvertToTourDialog for proposal/template → official */}
      <ConvertToTourDialog
        isOpen={!!convertDialogTour}
        onClose={() => setConvertDialogTour(null)}
        tour={convertDialogTour}
        onConvert={handleConvertConfirm}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        tour={deleteConfirm.tour}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteTour}
        loading={isDeleting}
      />

      <ArchiveReasonDialog
        isOpen={!!archiveDialogTour}
        tour={archiveDialogTour}
        onClose={closeArchiveDialog}
        onConfirm={reason => confirmArchive(reason, operations.handleArchiveTour)}
        loading={isArchiving}
      />

      {itineraryDialogTour && (
        <LinkItineraryToTourDialog
          isOpen={!!itineraryDialogTour}
          onClose={closeItineraryDialog}
          tour={itineraryDialogTour}
        />
      )}

      {/* 行程表選擇對話框 */}
      {tourItineraryDialogTour && (
        <TourItineraryDialog
          isOpen={!!tourItineraryDialogTour}
          onClose={closeTourItineraryDialog}
          tour={tourItineraryDialogTour}
        />
      )}

      {/* 報名對話框（新增訂單） */}
      <Dialog
        open={!!addOrderDialogTour}
        onOpenChange={open => !open && setAddOrderDialogTour(null)}
      >
        <DialogContent level={1} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('toursPageEnrollPrefix')} {addOrderDialogTour?.name}
            </DialogTitle>
          </DialogHeader>
          {addOrderDialogTour && (
            <AddOrderForm
              tourId={addOrderDialogTour.id}
              onSubmit={handleAddOrder}
              onCancel={() => setAddOrderDialogTour(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
