/**
 * useAddRequestDialogState.ts
 *
 * 新增請款 Dialog 的批量 state 管理 hook：
 * - 批量請款 state (batchDate / batchCategoryId / batchSupplierId / tourAllocations)
 * - 供應商快速新增 dialog state
 * - batch allocation 操作
 *
 * 2026-05-21 請款分類 Phase 2：batchCategory (PaymentItemCategory) → batchCategoryId (uuid)
 */

import { useState, useMemo, useCallback } from 'react'
import { TourAllocation, RequestMode } from '../_components/AddRequestDialog.types'
import { getTodayString } from '@/lib/utils/format-date'

interface Tour {
  id: string
  code?: string | null
  name?: string | null
}

const DEFAULT_ALLOCATIONS: TourAllocation[] = [
  { tour_id: '', tour_code: '', tour_name: '', allocated_amount: 0 },
  { tour_id: '', tour_code: '', tour_name: '', allocated_amount: 0 },
]

export function useAddRequestDialogState() {
  // === 批量請款狀態 ===
  const [batchDate, setBatchDate] = useState(getTodayString())
  // 2026-05-21：類別改吃 expense_categories.id (uuid)；舊 PaymentItemCategory enum 走入歷史
  const [batchCategoryId, setBatchCategoryId] = useState<string>('')
  const [batchSupplierId, setBatchSupplierId] = useState('')
  const [batchPaymentMethodId, setBatchPaymentMethodId] = useState<string | undefined>(undefined)
  const [tourAllocations, setTourAllocations] = useState<TourAllocation[]>(DEFAULT_ALLOCATIONS)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // === 團體請款：需求單項目 stub ===
  const [importFromRequests, setImportFromRequests] = useState(false)
  const [selectedRequestItems, setSelectedRequestItems] = useState<
    Record<string, { selected: boolean; amount: number }>
  >({})

  // === 供應商快速新增對話框 ===
  const [createSupplierDialogOpen, setCreateSupplierDialogOpen] = useState(false)
  const [pendingSupplierName, setPendingSupplierName] = useState('')
  const [supplierCreateResolver, setSupplierCreateResolver] = useState<
    ((id: string | null) => void) | null
  >(null)

  // === 計算值 ===
  const selectedRequestTotal = useMemo(() => {
    return Object.entries(selectedRequestItems)
      .filter(([, val]) => val.selected)
      .reduce((sum, [, val]) => sum + val.amount, 0)
  }, [selectedRequestItems])

  const selectedRequestCount = useMemo(() => {
    return Object.values(selectedRequestItems).filter(val => val.selected).length
  }, [selectedRequestItems])

  // === batch allocation 操作 ===
  const addTourAllocation = useCallback(() => {
    setTourAllocations(prev => [
      ...prev,
      { tour_id: '', tour_code: '', tour_name: '', allocated_amount: 0 },
    ])
  }, [])

  const removeTourAllocation = useCallback((index: number) => {
    setTourAllocations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateTourAllocation = useCallback((index: number, updates: Partial<TourAllocation>) => {
    setTourAllocations(prev =>
      prev.map((allocation, i) => (i === index ? { ...allocation, ...updates } : allocation))
    )
  }, [])

  const selectTour = useCallback((index: number, tourId: string, tours: Tour[]) => {
    const tour = tours.find(t => t.id === tourId)
    if (!tour) return
    updateTourAllocation(index, {
      tour_id: tour.id,
      tour_code: tour.code || '',
      tour_name: tour.name || '',
    })
  }, [updateTourAllocation])

  // === 供應商對話框 ===
  const handleCreateSupplier = useCallback(async (name: string): Promise<string | null> => {
    return new Promise(resolve => {
      setPendingSupplierName(name)
      setSupplierCreateResolver(() => resolve)
      setCreateSupplierDialogOpen(true)
    })
  }, [])

  const handleSupplierCreated = useCallback((supplierId: string, activeTab: RequestMode) => {
    setSupplierCreateResolver((prev: ((id: string | null) => void) | null) => {
      if (prev) {
        prev(supplierId)
        return null
      }
      return prev
    })
    if (activeTab === 'batch') {
      setBatchSupplierId(supplierId)
    }
    setPendingSupplierName('')
  }, [])

  const handleSupplierDialogClose = useCallback((open: boolean) => {
    setCreateSupplierDialogOpen(open)
    if (!open) {
      setSupplierCreateResolver((prev: ((id: string | null) => void) | null) => {
        if (prev) {
          prev(null)
          return null
        }
        return prev
      })
      setPendingSupplierName('')
    }
  }, [])

  // === 重置批量 state ===
  const resetBatchState = useCallback(() => {
    setBatchDate(getTodayString())
    setBatchCategoryId('')
    setBatchSupplierId('')
    setTourAllocations([...DEFAULT_ALLOCATIONS])
    setImportFromRequests(false)
    setSelectedRequestItems({})
  }, [])

  return {
    // batch state
    batchDate,
    setBatchDate,
    batchCategoryId,
    setBatchCategoryId,
    batchSupplierId,
    setBatchSupplierId,
    batchPaymentMethodId,
    setBatchPaymentMethodId,
    tourAllocations,
    setTourAllocations,
    isSubmitting,
    setIsSubmitting,
    importFromRequests,
    selectedRequestItems,
    selectedRequestTotal,
    selectedRequestCount,
    // batch allocation ops
    addTourAllocation,
    removeTourAllocation,
    updateTourAllocation,
    selectTour,
    // supplier dialog
    createSupplierDialogOpen,
    pendingSupplierName,
    handleCreateSupplier,
    handleSupplierCreated,
    handleSupplierDialogClose,
    // reset
    resetBatchState,
  }
}
