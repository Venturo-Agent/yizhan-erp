'use client'

/**
 * Tours Entity
 *
 * 使用方式：
 * import { useTours, useTour, useToursPaginated, useTourDictionary } from '@/data'
 */

import useSWR from 'swr'
import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS, type ListResult } from '../core/types'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { UserRole } from '@/types/user.types'
import type { Tour } from '@/stores/types'

// ============================================
// Entity 定義
// ============================================

const tourEntity = createEntityHook<Tour>('tours', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    // 2026-05-15 補 tour_service_type / country_code / 旅平險 / controller / quote_cost_structure / 航班 / 自訂成本 / 合約細節 / 修改理由 / checkin_qrcode / 軟刪
    select:
      'id,code,name,departure_date,return_date,status,location,current_participants,max_participants,price,profit,total_cost,total_revenue,archived,is_active,contract_status,contract_completed,contract_template,contract_content,contract_notes,contract_archived_date,envelope_records,features,country_id,country_code,airport_code,itinerary_id,locked_at,locked_by,locked_itinerary_id,locked_itinerary_version,locked_quote_id,locked_quote_version,last_unlocked_at,last_unlocked_by,closing_date,closed_by,enable_checkin,checkin_qrcode,outbound_flight,return_flight,quote_cost_structure,custom_cost_fields,selling_price_per_person,days_count,tour_service_type,liability_insurance_coverage,medical_insurance_coverage,controller_id,modification_reason,archive_reason,confirmed_requirements,workspace_id,created_at,created_by,updated_at,updated_by',
    orderBy: {
      column: 'departure_date',
      ascending: false,
    },
    filterSoftDeleted: true,
  },
  slim: {
    select:
      'id,code,name,departure_date,return_date,status,location,current_participants,max_participants,archived,workspace_id,country_id,airport_code,selling_price_per_person,created_at,updated_at,locked_at,locked_itinerary_id,itinerary_id,contract_template,contract_completed,contract_archived_date',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.high,
})

// ============================================
// 行事曆專用 Hook（日期範圍查詢）
// ============================================

interface DateRange {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
}

/**
 * 行事曆專用 Tours Hook
 * 只載入指定日期範圍內的團（出發日或回程日在範圍內）
 */
export function useToursForCalendar(dateRange: DateRange | null): ListResult<Tour> {
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state._hasHydrated)

  const isReady = hasHydrated && isAuthenticated && !!user?.id
  // userRole 僅供 SWR cache scoping、不用於權限決策
  const _userRole = 'staff' as UserRole
  const workspaceId = user?.workspace_id

  // SWR key 包含日期範圍
  const swrKey =
    isReady && dateRange ? `entity:tours:calendar:${dateRange.start}:${dateRange.end}` : null

  const { data, error, isLoading, mutate } = useSWR<Tour[]>(
    swrKey,
    async () => {
      if (!dateRange) return []

      // 選擇精簡欄位（行事曆只需要這些）
      const selectFields =
        'id,code,name,departure_date,return_date,status,location,current_participants,max_participants,archived'

      let query = supabase
        .from('tours')
        .select(selectFields)
        // 日期範圍過濾：團出發日在範圍結束前，且回程日在範圍開始後（或尚未設定回程日）
        // 這樣可以正確選取所有與日期範圍重疊的團
        .lte('departure_date', dateRange.end)
        .or(
          `return_date.gte.${dateRange.start},return_date.is.null,departure_date.gte.${dateRange.start}`
        )
        .order('departure_date', { ascending: false })

      // 套用 workspace 過濾
      if (workspaceId) {
        query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []) as unknown as Tour[]
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 分鐘內重複請求使用快取
    }
  )

  return {
    items: data || [],
    loading: isLoading && !data,
    error: error?.message || null,
    refresh: async () => {
      await mutate()
    },
  }
}

// ============================================
// 便捷 Hooks Export
// ============================================

/** 完整 Tours 列表 */
export const useTours = tourEntity.useList

/** 精簡 Tours 列表（列表顯示用）*/
export const useToursSlim = tourEntity.useListSlim

/** 單筆 Tour（支援 skip pattern）*/
export const useTour = tourEntity.useDetail

/** 分頁 Tours（server-side pagination + filter + search）*/
const _useToursPaginated = tourEntity.usePaginated

/** Tour Dictionary（O(1) 查詢）*/
export const useTourDictionary = tourEntity.useDictionary

// useToursForCalendar 已在上方定義並匯出

// ============================================
// 單次查詢 helpers（非 SWR，用於頁面路由初始化）
// ============================================

/**
 * 根據團號 code 查詢 tour id
 * 設計為 SWR fetcher 使用，不應直接呼叫
 */
export async function fetchTourIdByCode(code: string): Promise<string | null> {
  const { data, error } = await supabase.from('tours').select('id').eq('code', code).single()
  if (error || !data) return null
  return data.id
}

// ============================================
// CRUD Export
// ============================================

/** 建立 Tour */
export const createTour = tourEntity.create

/** 更新 Tour */
export const updateTour = tourEntity.update

/** 刪除 Tour */
export const deleteTour = tourEntity.delete

/** 使 Tour 快取失效 */
export const invalidateTours = tourEntity.invalidate
