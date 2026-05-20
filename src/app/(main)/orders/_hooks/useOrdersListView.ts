'use client'

/**
 * useOrdersListView — 訂單列表頁專用 paginated hook
 *
 * 為什麼存在：
 * - SSOT 的 useOrdersPaginated（entity hook）只支援 .eq filter chain（AND）、
 *   無法表達「業務員視角 = sales_person 是我 OR created_by 是我」這種 OR 條件。
 * - 列表頁有「全部訂單 / 只看我的」toggle 需求（業務員視角過濾）。
 * - 在 page.tsx 直接打 supabase 會破壞「列表 hook 統一」這個 pattern。
 * - 參考 src/app/(main)/tours/_hooks/useToursPaginated.ts 同樣模式。
 *
 * 業務語意：
 * - viewMode='all'：列出 workspace 內所有未刪除訂單。
 * - viewMode='mine'：列出「我業務的（sales_person 比 user.display_name 或 english_name）
 *                   或 我建的（created_by 比 user.id）」訂單。最寬鬆 = 業務員直覺最大化。
 *
 * 紅線守門：
 * - workspace_id 過濾：透過 RLS（DB 層）保護、前端不刻 admin 特權。
 * - 軟刪除：過濾掉軟刪 row（跟 entity hook list 設定一致）。
 * - 排序、select 欄位、cache 行為跟 useOrdersPaginated 對齊、避免列表 UI 拿不到欄位。
 */

// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- OR filter（sales_person OR created_by）entity hook 不支援；架構說明見 file header
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'
import type { Order } from '@/stores/types'

export type OrdersViewMode = 'all' | 'mine'

interface UseOrdersListViewParams {
  page: number
  pageSize: number
  search?: string
  viewMode: OrdersViewMode
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface UseOrdersListViewResult {
  items: Order[]
  totalCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// 跟 src/data/entities/orders.ts list.select 一致、確保列表 UI 拿到的欄位齊全
// A1（5/13 拍板）：砍 orders.code、order_number 為 SSOT
const LIST_SELECT =
  'id,order_number,tour_id,tour_name,contact_person,contact_phone,contact_email,customer_id,sales_person,assistant,status,payment_status,paid_amount,remaining_amount,total_amount,member_count,adult_count,departure_date,is_active,workspace_id,created_at,created_by,updated_at,updated_by'

// PostgREST .or() 內含逗號 / 括號的 value 需要包雙引號；display_name 通常沒這些、保險為要
function escapeOrValue(value: string): string {
  // 含逗號 / 括號 / 空白 → 用 PostgREST 雙引號包；其餘直接用
  if (/[,()\s"']/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  return value
}

export function useOrdersListView(params: UseOrdersListViewParams): UseOrdersListViewResult {
  const {
    page,
    pageSize,
    search,
    viewMode,
    sortBy = 'departure_date',
    sortOrder = 'desc',
  } = params

  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state._hasHydrated)
  const isReady = hasHydrated && isAuthenticated && !!user?.id

  // 「只看我的」必須等 user 資料就位、否則 OR 條件拼出來是空的、會抓 0 筆造成誤導
  const canFetch =
    isReady && (viewMode === 'all' || (viewMode === 'mine' && !!user?.id))

  const swrKey = canFetch
    ? `orders-list-view:${JSON.stringify({
        page,
        pageSize,
        search: search?.trim() || '',
        viewMode,
        sortBy,
        sortOrder,
        // 「只看我的」key 帶 user.id、切人時不誤拿前一個 user 的 cache
        userId: viewMode === 'mine' ? user?.id : null,
      })}`
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = filterActive(
        supabase
          .from('orders')
          .select(LIST_SELECT, { count: 'exact' })
      )
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      // 「只看我的」server-side OR 過濾：sales_person 比中文名 / 英文名（add-order-form 寫入時兩者擇一）
      // 加 created_by 比 user.id（紅線 B：created_by FK 指 employees.id、user.id = employee.id）
      if (viewMode === 'mine' && user?.id) {
        const orParts: string[] = [`created_by.eq.${user.id}`]
        if (user.display_name) {
          orParts.push(`sales_person.eq.${escapeOrValue(user.display_name)}`)
        }
        if (user.english_name && user.english_name !== user.display_name) {
          orParts.push(`sales_person.eq.${escapeOrValue(user.english_name)}`)
        }
        query = query.or(orParts.join(','))
      }

      // server-side search（跟原 page.tsx 行為一致：團號 / 團名 ilike）
      const searchTerm = search?.trim()
      if (searchTerm) {
        query = query.or(
          `code.ilike.%${searchTerm}%,tour_name.ilike.%${searchTerm}%`
        )
      }

      const { data: rows, count, error: queryError } = await query

      if (queryError) {
        logger.error('[orders] list view fetch error:', queryError.message)
        throw queryError
      }

      return {
        items: (rows || []) as unknown as Order[],
        totalCount: count || 0,
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  )

  return {
    items: data?.items || [],
    totalCount: data?.totalCount || 0,
    loading: !hasHydrated || isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: async () => {
      await mutate()
    },
  }
}
