/**
 * payment-request-items.service.ts
 * PaymentRequestItem 的 CRUD 操作（addItem / addItems / updateItem / deleteItem）
 * 從 payment-request.service.ts 拆出，保持主 service 專注在請款單本身的 CRUD 和狀態流
 */

import { PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import { invalidatePaymentRequestItems } from '@/data'
import { nextPaymentRequestItemNumber, nextPaymentRequestItemNumbers } from '@/lib/codes'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'

// ============ DB select fragment（避免重複） ============

export const PAYMENT_REQUEST_ITEMS_SELECT =
  'id, request_id, description, quantity, unit_price, subtotal, category, tour_id, supplier_id, supplier_name, sort_order, item_number, notes, payment_method_id, custom_request_date, workspace_id, created_at, created_by, updated_at, updated_by' as const

// ============ 讀取 helper ============

export async function getItemsByRequestIdAsync(requestId: string): Promise<PaymentRequestItem[]> {
  const { data, error } = await supabase
    .from('payment_request_items')
    .select(PAYMENT_REQUEST_ITEMS_SELECT)
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true })
    .limit(500)
  if (error) throw error
  return (data || []) as unknown as PaymentRequestItem[]
}

export async function loadPaymentRequestItems(): Promise<PaymentRequestItem[]> {
  const { data, error } = await supabase
    .from('payment_request_items')
    .select(PAYMENT_REQUEST_ITEMS_SELECT)
    .order('sort_order', { ascending: true })
    .limit(5000)
  if (error) throw error
  return (data || []) as unknown as PaymentRequestItem[]
}

export async function getItemsByCategory(
  requestId: string,
  category: PaymentRequestItem['category']
): Promise<PaymentRequestItem[]> {
  const { data, error } = await supabase
    .from('payment_request_items')
    .select(PAYMENT_REQUEST_ITEMS_SELECT)
    .eq('request_id', requestId)
    .eq('category', category)
    .order('sort_order', { ascending: true })
    .limit(500)
  if (error) throw error
  return (data || []) as unknown as PaymentRequestItem[]
}

// ============ 型別（呼叫端用） ============

export type AddItemData = Omit<
  PaymentRequestItem,
  'id' | 'request_id' | 'item_number' | 'subtotal' | 'created_at' | 'updated_at'
>

// ============ CRUD ============

/**
 * 新增請款項目（單筆）
 * updateRequestTotal / recalcExpense 由 caller 在拿到 createdItem 後自行決定要不要觸發，
 * 這裡直接幫你做（跟原本 service method 行為一致）。
 */
export async function addItem(
  request: PaymentRequest,
  itemData: AddItemData,
  now: string,
  updateRequestTotal: (requestId: string, amount: number, updatedAt: string) => Promise<void>
): Promise<PaymentRequestItem> {
  const existingItems = await getItemsByRequestIdAsync(request.id)

  // 品項編號走 RPC + advisory lock 防並發撞號（migration 20260513200000）
  const itemNumber = await nextPaymentRequestItemNumber(request.id)

  const item = {
    id: crypto.randomUUID(),
    request_id: request.id,
    item_number: itemNumber,
    category: itemData.category,
    supplier_id: itemData.supplier_id || null,
    supplier_name: itemData.supplier_name,
    description: itemData.description,
    unit_price: itemData.unit_price,
    quantity: itemData.quantity,
    subtotal: itemData.unit_price * itemData.quantity,
    notes: itemData.notes,
    sort_order: itemData.sort_order,
    payment_method_id: itemData.payment_method_id || null,
    // SSOT：item 不存日期、parent payment_requests.request_date 才是唯一真相
    custom_request_date: null,
    // 2026-05-14 William 拍板：item.tour_id 帶 parent 或 client 選的
    tour_id: ((itemData as Record<string, unknown>).tour_id as string) || null,
    // 2026-05-15 代墊人欄位
    advanced_by:
      ((itemData as Record<string, unknown>).advanced_by as string | null | undefined) || null,
    advanced_by_name:
      ((itemData as Record<string, unknown>).advanced_by_name as string | null | undefined) || null,
    created_at: now,
    updated_at: now,
  }

  const { data: createdItem, error } = await supabase
    .from('payment_request_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  await invalidatePaymentRequestItems()

  const allItems = [...existingItems, createdItem as unknown as PaymentRequestItem]
  const totalAmount = allItems.reduce((sum, i) => sum + (i.subtotal || 0), 0)
  await updateRequestTotal(request.id, totalAmount, now)

  if (request.tour_id) {
    await recalculateExpenseStats(request.tour_id)
  }

  return createdItem as unknown as PaymentRequestItem
}

/**
 * 批次新增請款項目（batch insert）
 *
 * 2026-05-21 William 拍板：改用批次 RPC `nextPaymentRequestItemNumbers`
 * 一次拿 N 個 item_number（單 transaction + advisory lock + 內部遞增）
 * 再一次 batch insert、避免 sequential 慢、且永遠不撞 unique。
 *
 * 史前 5/15 用「拿一號 → insert 一筆」sequential pattern、雖然不撞但慢、改批次。
 */
export async function addItems(
  request: PaymentRequest,
  itemsData: AddItemData[],
  now: string,
  updateRequestTotal: (requestId: string, amount: number, updatedAt: string) => Promise<void>
): Promise<PaymentRequestItem[]> {
  if (itemsData.length === 0) return []

  const existingItems = await getItemsByRequestIdAsync(request.id)

  // 批次拿 N 個編號（單一 transaction、advisory lock 內遞增）
  const itemNumbers = await nextPaymentRequestItemNumbers(request.id, itemsData.length)

  const rows = itemsData.map((itemData, idx) => ({
    id: crypto.randomUUID(),
    request_id: request.id,
    item_number: itemNumbers[idx],
    category: itemData.category,
    supplier_id: itemData.supplier_id || null,
    supplier_name: itemData.supplier_name,
    description: itemData.description,
    unit_price: itemData.unit_price,
    quantity: itemData.quantity,
    subtotal: itemData.unit_price * itemData.quantity,
    notes: itemData.notes,
    sort_order: itemData.sort_order,
    payment_method_id: itemData.payment_method_id || null,
    custom_request_date: null,
    tour_id: ((itemData as Record<string, unknown>).tour_id as string) || null,
    advanced_by:
      ((itemData as Record<string, unknown>).advanced_by as string | null | undefined) || null,
    advanced_by_name:
      ((itemData as Record<string, unknown>).advanced_by_name as string | null | undefined) || null,
    created_at: now,
    updated_at: now,
  }))

  const { data: created, error } = await supabase
    .from('payment_request_items')
    .insert(rows)
    .select()
  if (error) {
    logger.error('addItems batch insert 失敗:', error, 'rows:', rows)
    throw error
  }
  const createdItems = (created as unknown as PaymentRequestItem[]) ?? []

  await invalidatePaymentRequestItems()

  const allItems = [...existingItems, ...createdItems]
  const totalAmount = allItems.reduce((sum, i) => sum + (i.subtotal || 0), 0)
  await updateRequestTotal(request.id, totalAmount, now)

  if (request.tour_id) {
    await recalculateExpenseStats(request.tour_id)
  }

  return createdItems
}

/**
 * 更新請款項目
 */
export async function updateItem(
  request: PaymentRequest,
  itemId: string,
  itemData: Partial<PaymentRequestItem>,
  now: string,
  updateRequestTotal: (requestId: string, amount: number, updatedAt: string) => Promise<void>
): Promise<void> {
  // 取得現有項目
  const { data: existingItem, error: fetchError } = await supabase
    .from('payment_request_items')
    .select(PAYMENT_REQUEST_ITEMS_SELECT)
    .eq('id', itemId)
    .single()

  if (fetchError) throw fetchError

  // 計算新的 subtotal
  const unitPrice = Number(
    itemData.unit_price ?? (existingItem as Record<string, unknown>)?.unit_price ?? 0
  )
  const quantity = Number(itemData.quantity ?? existingItem?.quantity ?? 0)
  const subtotal = unitPrice * quantity

  // 映射 TypeScript 欄位名到資料庫欄位名，避免寫入不存在的欄位
  const dbUpdate: Record<string, unknown> = {
    subtotal,
    updated_at: now,
  }
  if (itemData.category !== undefined) dbUpdate.category = itemData.category
  if (itemData.supplier_id !== undefined) dbUpdate.supplier_id = itemData.supplier_id || null
  if (itemData.supplier_name !== undefined) dbUpdate.supplier_name = itemData.supplier_name
  if (itemData.description !== undefined) dbUpdate.description = itemData.description
  if (itemData.quantity !== undefined) dbUpdate.quantity = itemData.quantity
  if (itemData.notes !== undefined) dbUpdate.notes = itemData.notes
  if (itemData.sort_order !== undefined) dbUpdate.sort_order = itemData.sort_order
  if (itemData.payment_method_id !== undefined)
    dbUpdate.payment_method_id = itemData.payment_method_id || null
  // SSOT：item 不能改日期，忽略任何 custom_request_date 更新
  if (itemData.unit_price !== undefined) dbUpdate.unit_price = itemData.unit_price

  const { error: updateError } = await supabase
    .from('payment_request_items')
    .update(dbUpdate)
    .eq('id', itemId)

  if (updateError) throw updateError
  await invalidatePaymentRequestItems()

  const allItems = await getItemsByRequestIdAsync(request.id)
  const totalAmount = allItems.reduce((sum, i) => {
    if (i.id === itemId) return sum + subtotal
    return sum + (i.subtotal || 0)
  }, 0)
  await updateRequestTotal(request.id, totalAmount, now)

  if (request.tour_id) {
    await recalculateExpenseStats(request.tour_id)
  }
}

/**
 * 刪除請款項目
 */
export async function deleteItem(
  request: PaymentRequest,
  itemId: string,
  now: string,
  updateRequestTotal: (requestId: string, amount: number, updatedAt: string) => Promise<void>
): Promise<void> {
  const { error } = await supabase.from('payment_request_items').delete().eq('id', itemId)

  if (error) throw error
  await invalidatePaymentRequestItems()

  const remainingItems = await getItemsByRequestIdAsync(request.id)
  const totalAmount = remainingItems.reduce((sum, i) => sum + (i.subtotal || 0), 0)
  await updateRequestTotal(request.id, totalAmount, now)

  if (request.tour_id) {
    await recalculateExpenseStats(request.tour_id)
  }
}
