'use client'


import useSWR from 'swr'
import { mutate } from '@/lib/swr/scoped-mutate'
import { supabase } from '@/lib/supabase/client'
import { Tour } from '@/stores/types'
import { PageRequest, UseEntityResult } from '@/core/types/common'
import { BaseEntity } from '@/core/types/common'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import { generateTourCode as generateTourCodeShared } from '@/lib/codes'
import { generateUUID } from '@/lib/utils/uuid'
import { logger } from '@/lib/utils/logger'
import { createTour as createTourData, deleteTour as deleteTourData } from '@/data'

const TOURS_KEY = 'tours'

// Supabase fetcher
// 注意：此函數只在 SWR key 有效時才會被調用（已通過 auth 檢查）
// 不要在這裡調用 getSession()，它會導致掛起
// 列表頁只需要的欄位（63 欄 → ~20 欄）
// 列表頁只需要的欄位（63 欄 → 22 欄）
const TOUR_LIST_SELECT =
  'id, code, name, location, status, departure_date, return_date, price, selling_price_per_person, max_participants, current_participants, total_revenue, total_cost, profit, archived, is_active, itinerary_id, workspace_id, created_at'

async function fetchTours(): Promise<Tour[]> {
  const { data, error } = await supabase
    .from('tours')
    .select(TOUR_LIST_SELECT)
    .order('departure_date', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('❌ Error fetching tours:', error.message)
    throw new Error(error.message)
  }

  return (data || []) as Tour[]
}

export function useTours(params?: PageRequest): UseEntityResult<Tour> {
  // ✅ 優化：讀取不等 auth hydration，讓 SWR 立即從快取顯示
  const swrKey = TOURS_KEY

  const {
    data: allTours = [],
    error,
    isLoading,
  } = useSWR<Tour[]>(swrKey, fetchTours, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5 * 60 * 1000,
  })

  // 根據 params 進行過濾、排序、分頁
  const processedTours = (() => {
    let result = [...allTours]

    // 搜尋過濾 — 命中 name / code / airport_code（不再用已廢棄的 tour.location）
    if (params?.search) {
      const searchLower = params.search.toLowerCase()
      result = result.filter(
        tour =>
          tour.name.toLowerCase().includes(searchLower) ||
          tour.code.toLowerCase().includes(searchLower) ||
          (tour.airport_code || '').toLowerCase().includes(searchLower)
      )
    }

    // 排序
    if (params?.sortBy) {
      const sortField = params.sortBy as keyof Tour
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1
      result.sort((a, b) => {
        const aVal = a[sortField] ?? ''
        const bVal = b[sortField] ?? ''
        if (aVal < bVal) return -1 * sortOrder
        if (aVal > bVal) return 1 * sortOrder
        return 0
      })
    }

    return result
  })()

  // 分頁
  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const start = (page - 1) * pageSize
  const paginatedTours = processedTours.slice(start, start + pageSize)

  // 新增
  const createTour = async (tourData: Omit<Tour, keyof BaseEntity>): Promise<Tour> => {
    const now = new Date().toISOString()
    const newTour = {
      ...tourData,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    } as Tour

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(
      TOURS_KEY,
      (currentTours: Tour[] | undefined) => [newTour, ...(currentTours || [])],
      false
    )

    try {
      // Type assertion needed due to Tour type vs Database Insert type mismatch
      await createTourData(newTour as unknown as Parameters<typeof createTourData>[0])

      mutate(TOURS_KEY)
      return newTour
    } catch (err) {
      mutate(TOURS_KEY)
      throw err
    }
  }

  // 更新
  const updateTour = async (id: string, updates: Partial<Tour>): Promise<Tour> => {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(
      TOURS_KEY,
      (currentTours: Tour[] | undefined) =>
        (currentTours || []).map(tour => (tour.id === id ? { ...tour, ...updatedData } : tour)),
      false
    )

    try {
      const { data, error } = await supabase
        .from('tours')
        .update(updatedData as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      mutate(TOURS_KEY)
      return data as Tour
    } catch (err) {
      mutate(TOURS_KEY)
      throw err
    }
  }

  // 刪除
  const deleteTour = async (id: string): Promise<boolean> => {
    // 檢查是否有已付款訂單
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('id, payment_status')
      .eq('tour_id', id)
      .neq('payment_status', 'unpaid')

    if (paidOrders && paidOrders.length > 0) {
      throw new Error(`此團有 ${paidOrders.length} 筆已付款訂單，無法刪除`)
    }

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(
      TOURS_KEY,
      (currentTours: Tour[] | undefined) => (currentTours || []).filter(tour => tour.id !== id),
      false
    )

    try {
      await deleteTourData(id)

      mutate(TOURS_KEY)
      return true
    } catch (err) {
      mutate(TOURS_KEY)
      throw err
    }
  }

  // 重新載入
  const refresh = async () => {
    await mutate(TOURS_KEY)
  }

  // Loading state - 簡化
  const effectiveLoading = isLoading

  return {
    data: paginatedTours,
    totalCount: processedTours.length,
    loading: effectiveLoading,
    error: error?.message || null,
    actions: {
      create: createTour,
      update: updateTour,
      delete: deleteTour,
      refresh,
    },
  }
}

// 專門用於單個旅遊團詳情的 hook
export function useTourDetails(tour_id: string) {
  const {
    data: tour,
    error,
    isLoading: loading,
    mutate: mutateTour,
  } = useSWR<Tour | null>(
    tour_id ? `tour-${tour_id}` : null,
    async () => {
      if (!tour_id) return null
      const { data, error } = await supabase
        .from('tours')
        .select(
          'id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, outbound_flight, return_flight, is_active, confirmed_requirements, locked_itinerary_id, itinerary_id, locked_quote_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by'
        )
        .eq('id', tour_id)
        .single()

      if (error) throw error
      return data as Tour
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000,
    }
  )

  // 計算財務摘要 — 從 tours 表讀取真實數據（由 expense-core.service 和 receipt-core.service 維護）
  const financials = tour
    ? {
        total_revenue: tour.total_revenue ?? 0,
        total_cost: tour.total_cost ?? 0,
        profit: tour.profit ?? 0,
        profitMargin: tour.total_revenue
          ? Math.round(((tour.profit ?? 0) / tour.total_revenue) * 100)
          : 0,
      }
    : null

  const generateTourCode = async (cityCode: string, date: Date, _isSpecial?: boolean) => {
    const workspaceId = getCurrentWorkspaceId()
    if (!workspaceId) {
      throw new Error('無法取得 workspace code，請重新登入')
    }
    // 統一走中央 codes module（@/lib/codes）— DB RPC + advisory lock 防競態
    return generateTourCodeShared(workspaceId, cityCode, date)
  }

  return {
    tour: tour || null,
    financials,
    loading,
    error: error?.message || null,
    actions: {
      generateCode: generateTourCode,
      refresh: () => mutateTour(),
    },
  }
}
