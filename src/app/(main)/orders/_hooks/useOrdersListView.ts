'use client'

/**
 * useOrdersListView — 訂單列表頁專用 paginated hook
 *
 * 為什麼存在：
 * - SSOT 的 useOrdersPaginated（entity hook）只支援 .eq filter chain（AND）、
 *   無法表達 server-side search 多欄 ilike OR 條件。
 * - 在 page.tsx 直接打 supabase 會破壞「列表 hook 統一」這個 pattern。
 * - 參考 src/app/(main)/tours/_hooks/useToursPaginated.ts 同樣模式。
 *
 * 業務語意（2026-05-30 William 拍板砍 UI toggle、改權限自動決定）：
 * - 有 cross_branch.read capability → 列出 workspace 內所有未刪除訂單（全部視角）。
 * - 沒有 cross_branch.read → 只列出「我是業務員的」訂單（sales_id = user.id）。
 * - 不包含 created_by（代建單不算「我的」、2026-05-26 William 拍板）。
 * - capability 還在 loading（首次進站 SWR 沒回）→ 保守視為沒有、套 sales_id filter。
 *   防誤抓全部資料、避免 race 期間流出跨業務員資料。
 *
 * 紅線守門：
 * - workspace_id 過濾：透過 RLS（DB 層）保護、前端不刻 admin 特權。
 * - 軟刪除：過濾掉軟刪 row（跟 entity hook list 設定一致）。
 * - 排序、select 欄位、cache 行為跟 useOrdersPaginated 對齊、避免列表 UI 拿不到欄位。
 */

// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- server-side search 多欄 ilike OR entity hook 不支援；架構說明見 file header
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeSync } from '@/data/core/entityHookRealtime'
import { useAuthStore } from '@/stores/auth-store'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'
import type { Order } from '@/stores/types'

interface UseOrdersListViewParams {
  page: number
  pageSize: number
  search?: string
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
// 5/26：加 sales_id + sales:sales_id(...) JOIN、列表顯示走 employees.display_name canonical
const LIST_SELECT =
  'id,order_number,tour_id,tour_name,contact_person,contact_phone,contact_email,customer_id,sales_person,sales_id,sales:sales_id(id,display_name,chinese_name,english_name),assistant,status,payment_status,paid_amount,remaining_amount,total_amount,member_count,adult_count,departure_date,is_active,workspace_id,created_at,created_by,updated_at,updated_by'

export function useOrdersListView(params: UseOrdersListViewParams): UseOrdersListViewResult {
  const { page, pageSize, search, sortBy = 'departure_date', sortOrder = 'desc' } = params

  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state._hasHydrated)
  const isReady = hasHydrated && isAuthenticated && !!user?.id

  // HR 權限自動決定視角：有 cross_branch.read 看全部、沒有只看自己的（William 2026-05-30 拍板）
  // capability loading 期間保守視為沒有、套 sales_id filter、避免誤抓全部資料
  const { has, loading: capsLoading } = useMyCapabilities()
  const canSeeAll = !capsLoading && has(CAPABILITIES.CROSS_BRANCH_READ)

  // 「只看我的」必須等 user 資料就位、否則 filter 拼出來是空的、會抓 0 筆造成誤導
  const canFetch = isReady && (canSeeAll || !!user?.id)

  const swrKey = canFetch
    ? `orders-list-view:${JSON.stringify({
        page,
        pageSize,
        search: search?.trim() || '',
        canSeeAll,
        sortBy,
        sortOrder,
        // 「只看我的」key 帶 user.id、切人時不誤拿前一個 user 的 cache
        userId: canSeeAll ? null : user?.id,
      })}`
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = filterActive(supabase.from('orders').select(LIST_SELECT, { count: 'exact' }))
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      // 沒 cross_branch.read → 只看自己負責的訂單（sales_id FK to employees）
      // 歷史單若只有 sales_person 沒 sales_id（5/13 前）→ 抓不到、需要另外回填、目前先不管
      // 不查 created_by — 代建的單不算「我的」訂單（2026-05-26 William 拍板）
      if (!canSeeAll && user?.id) {
        query = query.eq('sales_id', user.id)
      }

      // server-side search（跟原 page.tsx 行為一致：團號 / 團名 ilike）
      const searchTerm = search?.trim()
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,tour_name.ilike.%${searchTerm}%`)
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

  // 同事改任何訂單 → 訂閱 orders 表變更、刷新本列表自訂分頁 key（北極星 V2「同事改自動同步」）。
  // 複用 entity hook 同款 realtime 機制（orders 已在 realtime publication）；prefix 比對走自訂 cache。
  // 效能：server 分頁、一次只 revalidate 當前頁 15 筆、跟 entity hook tours/orders 同模式、不全表重抓。
  useRealtimeSync('orders', 'orders-list-view')

  return {
    items: data?.items || [],
    totalCount: data?.totalCount || 0,
    loading: !hasHydrated || capsLoading || isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: async () => {
      await mutate()
    },
  }
}
