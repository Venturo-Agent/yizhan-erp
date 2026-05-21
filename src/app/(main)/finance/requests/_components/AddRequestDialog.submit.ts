/**
 * AddRequestDialog.submit.ts
 *
 * 新增請款單的提交邏輯（handleSubmit 三分支）。
 * 抽出來讓主 component 只負責 state 管理 + 渲染。
 */

import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { generateRequestNo } from '@/lib/codes'
import { RequestItem } from '../_types'
import { PaymentItemCategory, CompanyExpenseType } from '@/stores/types'
import { TourAllocation, RequestMode, COMPONENT_LABELS } from './AddRequestDialog.types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Tour {
  id: string
  code?: string | null
  name?: string | null
}

interface Order {
  id: string
  tour_id?: string | null
  order_number?: string | null
}

interface FormData {
  tour_id: string
  order_id: string
  request_date: string
  expense_type?: string
  request_category?: string
  payment_method_id?: string
}

export interface SubmitParams {
  activeTab: RequestMode
  workspaceId: string | null
  formData: FormData
  requestItems: RequestItem[]
  tourAllocations: TourAllocation[]
  totalAllocatedAmount: number
  batchCategory: PaymentItemCategory
  batchSupplierId: string
  batchSupplierName: string
  batchPaymentMethodId: string | undefined
  batchDate: string
  importFromRequests: boolean
  selectedRequestCount: number
  selectedRequestItems: Record<string, { selected: boolean; amount: number }>
  tourRequestItems: Array<{
    id: string
    quotedCost?: number
    estimatedCost?: number
    category: string
    supplierId: string
    supplierName: string
    title: string
  }>
  tours: Tour[]
  orders: Order[]
  currentUserName: string
  createPaymentRequest: (data: Record<string, unknown>) => Promise<{ id: string }>
  addPaymentItem: (requestId: string, data: Record<string, unknown>) => Promise<void>
  createRequest: (
    formData: Record<string, unknown>,
    items: RequestItem[],
    tourName: string,
    tourCode: string,
    orderNumber: string | undefined,
    userName: string,
    code?: string
  ) => Promise<void>
  onCancel: () => void
  onSuccess?: () => void
  setIsSubmitting: (v: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────────────────────────────────

export async function submitNewRequest(params: SubmitParams): Promise<void> {
  const {
    activeTab,
    workspaceId,
    formData,
    requestItems,
    tourAllocations,
    totalAllocatedAmount,
    batchCategory,
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
    currentUserName,
    createPaymentRequest,
    addPaymentItem,
    createRequest,
    onCancel,
    onSuccess,
    setIsSubmitting,
  } = params

  setIsSubmitting(true)
  try {
    if (!workspaceId) {
      void alert('無法取得工作空間，請重新登入', 'warning')
      return
    }

    if (activeTab === 'batch') {
      await submitBatch({
        tourAllocations,
        totalAllocatedAmount,
        batchCategory,
        batchSupplierId,
        batchSupplierName,
        batchPaymentMethodId,
        batchDate,
        workspaceId,
        createPaymentRequest,
        addPaymentItem,
        onCancel,
        onSuccess,
      })
    } else if (activeTab === 'company') {
      await submitCompany({
        formData,
        requestItems,
        createRequest,
        currentUserName,
        onCancel,
        onSuccess,
      })
    } else {
      await submitTour({
        formData,
        requestItems,
        importFromRequests,
        selectedRequestCount,
        selectedRequestItems,
        tourRequestItems,
        tours,
        orders,
        currentUserName,
        createRequest,
        onCancel,
        onSuccess,
      })
    }
  } catch (error) {
    logger.error('Failed to create payment request:', error)
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : '新增請款單失敗'
    void alert(message, 'error')
  } finally {
    setIsSubmitting(false)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch submit
// ─────────────────────────────────────────────────────────────────────────────

async function submitBatch({
  tourAllocations,
  totalAllocatedAmount,
  batchCategory,
  batchSupplierId,
  batchSupplierName,
  batchPaymentMethodId,
  batchDate,
  workspaceId,
  createPaymentRequest,
  addPaymentItem,
  onCancel,
  onSuccess,
}: {
  tourAllocations: TourAllocation[]
  totalAllocatedAmount: number
  batchCategory: PaymentItemCategory
  batchSupplierId: string
  batchSupplierName: string
  batchPaymentMethodId: string | undefined
  batchDate: string
  workspaceId: string
  createPaymentRequest: (data: Record<string, unknown>) => Promise<{ id: string }>
  addPaymentItem: (requestId: string, data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  onSuccess?: () => void
}) {
  const toSubmit = tourAllocations.filter(a => a.tour_id && a.allocated_amount > 0)

  if (toSubmit.length === 0) {
    void alert('請至少選擇一個旅遊團並輸入金額', 'warning')
    return
  }
  if (!batchCategory) {
    void alert(COMPONENT_LABELS.ALERT_NEED_CATEGORY, 'warning')
    return
  }
  if (totalAllocatedAmount === 0) {
    void alert('請款金額不能為 0', 'warning')
    return
  }

  const batchId = crypto.randomUUID()
  let successCount = 0
  let errorCount = 0

  for (const allocation of toSubmit) {
    try {
      const requestCode = await generateRequestNo(allocation.tour_code)
      const request = await createPaymentRequest({
        workspace_id: workspaceId,
        tour_id: allocation.tour_id,
        order_id: allocation.order_id || null,
        order_number: allocation.order_number || null,
        code: requestCode,
        request_number: requestCode,
        tour_code: allocation.tour_code,
        tour_name: allocation.tour_name,
        request_date: batchDate,
        amount: 0,
        status: 'pending',
        notes: '',
        request_type: '供應商支出',
        request_category: 'tour',
        supplier_id: batchSupplierId || null,
        supplier_name: batchSupplierName || null,
        batch_id: batchId,
        payment_method_id: batchPaymentMethodId || null,
      })

      await addPaymentItem(request.id, {
        category: batchCategory,
        supplier_id: batchSupplierId || '',
        supplier_name: batchSupplierName || null,
        description: batchCategory,
        unit_price: allocation.allocated_amount,
        quantity: 1,
        notes: '',
        sort_order: 1,
        payment_method_id: batchPaymentMethodId || null,
      })
      successCount++
    } catch (itemError) {
      logger.error(`Failed to create payment item (${allocation.tour_code}):`, itemError)
      errorCount++
    }
  }

  if (errorCount > 0) {
    await alert(`建立完成：成功 ${successCount} 筆，失敗 ${errorCount} 筆。請檢查失敗的請款單品項。`, 'warning')
  } else {
    await alert(`成功建立 ${successCount} 筆請款單（批次 ID: ${batchId.slice(0, 8)}...）`, 'success')
  }
  onCancel()
  onSuccess?.()
}

// ─────────────────────────────────────────────────────────────────────────────
// Company submit
// ─────────────────────────────────────────────────────────────────────────────

async function submitCompany({
  formData,
  requestItems,
  createRequest,
  currentUserName,
  onCancel,
  onSuccess,
}: {
  formData: FormData
  requestItems: RequestItem[]
  createRequest: (
    formData: Record<string, unknown>,
    items: RequestItem[],
    tourName: string,
    tourCode: string,
    orderNumber: string | undefined,
    userName: string,
    code?: string
  ) => Promise<void>
  currentUserName: string
  onCancel: () => void
  onSuccess?: () => void
}) {
  const validItems = requestItems.filter(item => item.category && item.unit_price > 0)
  if (validItems.length === 0) {
    void alert(COMPONENT_LABELS.ALERT_NEED_COMPANY_ITEM, 'warning')
    return
  }
  const groups = new Map<string, RequestItem[]>()
  for (const it of validItems) {
    const d = it.custom_request_date || getTodayString()
    if (!groups.has(d)) groups.set(d, [])
    groups.get(d)!.push(it)
  }
  const inferredExpenseType = validItems[0].category as unknown as CompanyExpenseType
  for (const [groupDate, groupItems] of groups) {
    await createRequest(
      { ...formData, expense_type: inferredExpenseType, request_date: groupDate },
      groupItems,
      '',
      '',
      undefined,
      currentUserName
    )
  }
  if (groups.size > 1) {
    await alert(
      `${COMPONENT_LABELS.ALERT_SPLIT_PREFIX}${groups.size}${COMPONENT_LABELS.ALERT_SPLIT_SUFFIX}`,
      'success'
    )
  }
  onCancel()
  onSuccess?.()
}

// ─────────────────────────────────────────────────────────────────────────────
// Tour submit
// ─────────────────────────────────────────────────────────────────────────────

async function submitTour({
  formData,
  requestItems,
  importFromRequests,
  selectedRequestCount,
  selectedRequestItems,
  tourRequestItems,
  tours,
  orders,
  currentUserName,
  createRequest,
  onCancel,
  onSuccess,
}: {
  formData: FormData
  requestItems: RequestItem[]
  importFromRequests: boolean
  selectedRequestCount: number
  selectedRequestItems: Record<string, { selected: boolean; amount: number }>
  tourRequestItems: Array<{
    id: string
    category: string
    supplierId: string
    supplierName: string
    title: string
  }>
  tours: Tour[]
  orders: Order[]
  currentUserName: string
  createRequest: (
    formData: Record<string, unknown>,
    items: RequestItem[],
    tourName: string,
    tourCode: string,
    orderNumber: string | undefined,
    userName: string,
    code?: string
  ) => Promise<void>
  onCancel: () => void
  onSuccess?: () => void
}) {
  const selectedTour = tours.find(t => t.id === formData.tour_id)
  const selectedOrder = orders.find(o => o.id === formData.order_id)

  if (!selectedTour) {
    void alert('請先選擇旅遊團', 'warning')
    return
  }

  let itemsToSubmit = requestItems
  if (importFromRequests && selectedRequestCount > 0) {
    itemsToSubmit = tourRequestItems
      .filter(item => selectedRequestItems[item.id]?.selected)
      .map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        custom_request_date: getTodayString(),
        payment_method_id: undefined,
        category: item.category as PaymentItemCategory,
        supplier_id: item.supplierId,
        supplierName: item.supplierName,
        description: item.title,
        unit_price: selectedRequestItems[item.id]?.amount || 0,
        quantity: 1,
      }))
  }

  const groups = new Map<string, RequestItem[]>()
  for (const it of itemsToSubmit) {
    const d = it.custom_request_date || formData.request_date
    if (!groups.has(d)) groups.set(d, [])
    groups.get(d)!.push(it)
  }

  const tourCode = selectedTour.code || ''
  for (const [groupDate, groupItems] of groups) {
    const code = await generateRequestNo(tourCode)
    await createRequest(
      { ...formData, request_date: groupDate },
      groupItems,
      selectedTour.name || '',
      tourCode,
      selectedOrder?.order_number ?? undefined,
      currentUserName,
      code
    )
  }

  if (groups.size > 1) {
    await alert(
      `${COMPONENT_LABELS.ALERT_SPLIT_PREFIX}${groups.size}${COMPONENT_LABELS.ALERT_SPLIT_SUFFIX}`,
      'success'
    )
  }
  onCancel()
  onSuccess?.()
}
