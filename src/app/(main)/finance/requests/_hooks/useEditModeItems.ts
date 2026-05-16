/**
 * useEditModeItems.ts
 *
 * 編輯模式的本地 item 管理 hook。
 * 把以下邏輯集中：
 * - 批次請款單載入（editBatchRequests）
 * - 當前請款單（currentRequest）
 * - DB items → local editable 同步
 * - dirty tracking
 * - CRUD handlers (add / update / remove)
 *
 * 讓 AddRequestDialog 主體只管渲染和 submit。
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { usePaymentRequestItems } from '@/data'
import { PaymentRequest, PaymentItemCategory } from '@/stores/types'
import { RequestItem } from '../_types'

interface UseEditModeItemsParams {
  open: boolean
  editingRequest: PaymentRequest | null | undefined
  isEditMode: boolean
}

export function useEditModeItems({
  open,
  editingRequest,
  isEditMode,
}: UseEditModeItemsParams) {
  // DB 層 items（SWR）
  const { items: dbRequestItems, refresh: refreshRequestItems } = usePaymentRequestItems({ all: true })

  // 同批次請款單切換
  const [editBatchRequests, setEditBatchRequests] = useState<PaymentRequest[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  // 當前選中的請款單（從 editBatchRequests 找）
  const currentRequest = useMemo(() => {
    if (!isEditMode) return null
    return editBatchRequests.find(r => r.id === selectedRequestId) || editingRequest || null
  }, [isEditMode, editBatchRequests, selectedRequestId, editingRequest])

  // Local editable state
  const [localItems, setLocalItems] = useState<RequestItem[]>([])
  const [localPaymentMethodId, setLocalPaymentMethodId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [newItemIds, setNewItemIds] = useState<string[]>([])

  // === Load batch requests ===
  useEffect(() => {
    const loadBatchRequests = async () => {
      if (!open || !editingRequest) {
        setEditBatchRequests([])
        setSelectedRequestId(null)
        return
      }
      if (editingRequest.batch_id) {
        const { data, error } = await supabase
          .from('payment_requests')
          .select(
            'id, code, request_number, request_type, amount, total_amount, status, tour_id, tour_code, supplier_name, expense_type, notes, workspace_id, created_at, request_date, payment_method_id, order_number, tour_name, created_by_name, batch_id, request_category'
          )
          .eq('batch_id', editingRequest.batch_id)
          .order('code', { ascending: true })
          .limit(500)
        if (error) {
          logger.error('載入批次請款單失敗:', error)
          setEditBatchRequests([editingRequest])
        } else {
          setEditBatchRequests(data as PaymentRequest[])
        }
      } else {
        setEditBatchRequests([editingRequest])
      }
      setSelectedRequestId(editingRequest.id)
    }
    loadBatchRequests().catch(err => logger.error('[loadBatchRequests]', err))
  }, [open, editingRequest])

  // === Refresh items when entering edit mode ===
  useEffect(() => {
    if (open && editingRequest) {
      refreshRequestItems()
    }
  }, [open, editingRequest, refreshRequestItems])

  // === DB items → local editable format ===
  const currentRequestId = currentRequest?.id
  const dbEditableItems: RequestItem[] = useMemo(() => {
    if (!isEditMode || !currentRequestId) return []
    return dbRequestItems
      .filter(item => item.request_id === currentRequestId)
      .map(item => ({
        id: item.id,
        custom_request_date:
          ((item as unknown as Record<string, unknown>).custom_request_date as string) ||
          currentRequest?.request_date ||
          '',
        payment_method_id: (item as unknown as Record<string, unknown>).payment_method_id as
          | string
          | undefined,
        category: item.category,
        supplier_id: item.supplier_id || '',
        supplierName: item.supplier_name,
        selected_id: item.supplier_id || '',
        description: item.description,
        unit_price: item.unit_price ?? (item as unknown as { unit_price?: number }).unit_price ?? 0,
        quantity: item.quantity,
        confirmation_item_id: (item as unknown as Record<string, unknown>).confirmation_item_id as
          | string
          | undefined,
        advanced_by: (item as unknown as Record<string, unknown>).advanced_by as string | undefined,
        advanced_by_name: (item as unknown as Record<string, unknown>).advanced_by_name as
          | string
          | undefined,
      }))
  }, [isEditMode, dbRequestItems, currentRequestId, currentRequest?.request_date])

  // Sync DB items to local state (only when not dirty)
  const dbItemsJson = JSON.stringify(dbEditableItems)
  const prevDbItemsJsonRef = useRef('')
  useEffect(() => {
    if (!isEditMode) return
    if (dbItemsJson !== prevDbItemsJsonRef.current) {
      prevDbItemsJsonRef.current = dbItemsJson
      if (!isDirty) {
        setLocalItems(JSON.parse(dbItemsJson))
      }
    }
  }, [isEditMode, dbItemsJson, isDirty])

  // 切換請款單時 reset dirty state
  useEffect(() => {
    if (!isEditMode) return
    setIsDirty(false)
    setDeletedItemIds([])
    setNewItemIds([])
    prevDbItemsJsonRef.current = ''
    setLocalPaymentMethodId(currentRequest?.payment_method_id || null)
  }, [isEditMode, selectedRequestId, currentRequest?.payment_method_id])

  // === Local CRUD handlers ===
  const handleEditUpdateItem = useCallback((itemId: string, updates: Partial<RequestItem>) => {
    setLocalItems(prev => prev.map(item => (item.id === itemId ? { ...item, ...updates } : item)))
    setIsDirty(true)
  }, [])

  const handleEditRemoveItem = useCallback(
    (itemId: string) => {
      setLocalItems(prev => prev.filter(item => item.id !== itemId))
      if (!newItemIds.includes(itemId)) {
        setDeletedItemIds(prev => [...prev, itemId])
      }
      setNewItemIds(prev => prev.filter(id => id !== itemId))
      setIsDirty(true)
    },
    [newItemIds]
  )

  const handleEditAddItem = useCallback(() => {
    const newId = `new_${Math.random().toString(36).substr(2, 9)}`
    setLocalItems(prev => [
      ...prev,
      {
        id: newId,
        custom_request_date: currentRequest?.request_date || '',
        payment_method_id: undefined,
        category: '' as PaymentItemCategory,
        supplier_id: '',
        supplierName: '',
        description: '',
        unit_price: 0,
        quantity: 1,
      },
    ])
    setNewItemIds(prev => [...prev, newId])
    setIsDirty(true)
  }, [currentRequest?.request_date])

  return {
    // Batch requests
    currentRequest,
    editBatchRequests,
    setEditBatchRequests,
    selectedRequestId,
    setSelectedRequestId,
    // Items
    localItems,
    localPaymentMethodId,
    setLocalPaymentMethodId,
    isDirty,
    setIsDirty,
    deletedItemIds,
    setDeletedItemIds,
    newItemIds,
    setNewItemIds,
    // Refresh
    refreshRequestItems,
    // Handlers
    handleEditUpdateItem,
    handleEditRemoveItem,
    handleEditAddItem,
  }
}
