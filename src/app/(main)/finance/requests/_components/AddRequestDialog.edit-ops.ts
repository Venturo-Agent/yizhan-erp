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
import {
  invalidatePaymentRequests,
  deletePaymentRequest as deletePaymentRequestApi,
} from '@/data'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'
import { paymentRequestService } from '@/app/(main)/finance/payments/_services/payment-request.service'
import { nextPaymentRequestItemNumbers } from '@/lib/codes'
import { COMPONENT_LABELS } from './AddRequestDialog.types'
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
  formData: { order_id?: string }
  orders: Array<{ id: string; order_number?: string | null }>
  refreshRequestItems: () => Promise<void>
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
  setIsDirty: (v: boolean) => void
  setDeletedItemIds: (v: string[]) => void
  setNewItemIds: (v: string[]) => void
  setIsSubmitting: (v: boolean) => void
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
}: SaveEditParams): Promise<void> {
  setIsSubmitting(true)
  try {
    // 1. Delete removed items
    for (const id of deletedItemIds) {
      await paymentRequestService.deleteItem(currentRequest.id, id)
    }

    // 2. Insert new items — 用 RPC 拿 item_number（advisory lock 防撞號）
    // 不再用 `${currentRequest.code}-${length + idx + 1}` 硬算、刪過 item 後 length 對不上會撞
    const newItems = localItems.filter(i => newItemIds.includes(i.id))
    if (newItems.length > 0) {
      // 批次拿 N 個編號（單一 transaction + advisory lock + 內部遞增）
      // 修原 in-loop 呼叫 single RPC 撞 unique 的 bug（5/21 William 拍板）
      const itemNumbers = await nextPaymentRequestItemNumbers(
        currentRequest.id,
        newItems.length
      )
      const rows = newItems.map((item, idx) => ({
        request_id: currentRequest.id,
        category: item.category || null,
        supplier_id: item.supplier_id || null,
        supplier_name: resolveSupplierName(item, suppliers),
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.unit_price * item.quantity,
        sort_order: localItems.indexOf(item) + 1,
        payment_method_id: item.payment_method_id || null,
        // SSOT：item 不存日期、header.request_date 才是真相
        custom_request_date: null,
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

    // 3. Update existing items
    for (const item of localItems.filter(i => !newItemIds.includes(i.id))) {
      const dbUpdates: Record<string, unknown> = {
        category: item.category,
        supplier_id: item.supplier_id || null,
        supplier_name: resolveSupplierName(item, suppliers),
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.unit_price * item.quantity,
        payment_method_id: item.payment_method_id || null,
        // SSOT：item 不存日期、header.request_date 才是真相
        custom_request_date: null,
        advanced_by: item.advanced_by === '_pending' ? null : item.advanced_by || null,
        advanced_by_name: item.advanced_by_name || null,
      }
      const { error: itemUpdateError } = await supabase
        .from('payment_request_items')
        .update(dbUpdates as never)
        .eq('id', item.id)
      if (itemUpdateError) {
        logger.error('更新請款項目失敗:', itemUpdateError, 'item_id:', item.id, 'payload:', dbUpdates)
        throw itemUpdateError
      }
    }

    // 4. Update request total + payment method + order (edit 模式允許改訂單)
    const newTotal = localItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const editedOrder = formData.order_id
      ? orders.find(o => o.id === formData.order_id)
      : undefined
    const { error: amountError } = await supabase
      .from('payment_requests')
      .update({
        amount: newTotal,
        total_amount: newTotal,
        payment_method_id: localPaymentMethodId || null,
        order_id: formData.order_id || null,
        order_number: editedOrder?.order_number ?? null,
      })
      .eq('id', currentRequest.id)
    if (amountError) {
      logger.error('更新請款單金額失敗:', amountError)
    }

    // 5. Refresh caches
    await refreshRequestItems()
    await invalidatePaymentRequests()
    if (currentRequest.tour_id) {
      await recalculateExpenseStats(currentRequest.tour_id)
    }

    setIsDirty(false)
    setDeletedItemIds([])
    setNewItemIds([])
    await alert(COMPONENT_LABELS.ALERT_SAVE_SUCCESS, 'success')
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
}

export async function deleteEditedRequest({
  currentRequest,
  isEditBatch,
  editBatchRequests,
  setEditBatchRequests,
  setSelectedRequestId,
  onOpenChange,
  setIsSubmitting,
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
