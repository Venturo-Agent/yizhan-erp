/**
 * AddRequestDialog.edit-ops.ts
 *
 * 編輯模式的 DB 操作：儲存、刪除、關閉前確認。
 * 把這些 async 函式抽出來、讓主 component 保持簡潔。
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { alert as alertFn } from '@/lib/ui/alert-dialog'
import { invalidatePaymentRequests, deletePaymentRequest as deletePaymentRequestApi } from '@/data'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'
import { paymentRequestService } from '@/app/(main)/finance/payments/_services/payment-request.service'
import { nextPaymentRequestItemNumbers } from '@/lib/codes'
import { COMPONENT_LABELS } from './AddRequestDialog.types'
import {
  getItemsMissingPaymentMethod,
  confirmMissingPaymentMethod,
} from './AddRequestDialog.submit'
import { RequestItem } from '../_types'
import { PaymentRequest } from '@/stores/types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** 從 supplier list 查 supplier name（item 自帶 name 時直接用） */
export function resolveSupplierName(
  item: RequestItem,
  suppliers: Array<{ id: string; name?: string | null }>
): string | null {
  if (item.supplierName) return item.supplierName
  const id = item.supplier_id || item.selected_id
  if (!id) return null
  return suppliers.find(s => s.id === id)?.name || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveEditParams {
  currentRequest: PaymentRequest
  localItems: RequestItem[]
  deletedItemIds: string[]
  newItemIds: string[]
  suppliers: Array<{ id: string; name?: string | null }>
  localPaymentMethodId: string | null
  formData: {
    order_id?: string
    request_date?: string
    is_special_billing?: boolean
    created_by?: string
  }
  orders: Array<{ id: string; order_number?: string | null }>
  refreshRequestItems: () => Promise<void>
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
  setIsDirty: (v: boolean) => void
  setDeletedItemIds: (v: string[]) => void
  setNewItemIds: (v: string[]) => void
  setIsSubmitting: (v: boolean) => void
  // 2026-05-28：編輯模式自動拆單（mirror 新增模式的 group-by-date）
  /** 公司預設出帳星期幾（0=日…6=六）；null = 未設、不區分正常/特殊 */
  defaultBillingDay: number | null
  /** 當前使用者顯示名稱（給拆出來的新單 created_by_name 用）*/
  currentUserName: string
  /** 走 useRequestOperations.createRequest、處理 tour / company 編號 + 失敗回滾 */
  createRequest: (
    formData: Record<string, unknown>,
    items: RequestItem[],
    tourName: string,
    tourCode: string,
    orderNumber: string | undefined,
    userName: string,
    code?: string
  ) => Promise<{ id: string } | null>
}

export async function saveEditedRequest({
  currentRequest,
  localItems,
  deletedItemIds,
  newItemIds,
  suppliers,
  localPaymentMethodId,
  formData,
  orders,
  refreshRequestItems,
  onSuccess: _onSuccess,
  onOpenChange,
  setIsDirty,
  setDeletedItemIds,
  setNewItemIds,
  setIsSubmitting,
  defaultBillingDay,
  currentUserName,
  createRequest,
}: SaveEditParams): Promise<void> {
  // 付款方式軟提醒（B 方案）— 用 localItems 跟 localPaymentMethodId 對齊
  const itemsForCheck = localItems.map(i => ({
    description: i.description,
    unit_price: i.unit_price,
    quantity: i.quantity,
    payment_method_id: i.payment_method_id,
  }))
  const missing = getItemsMissingPaymentMethod(itemsForCheck, localPaymentMethodId)
  const allowSave = await confirmMissingPaymentMethod(missing)
  if (!allowSave) return

  setIsSubmitting(true)
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 2026-05-28：編輯模式自動拆單
    // ─────────────────────────────────────────────────────────────────────
    // 跟新增模式（submit.ts submitTour / submitCompany）同一個 group-by-date 概念：
    //   - 1 組 → 原單就是這個日期（不拆、可能改自身 request_date）
    //   - N 組（N≥2）→ 原單留主組、其他組各開新單
    //     主組 = 原 request_date 還有人 → 留那組（最自然）；
    //          否則 = 任一組（取第一個）→ 原單採用那組的日期
    // ═══════════════════════════════════════════════════════════════════════

    // === 1. 依品項日期分組 ===
    // 2026-05-28 修：originalDate 優先讀 formData.request_date（使用者在 dialog 改的、單一真相）；
    // 否則 fallback 到 currentRequest.request_date（改之前 / 從 DB 來的）。
    // 之前 c883a6c 只讀 currentRequest 忽略 formData → 使用者改日期沒效果、外面列表也不刷新。
    const originalDate = formData.request_date || currentRequest.request_date || ''
    const groups = new Map<string, RequestItem[]>()
    for (const item of localItems) {
      const d = item.custom_request_date || originalDate
      if (!groups.has(d)) groups.set(d, [])
      groups.get(d)!.push(item)
    }

    if (groups.size === 0) {
      void alertFn('請至少保留一個品項才能存檔', 'warning')
      return
    }

    // === 2. 決定 primary date（原單留哪一組）===
    const primaryDate = groups.has(originalDate)
      ? originalDate
      : (groups.keys().next().value as string)
    const primaryItems = groups.get(primaryDate) || []
    const otherGroupEntries = Array.from(groups.entries()).filter(([d]) => d !== primaryDate)

    // === 3. 工具：依公司預設出帳日算 is_special_billing ===
    const computeSpecial = (date: string): boolean => {
      if (defaultBillingDay === null || !date) return false
      return new Date(date + 'T00:00:00').getDay() !== defaultBillingDay
    }

    // === 4. 主組處理：留在原單 ===
    // 4a. 識別「被搬走的既有品項」（不在 primary、且不是新加）→ 等下要從原單刪除
    const primaryItemIds = new Set(primaryItems.map(i => i.id))
    const movedExistingItems = localItems.filter(
      i => !primaryItemIds.has(i.id) && !newItemIds.includes(i.id)
    )

    // 4b. 刪除：使用者明確 remove 的 + 搬到別組的既有品項
    for (const id of deletedItemIds) {
      await paymentRequestService.deleteItem(currentRequest.id, id)
    }
    for (const item of movedExistingItems) {
      await paymentRequestService.deleteItem(currentRequest.id, item.id)
    }

    // 4c. 新加且落在 primary 的品項 → insert 進原單
    const newItemsInPrimary = primaryItems.filter(i => newItemIds.includes(i.id))
    if (newItemsInPrimary.length > 0) {
      const itemNumbers = await nextPaymentRequestItemNumbers(
        currentRequest.id,
        newItemsInPrimary.length
      )
      const rows = newItemsInPrimary.map((item, idx) => ({
        request_id: currentRequest.id,
        category: item.category || null,
        supplier_id: item.supplier_id || null,
        supplier_name: resolveSupplierName(item, suppliers),
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.unit_price * item.quantity,
        sort_order: primaryItems.indexOf(item) + 1,
        payment_method_id: item.payment_method_id || null,
        // 解除「強制 null」（2026-05-27 那層 SSOT 已不適用、改 group-by-date 後品項日期是真相）
        custom_request_date: item.custom_request_date || null,
        advanced_by: item.advanced_by === '_pending' ? null : item.advanced_by || null,
        advanced_by_name: item.advanced_by_name || null,
        item_number: itemNumbers[idx],
      }))
      const { error: insertError } = await supabase.from('payment_request_items').insert(rows)
      if (insertError) {
        logger.error('新增請款項目失敗:', insertError, 'rows:', rows)
        throw insertError
      }
    }

    // 4d. 既有且落在 primary 的品項 → update 原單
    for (const item of primaryItems.filter(i => !newItemIds.includes(i.id))) {
      const dbUpdates: Record<string, unknown> = {
        category: item.category,
        supplier_id: item.supplier_id || null,
        supplier_name: resolveSupplierName(item, suppliers),
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.unit_price * item.quantity,
        payment_method_id: item.payment_method_id || null,
        custom_request_date: item.custom_request_date || null,
        advanced_by: item.advanced_by === '_pending' ? null : item.advanced_by || null,
        advanced_by_name: item.advanced_by_name || null,
      }
      const { error: itemUpdateError } = await supabase
        .from('payment_request_items')
        .update(dbUpdates as never)
        .eq('id', item.id)
      if (itemUpdateError) {
        logger.error(
          '更新請款項目失敗:',
          itemUpdateError,
          'item_id:',
          item.id,
          'payload:',
          dbUpdates
        )
        throw itemUpdateError
      }
    }

    // 4e. 更新原單 header（金額 / 日期 / 付款方式 / 訂單 / is_special_billing）
    const primaryTotal = primaryItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const editedOrder = formData.order_id ? orders.find(o => o.id === formData.order_id) : undefined
    const { error: amountError } = await supabase
      .from('payment_requests')
      .update({
        amount: primaryTotal,
        total_amount: primaryTotal,
        payment_method_id: localPaymentMethodId || null,
        order_id: formData.order_id || null,
        order_number: editedOrder?.order_number ?? null,
        // primary 可能 = 原日期（不變）、也可能 = 全搬到新日期（原單自身改日期）
        request_date: primaryDate,
        is_special_billing: computeSpecial(primaryDate),
      })
      .eq('id', currentRequest.id)
    if (amountError) {
      logger.error('更新請款單金額失敗:', amountError)
      throw amountError
    }

    // === 5. 其他組各開新單（走 useRequestOperations.createRequest）===
    // createRequest 自己處理：tour vs company 編號（generateRequestNo / generateCompanyPaymentRequestCode）
    // + 失敗回滾 + recalculateExpenseStats
    const splitCount = otherGroupEntries.length
    for (const [groupDate, groupItems] of otherGroupEntries) {
      const formDataForNew: Record<string, unknown> = {
        request_category: currentRequest.request_category,
        tour_id: currentRequest.tour_id ?? '',
        order_id: formData.order_id || '',
        request_date: groupDate,
        notes: currentRequest.notes ?? '',
        is_special_billing: computeSpecial(groupDate),
        payment_method_id: localPaymentMethodId || undefined,
        created_by: formData.created_by || undefined,
        // 公司請款補（tour 模式這兩個會被 createRequest 忽略）
        expense_category_id:
          (currentRequest as unknown as { expense_category_id?: string }).expense_category_id ?? '',
        expense_type: (currentRequest as unknown as { expense_type?: string }).expense_type ?? '',
      }
      await createRequest(
        formDataForNew,
        groupItems,
        currentRequest.tour_name ?? '',
        currentRequest.tour_code ?? '',
        editedOrder?.order_number ?? undefined,
        currentUserName,
        undefined // 不傳 code、createRequest 自己生
      )
    }

    // === 6. Refresh + alert ===
    await refreshRequestItems()
    await invalidatePaymentRequests()
    if (currentRequest.tour_id) {
      await recalculateExpenseStats(currentRequest.tour_id)
    }
    // 2026-05-27（P0-1）：觸發列表頁的 refreshAll（紅線 F：cache 失效 SSOT）
    _onSuccess?.()

    setIsDirty(false)
    setDeletedItemIds([])
    setNewItemIds([])

    // 拆超過 1 張 → 跟新增模式一樣跳訊息
    if (splitCount > 0) {
      await alert(
        `已儲存、且依日期自動拆成 ${splitCount + 1} 張請款單（同日期合併、不同日期各一張）`,
        'success'
      )
    } else {
      await alert(COMPONENT_LABELS.ALERT_SAVE_SUCCESS, 'success')
    }
    onOpenChange(false)
  } catch (error) {
    logger.error('儲存失敗:', error)
    void alertFn(COMPONENT_LABELS.ALERT_SAVE_FAILED, 'error')
  } finally {
    setIsSubmitting(false)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteEditParams {
  currentRequest: PaymentRequest
  isEditBatch: boolean
  editBatchRequests: PaymentRequest[]
  setEditBatchRequests: (v: PaymentRequest[]) => void
  setSelectedRequestId: (v: string) => void
  onOpenChange: (open: boolean) => void
  setIsSubmitting: (v: boolean) => void
  /** 2026-05-27（P0-1）：刪除後刷列表頁自訂 key（page 傳 refreshAll） */
  onSuccess?: () => void
}

export async function deleteEditedRequest({
  currentRequest,
  isEditBatch,
  editBatchRequests,
  setEditBatchRequests,
  setSelectedRequestId,
  onOpenChange,
  setIsSubmitting,
  onSuccess: _onSuccess,
}: DeleteEditParams): Promise<void> {
  const deleteMessage = isEditBatch
    ? `確定要刪除此請款單（${currentRequest.code}）嗎？此操作無法復原。\n\n注意：只會刪除當前選中的請款單，同批次的其他請款單不受影響。`
    : '確定要刪除此請款單嗎？此操作無法復原。'

  const confirmed = await confirm(deleteMessage, {
    title: '刪除請款單',
    type: 'warning',
  })
  if (!confirmed) return

  setIsSubmitting(true)
  try {
    await deletePaymentRequestApi(currentRequest.id)
    if (currentRequest.tour_id) {
      await recalculateExpenseStats(currentRequest.tour_id)
    }
    // 2026-05-27 修（P0-1）：刪除後也刷列表頁 useRequestsListView 自訂 key（同 save 路徑）
    _onSuccess?.()
    await alert('請款單已刪除', 'success')

    if (isEditBatch && editBatchRequests.length > 1) {
      const remainingRequests = editBatchRequests.filter(r => r.id !== currentRequest.id)
      setEditBatchRequests(remainingRequests)
      setSelectedRequestId(remainingRequests[0].id)
    } else {
      onOpenChange(false)
    }
  } catch (error) {
    logger.error('刪除請款單失敗:', error)
    await alert('刪除請款單失敗', 'error')
  } finally {
    setIsSubmitting(false)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Close with dirty check
// ─────────────────────────────────────────────────────────────────────────────

export async function handleEditOpenChange(
  newOpen: boolean,
  isDirty: boolean,
  isEditMode: boolean,
  setIsDirty: (v: boolean) => void,
  setDeletedItemIds: (v: string[]) => void,
  setNewItemIds: (v: string[]) => void,
  onOpenChange: (open: boolean) => void
): Promise<void> {
  if (!newOpen && isEditMode && isDirty) {
    const confirmed = await confirm(COMPONENT_LABELS.CONFIRM_LEAVE_DIRTY, {
      title: COMPONENT_LABELS.CONFIRM_LEAVE_TITLE,
      type: 'warning',
    })
    if (!confirmed) return
  }
  if (!newOpen && isEditMode) {
    setIsDirty(false)
    setDeletedItemIds([])
    setNewItemIds([])
  }
  onOpenChange(newOpen)
}
