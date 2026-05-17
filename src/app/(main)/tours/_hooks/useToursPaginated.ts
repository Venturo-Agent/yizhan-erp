'use client'

/**
 * useToursPaginated - Server-side pagination and filtering for tours
 *
 * Key improvements over useTours-advanced:
 * - Server-side pagination using Supabase .range()
 * - Server-side filtering using Supabase query
 * - Server-side search using .ilike()
 * - Reduces data transfer by 90%+
 */

import { useEffect } from 'react'
// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- 分頁 CRUD hook，需要 keepPreviousData + realtime + 樂觀更新，entity hook 無法表達；寫入操作待 API route 建立後再遷移
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { generateTourCode as generateTourCodeShared } from '@/lib/codes'
import { Tour } from '@/stores/types'
import { generateUUID } from '@/lib/utils/uuid'
import type { Database } from '@/lib/supabase/types'
import { logger } from '@/lib/utils/logger'
import { deleteTour as deleteTourEntity } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

interface UseToursPaginatedParams {
  page: number
  pageSize: number
  // 'all' | 'template' | 'proposal' | 'upcoming' | 'ongoing' | 'returned' | 'closed' | 'archived'
  status?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UseToursPaginatedResult {
  tours: Tour[]
  totalCount: number
  loading: boolean
  error: string | null
  actions: {
    create: (tourData: Omit<Tour, 'id' | 'created_at' | 'updated_at'>) => Promise<Tour>
    update: (id: string, updates: Partial<Tour>) => Promise<Tour>
    delete: (id: string) => Promise<boolean>
    refresh: () => Promise<void>
    generateCode: (cityCode: string, date: Date) => Promise<string>
  }
}

// Build SWR key from params for proper cache invalidation
function buildSwrKey(params: UseToursPaginatedParams): string {
  return `tours-paginated-${JSON.stringify(params)}`
}

export function useToursPaginated(params: UseToursPaginatedParams): UseToursPaginatedResult {
  const { page, pageSize, status, search, sortOrder = 'desc' } = params
  const defaultSort =
    status === TOUR_STATUS.PROPOSAL || status === TOUR_STATUS.TEMPLATE
      ? 'created_at'
      : 'departure_date'
  const sortBy = params.sortBy || defaultSort

  // Auth check - 只用於寫入操作，讀取不需要等待 hydration
  const user = useAuthStore(state => state.user)

  // ✅ 優化：讀取操作不等待 auth hydration，讓 SWR 立即從快取顯示資料
  // RLS 已在資料庫層保護資料，前端不需要重複驗證
  const swrKey = buildSwrKey(params)

  const {
    data,
    error,
    isLoading,
    mutate: mutateSelf,
  } = useSWR(
    swrKey,
    async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Start building query
      let query = supabase
        .from('tours')
        .select(
          'id, code, name, location, country_id, airport_code, status, departure_date, return_date, price, selling_price_per_person, max_participants, current_participants, total_revenue, total_cost, profit, archived, is_active, itinerary_id, workspace_id, created_at, days_count',
          { count: 'exact' }
        )
        .eq('is_active', true) // 過濾已刪除的團
        .range(from, to) // ✅ Server-side pagination
        .order(sortBy, { ascending: sortOrder === 'asc' })

      // ✅ Server-side status filtering（tour_type 已併入 status：template/proposal/upcoming/ongoing/returned/closed）
      // 「upcoming / ongoing / returned」顯示層可再用 departure_date / return_date 細分
      const todayStr = new Date().toISOString().split('T')[0]

      if (status === TOUR_STATUS.PROPOSAL) {
        query = query.eq('status', TOUR_STATUS.PROPOSAL).neq('archived', true)
      } else if (status === TOUR_STATUS.TEMPLATE) {
        query = query.eq('status', TOUR_STATUS.TEMPLATE).neq('archived', true)
      } else if (status === 'archived') {
        // 封存是獨立欄位、不是 status 值
        query = query.eq('archived', true)
      } else if (status === TOUR_STATUS.UPCOMING) {
        // 即將出發：status='upcoming'，出發日未到
        query = query
          .neq('archived', true)
          .eq('status', TOUR_STATUS.UPCOMING)
      } else if (status === TOUR_STATUS.ONGOING) {
        // 旅行中：status='ongoing'
        query = query
          .neq('archived', true)
          .eq('status', TOUR_STATUS.ONGOING)
      } else if (status === TOUR_STATUS.RETURNED) {
        // 未結案：status='returned'，已回程但尚未結案
        query = query
          .neq('archived', true)
          .eq('status', TOUR_STATUS.RETURNED)
      } else if (status === TOUR_STATUS.CLOSED) {
        // 已結案：只看 status='closed'
        query = query
          .neq('archived', true)
          .eq('status', TOUR_STATUS.CLOSED)
      } else {
        // fallback：排除封存、提案/模板
        query = query
          .neq('archived', true)
          .in('status', [
            TOUR_STATUS.UPCOMING,
            TOUR_STATUS.ONGOING,
            TOUR_STATUS.RETURNED,
            TOUR_STATUS.CLOSED,
          ])
      }

      // ✅ Server-side search
      if (search && search.trim()) {
        const searchTerm = search.trim()
        query = query.or(
          `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        )
      }

      const { data: tours, count, error: queryError } = await query

      if (queryError) {
        logger.error('❌ Error fetching paginated tours:', queryError.message)
        throw new Error(queryError.message)
      }

      // 待結案優先排序：return_date 已過但 status 還沒 closed 的排最前
      const todayMs = Date.now()
      const sorted = [...(tours || [])].sort((a, b) => {
        const aPending =
          a.return_date && new Date(a.return_date).getTime() < todayMs && a.status !== 'closed'
            ? 0
            : 1
        const bPending =
          b.return_date && new Date(b.return_date).getTime() < todayMs && b.status !== 'closed'
            ? 0
            : 1
        if (aPending !== bPending) return aPending - bPending
        const ad = a.departure_date ? new Date(a.departure_date).getTime() : 0
        const bd = b.departure_date ? new Date(b.departure_date).getTime() : 0
        return sortOrder === 'asc' ? ad - bd : bd - ad
      })

      return {
        tours: sorted as Tour[],
        count: count || 0,
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  )

  // Invalidate all paginated queries (used after mutations)
  const invalidateAllPaginatedQueries = async () => {
    await mutateSelf()
    await mutate('tours')
  }

  useEffect(() => {
    const workspaceId = user?.workspace_id
    if (!workspaceId) return

    const channel = supabase
      .channel(`realtime:tours-paginated:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tours',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          mutateSelf()
          mutate('tours')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.workspace_id, mutateSelf])

  // Create tour
  const createTour = async (
    tourData: Omit<Tour, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Tour> => {
    const now = new Date().toISOString()
    const newTour = {
      ...tourData,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    } as Tour

    try {
      const { error: insertError } = await supabase
        .from('tours')
        .insert(newTour as unknown as Database['public']['Tables']['tours']['Insert'])

      if (insertError) throw insertError

      await invalidateAllPaginatedQueries()
      return newTour
    } catch (err) {
      await invalidateAllPaginatedQueries()
      throw err
    }
  }

  // Update tour
  const updateTour = async (id: string, updates: Partial<Tour>): Promise<Tour> => {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 樂觀更新（非封存情況）
    if (!('archived' in updates)) {
      await mutateSelf(
        prev =>
          prev
            ? {
                ...prev,
                tours: prev.tours.map(t => (t.id === id ? { ...t, ...updatedData } : t)),
              }
            : prev,
        { revalidate: false }
      )
    }

    try {
      const { data: updated, error: updateError } = await supabase
        .from('tours')
        .update(updatedData as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // 封存/解封時：立即從列表移除（不等 refetch）
      if ('archived' in updates) {
        await mutateSelf(
          prev =>
            prev
              ? {
                  ...prev,
                  tours: prev.tours.filter(t => t.id !== id),
                  count: prev.count - 1,
                }
              : prev,
          { revalidate: false }
        )
      }
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
      return updated as Tour
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      await invalidateAllPaginatedQueries()
      throw err
    }
  }

  // Delete tour
  const deleteTour = async (id: string): Promise<boolean> => {
    // 樂觀更新：先從列表移除
    await mutateSelf(
      prev =>
        prev
          ? {
              ...prev,
              tours: prev.tours.filter(t => t.id !== id),
              count: prev.count - 1,
            }
          : prev,
      { revalidate: false }
    )

    try {
      await deleteTourEntity(id)
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
      return true
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      await invalidateAllPaginatedQueries()
      throw err
    }
  }

  // Refresh
  const refresh = async () => {
    await invalidateAllPaginatedQueries()
  }

  // 統一走中央 codes module（@/lib/codes）— DB RPC + advisory lock 防競態
  const generateTourCode = async (cityCode: string, date: Date): Promise<string> => {
    const workspaceId = user?.workspace_id
    if (!workspaceId) {
      throw new Error('無法取得 workspace code，請重新登入')
    }
    return generateTourCodeShared(workspaceId, cityCode, date)
  }

  // Loading state - 簡化：只看 SWR 的 isLoading
  const effectiveLoading = isLoading

  return {
    tours: data?.tours || [],
    totalCount: data?.count || 0,
    loading: effectiveLoading,
    error: error?.message || null,
    actions: {
      create: createTour,
      update: updateTour,
      delete: deleteTour,
      refresh,
      generateCode: generateTourCode,
    },
  }
}

/**
 * Hook for single tour details (with skip pattern)
 * Only fetches when tourId is provided
 */
export function useTourDetailsPaginated(tourId: string | null) {
  const {
    data: tour,
    error,
    isLoading,
    mutate: mutateTour,
  } = useSWR<Tour | null>(
    tourId ? `tour-detail-${tourId}` : null, // ✅ Skip pattern: null key = no fetch
    async () => {
      if (!tourId) return null

      const { data, error: queryError } = await supabase
        .from('tours')
        .select(
          'id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, outbound_flight, return_flight, is_active, confirmed_requirements, locked_itinerary_id, itinerary_id, locked_quote_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by'
        )
        .eq('id', tourId)
        .single()

      if (queryError) throw queryError
      return data as Tour
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000,
    }
  )

  const updateStatus = async (newStatus: NonNullable<Tour['status']>) => {
    if (!tourId) return null

    // 狀態轉換驗證
    const VALID_TOUR_TRANSITIONS: Record<string, string[]> = {
      開團: ['待出發', '取消'],
      待出發: ['已出發', '取消', '開團'],
      已出發: ['待結團'],
      待結團: ['已結團'],
      已結團: [],
      取消: ['開團'],
    }

    const { data: current, error: fetchError } = await supabase
      .from('tours')
      .select('status')
      .eq('id', tourId)
      .single()

    if (fetchError || !current) throw new Error('無法取得目前狀態')

    const currentStatus = current.status ?? ''
    if (!currentStatus || !VALID_TOUR_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `無法從「${currentStatus || ''}」轉為「${newStatus}」`
      )
    }

    const { data, error: updateError } = await supabase
      .from('tours')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tourId)
      .select()
      .single()

    if (updateError) throw updateError

    mutateTour(data as Tour)
    return data as Tour
  }

  return {
    tour: tour || null,
    loading: isLoading,
    error: error?.message || null,
    actions: {
      updateStatus,
      refresh: () => mutateTour(),
    },
  }
}
