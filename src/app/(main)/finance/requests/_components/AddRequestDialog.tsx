import { useEffect, useState, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useResetOnTabChange } from '@/hooks/useResetOnTabChange'
import { EditableRequestItemList } from './RequestItemList'
import { CreateSupplierDialog } from './CreateSupplierDialog'
import { CostTransferDialog } from './CostTransferDialog'
import { BatchTabContent } from './AddRequestDialog.batch-tab'
import { RequestMode, AddRequestDialogProps } from './AddRequestDialog.types'
import {
  saveEditedRequest,
  deleteEditedRequest,
  handleEditOpenChange,
} from './AddRequestDialog.edit-ops'
import { submitNewRequest } from './AddRequestDialog.submit'
import { useEditModeItems } from '../_hooks/useEditModeItems'
import { useRequestForm } from '../_hooks/useRequestForm'
import { useRequestOperations } from '../_hooks/useRequestOperations'
import { useAddRequestDialogState } from '../_hooks/useAddRequestDialogState'
import { usePayments } from '@/app/(main)/finance/payments/_hooks/usePayments'
import { RequestItem } from '../_types'
import { usePaymentMethodsCached } from '@/data/hooks'
import { useExpenseCategories } from '@/data/entities'
import { logger } from '@/lib/utils/logger'
import { getTodayString, getNextWeekday } from '@/lib/utils/format-date'
import { useWorkspaceId } from '@/lib/workspace-context'
import { useLayoutContext } from '@/lib/auth/useLayoutContext'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { useTranslations } from 'next-intl'
import { useTourOptions } from '@/hooks'
import { AddRequestDialogHeader } from './AddRequestDialogHeader'
import { AddRequestDialogFooter } from './AddRequestDialogFooter'

export function AddRequestDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultTourId,
  defaultOrderId,
  editingRequest,
  readOnly = false,
  level = 1,
}: AddRequestDialogProps) {
  const t = useTranslations('finance')
  // activeTab 提前宣告：傳給 useRequestForm 決定訂單載入策略（單筆只撈選定團、批次才全撈）
  const [activeTab, setActiveTab] = useState<RequestMode>('tour')
  // 公司預設出帳日（admin 在 /settings/company 設定、存 workspaces.default_billing_day_of_week）
  //   → 新請款單預設帶「下一個該星期幾」（今天就是該天則填今天）；公司沒設定則退回今天
  const { payload } = useLayoutContext()
  const defaultBillingDay = payload.workspace?.default_billing_day_of_week ?? null
  const defaultRequestDate =
    defaultBillingDay !== null ? getNextWeekday(defaultBillingDay) : getTodayString()
  // === 共用 Hooks ===
  const {
    formData,
    setFormData,
    requestItems,
    filteredOrders,
    total_amount,
    addNewEmptyItem,
    updateItem,
    removeItem,
    resetForm,
    suppliers,
    tours,
    orders,
    currentUser,
  } = useRequestForm({ mode: activeTab, defaultDate: defaultRequestDate })

  const { createRequest } = useRequestOperations()
  const { createPaymentRequest, addPaymentItem } = usePayments()
  const workspaceId = useWorkspaceId()
  const { can } = useCapabilities()
  const canCreateCompanyPayment = can(CAPABILITIES.FINANCE_MANAGE_REQUESTS)
  const { methods: paymentMethods } = usePaymentMethodsCached('payment')
  // 2026-05-21 Phase 2：類別 id → name 反查（給 submit 時帶 category 文字欄位、過渡期雙寫）
  const { items: allExpenseCats } = useExpenseCategories({ all: true })

  // === 共用狀態 ===
  const [costTransferOpen, setCostTransferOpen] = useState(false)
  const isEditMode = !!editingRequest

  // 切 tab 時清空表單（編輯模式停用）
  useResetOnTabChange(activeTab, resetForm, !isEditMode)

  // === 批量/供應商 state 集中管理 ===
  const {
    batchDate,
    setBatchDate,
    batchCategoryId,
    setBatchCategoryId,
    batchSupplierId,
    setBatchSupplierId,
    batchPaymentMethodId,
    setBatchPaymentMethodId,
    tourAllocations,
    isSubmitting,
    setIsSubmitting,
    importFromRequests,
    selectedRequestItems,
    selectedRequestTotal,
    selectedRequestCount,
    addTourAllocation,
    removeTourAllocation,
    updateTourAllocation,
    selectTour: selectTourFromHook,
    createSupplierDialogOpen,
    pendingSupplierName,
    handleCreateSupplier,
    handleSupplierCreated: handleSupplierCreatedFromHook,
    handleSupplierDialogClose,
    resetBatchState,
  } = useAddRequestDialogState(defaultRequestDate)

  // tour_requests 系統未啟用、stub
  const tourRequestItems: Array<{
    id: string
    quotedCost?: number
    estimatedCost?: number
    category: string
    supplierId: string
    supplierName: string
    title: string
  }> = []

  // === Edit mode 管理 ===
  const {
    currentRequest,
    editBatchRequests,
    setEditBatchRequests,
    selectedRequestId,
    setSelectedRequestId,
    localItems,
    localPaymentMethodId,
    isDirty,
    setIsDirty,
    deletedItemIds,
    setDeletedItemIds,
    newItemIds,
    setNewItemIds,
    refreshRequestItems,
    handleEditUpdateItem,
    handleEditRemoveItem,
    handleEditAddItem,
  } = useEditModeItems({ open, editingRequest, isEditMode })

  const isEditBatch = editBatchRequests.length > 1
  const canEdit = isEditMode ? !readOnly && currentRequest?.status === 'pending' : true

  // === 計算值 ===
  const activeTours = useMemo(() => {
    return tours.filter(tour => {
      const t = tour as unknown as { is_active?: boolean | null }
      return !tour.archived && t.is_active !== false && tour.status !== '特殊團'
    })
  }, [tours])

  const availableTours = useMemo(() => {
    const selectedIds = new Set(tourAllocations.filter(a => a.tour_id).map(a => a.tour_id))
    return activeTours.filter(tour => !selectedIds.has(tour.id)).slice(0, 50)
  }, [activeTours, tourAllocations])

  const totalAllocatedAmount = useMemo(
    () => tourAllocations.reduce((sum, a) => sum + a.allocated_amount, 0),
    [tourAllocations]
  )

  const batchSupplierName = useMemo(
    () => suppliers.find(s => s.id === batchSupplierId)?.name || '',
    [suppliers, batchSupplierId]
  )

  const tourOptions = useTourOptions(activeTours)
  const orderOptions = filteredOrders.map(o => ({
    value: o.id,
    label: `${o.order_number} - ${o.contact_person || t('receiptNoContact')}`,
  }))

  // Bind tours for selectTour
  const selectTour = (index: number, tourId: string) => selectTourFromHook(index, tourId, tours)

  // Bind activeTab for handleSupplierCreated
  const handleSupplierCreated = (supplierId: string) =>
    handleSupplierCreatedFromHook(supplierId, activeTab)

  // === 初始化 ===
  useEffect(() => {
    if (!open) return

    if (isEditMode && editingRequest) {
      setActiveTab(editingRequest.request_category === 'company' ? 'company' : 'tour')
      const rec = editingRequest as unknown as Record<string, string | null | undefined>
      setFormData(prev => ({
        ...prev,
        tour_id: editingRequest.tour_id || '',
        order_id: rec.order_id || '',
        request_date: editingRequest.request_date || prev.request_date,
        payment_method_id: rec.payment_method_id || undefined,
      }))
      return
    }

    resetBatchState()

    const initialize = async () => {
      if (defaultTourId) {
        setActiveTab('tour')
        setFormData(prev => ({
          ...prev,
          request_category: 'tour',
          tour_id: defaultTourId,
          order_id: defaultOrderId || '',
          // 從團頁帶入時不走 resetForm、補上公司預設出帳日（否則停在 mount 時的舊值）
          request_date: defaultRequestDate,
          is_special_billing: false,
        }))
      } else {
        resetForm()
      }
    }
    initialize().catch(err => logger.error('[initialize]', err))
  }, [
    open,
    defaultTourId,
    defaultOrderId,
    resetForm,
    setFormData,
    isEditMode,
    editingRequest,
    resetBatchState,
    defaultRequestDate,
  ])

  // 自動帶入訂單
  useEffect(() => {
    if (formData.tour_id && filteredOrders.length === 1 && !formData.order_id) {
      setFormData(prev => ({ ...prev, order_id: filteredOrders[0].id }))
    }
  }, [formData.tour_id, filteredOrders, formData.order_id, setFormData])

  // === Edit mode: save / delete / close ===
  const handleSave = async () => {
    if (!currentRequest || isSubmitting) return
    await saveEditedRequest({
      currentRequest,
      localItems,
      deletedItemIds,
      newItemIds,
      suppliers,
      localPaymentMethodId,
      formData,
      orders,
      refreshRequestItems,
      onSuccess: onSuccess ?? (() => {}),
      onOpenChange,
      setIsDirty,
      setDeletedItemIds,
      setNewItemIds,
      setIsSubmitting,
      // 2026-05-28：自動拆單 — 編輯模式存檔依品項日期分組、原單留主組、其他組各開新單
      defaultBillingDay,
      currentUserName: currentUser?.display_name || currentUser?.chinese_name || '',
      createRequest: createRequest as unknown as (
        formData: Record<string, unknown>,
        items: RequestItem[],
        tourName: string,
        tourCode: string,
        orderNumber: string | undefined,
        userName: string,
        code?: string
      ) => Promise<{ id: string } | null>,
    })
  }

  const handleDelete = async () => {
    if (!currentRequest || isSubmitting) return
    await deleteEditedRequest({
      currentRequest,
      isEditBatch,
      editBatchRequests,
      setEditBatchRequests,
      setSelectedRequestId,
      onOpenChange,
      setIsSubmitting,
      onSuccess: onSuccess ?? (() => {}),
    })
  }

  const handleDialogOpenChange = async (newOpen: boolean) => {
    await handleEditOpenChange(
      newOpen,
      isDirty,
      isEditMode,
      setIsDirty,
      setDeletedItemIds,
      setNewItemIds,
      onOpenChange
    )
  }

  // === 新增：handleCancel / handleSubmit ===
  const handleCancel = () => {
    resetForm()
    resetBatchState()
    setIsSubmitting(false)
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    await submitNewRequest({
      activeTab,
      workspaceId,
      formData,
      requestItems,
      tourAllocations,
      totalAllocatedAmount,
      batchCategoryId,
      batchSupplierId,
      batchSupplierName,
      batchPaymentMethodId,
      batchDate,
      importFromRequests,
      selectedRequestCount,
      selectedRequestItems,
      tourRequestItems,
      tours,
      orders,
      expenseCategories: allExpenseCats ?? [],
      currentUserName: currentUser?.display_name || currentUser?.chinese_name || '',
      createPaymentRequest: createPaymentRequest as unknown as (
        data: Record<string, unknown>
      ) => Promise<{ id: string }>,
      addPaymentItem: addPaymentItem as unknown as (
        requestId: string,
        data: Record<string, unknown>
      ) => Promise<void>,
      createRequest: createRequest as unknown as (
        formData: Record<string, unknown>,
        items: RequestItem[],
        tourName: string,
        tourCode: string,
        orderNumber: string | undefined,
        userName: string,
        code?: string
      ) => Promise<void>,
      onCancel: handleCancel,
      onSuccess,
      setIsSubmitting,
    })
  }

  // === 渲染 ===
  return (
    <>
      <Dialog open={open} onOpenChange={isEditMode ? handleDialogOpenChange : onOpenChange}>
        <DialogContent
          level={level}
          className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col overflow-hidden"
        >
          <Tabs
            value={activeTab}
            onValueChange={
              isEditMode
                ? undefined
                : v => {
                    const mode = v as RequestMode
                    setActiveTab(mode)
                    setFormData(prev => ({
                      ...prev,
                      request_category: mode === 'company' ? 'company' : 'tour',
                    }))
                  }
            }
            className="flex-1 flex flex-col overflow-hidden"
          >
            <AddRequestDialogHeader
              activeTab={activeTab}
              isEditMode={isEditMode}
              canCreateCompanyPayment={canCreateCompanyPayment}
              currentRequest={currentRequest}
              isEditBatch={isEditBatch}
              editBatchRequests={editBatchRequests}
              selectedRequestId={selectedRequestId}
              formData={formData}
              batchDate={batchDate}
              tourOptions={tourOptions}
              orderOptions={orderOptions}
              onTabChange={mode => {
                setActiveTab(mode)
                setFormData(prev => ({
                  ...prev,
                  request_category: mode === 'company' ? 'company' : 'tour',
                }))
              }}
              onTourChange={value =>
                setFormData(prev => ({ ...prev, tour_id: value, order_id: '' }))
              }
              onOrderChange={value => setFormData(prev => ({ ...prev, order_id: value }))}
              onBatchDateChange={date => setBatchDate(date)}
              onSelectRequestId={id => setSelectedRequestId(id)}
            />

            {/* 團體請款 */}
            <TabsContent
              value="tour"
              className="flex-1 overflow-y-auto pt-4 border-t border-morandi-container/30 space-y-6"
            >
              <EditableRequestItemList
                items={isEditMode ? localItems : requestItems}
                suppliers={suppliers}
                updateItem={isEditMode ? handleEditUpdateItem : updateItem}
                removeItem={isEditMode ? handleEditRemoveItem : removeItem}
                addNewEmptyItem={isEditMode ? handleEditAddItem : addNewEmptyItem}
                onCreateSupplier={handleCreateSupplier}
                tourId={formData.tour_id || null}
                disabled={isEditMode && !canEdit}
                paymentMethods={paymentMethods}
                hideDateColumn={isEditMode}
                onTransfer={
                  isEditMode && !canEdit && currentRequest
                    ? () => setCostTransferOpen(true)
                    : undefined
                }
              />
            </TabsContent>

            {/* 批量請款 */}
            <BatchTabContent
              tourAllocations={tourAllocations}
              availableTours={availableTours}
              orders={orders}
              suppliers={suppliers}
              paymentMethods={paymentMethods}
              batchCategoryId={batchCategoryId}
              batchSupplierId={batchSupplierId}
              batchPaymentMethodId={batchPaymentMethodId}
              totalAllocatedAmount={totalAllocatedAmount}
              onUpdateAllocation={updateTourAllocation}
              onAddAllocation={addTourAllocation}
              onRemoveAllocation={removeTourAllocation}
              onSelectTour={selectTour}
              onCategoryChange={setBatchCategoryId}
              onSupplierChange={setBatchSupplierId}
              onPaymentMethodChange={setBatchPaymentMethodId}
              onCreateSupplier={handleCreateSupplier}
            />

            {/* 公司請款 */}
            {canCreateCompanyPayment && (
              <TabsContent
                value="company"
                className="flex-1 overflow-y-auto pt-4 border-t border-morandi-container/30 space-y-6"
              >
                <EditableRequestItemList
                  items={isEditMode ? localItems : requestItems}
                  suppliers={suppliers}
                  updateItem={isEditMode ? handleEditUpdateItem : updateItem}
                  removeItem={isEditMode ? handleEditRemoveItem : removeItem}
                  addNewEmptyItem={isEditMode ? handleEditAddItem : addNewEmptyItem}
                  onCreateSupplier={handleCreateSupplier}
                  tourId={formData.tour_id || null}
                  disabled={isEditMode && !canEdit}
                  paymentMethods={paymentMethods}
                  hideDateColumn={false}
                  expenseTypeMode
                  payeeIsEmployee={
                    formData.expense_type === 'BNS' || formData.expense_type === 'SAL'
                  }
                />
              </TabsContent>
            )}
          </Tabs>

          <AddRequestDialogFooter
            isEditMode={isEditMode}
            canEdit={canEdit}
            activeTab={activeTab}
            isSubmitting={isSubmitting}
            isDirty={isDirty}
            localItems={localItems}
            totalAllocatedAmount={totalAllocatedAmount}
            importFromRequests={importFromRequests}
            selectedRequestTotal={selectedRequestTotal}
            total_amount={total_amount}
            tourAllocations={tourAllocations}
            batchCategory={batchCategoryId}
            requestItems={requestItems}
            formData={formData}
            selectedRequestCount={selectedRequestCount}
            onDelete={handleDelete}
            onSave={handleSave}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      <CreateSupplierDialog
        open={createSupplierDialogOpen}
        onOpenChange={handleSupplierDialogClose}
        defaultName={pendingSupplierName}
        onSuccess={handleSupplierCreated}
      />

      {currentRequest && (
        <CostTransferDialog
          open={costTransferOpen}
          onOpenChange={setCostTransferOpen}
          sourceRequest={{
            id: currentRequest.id,
            code: currentRequest.code || currentRequest.request_number || '',
            tourId: currentRequest.tour_id || '',
            tourCode: currentRequest.tour_code || '',
            tourName: currentRequest.tour_name || '',
            amount: currentRequest.amount || 0,
            items: (localItems || []).map(item => ({
              id: item.id,
              description: item.description,
              subtotal: item.unit_price * item.quantity,
              supplier_name: item.supplierName || undefined,
            })),
          }}
          onSuccess={() => {
            onSuccess?.()
            onOpenChange(false)
          }}
        />
      )}
    </>
  )
}
