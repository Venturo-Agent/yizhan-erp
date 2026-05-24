'use client'

/**
 * useRequestsListView — 請款列表頁專用 paginated hook（B 階段：伺服器主導分頁）
 *
 * 為什麼存在（比照 finance/payments 的 useReceiptsListView）：
 * - 請款頁原本 usePayments → usePaymentRequests({ all: true }) 全撈、前端 tab 篩選 + 複合排序，
 *   資料一多就慢 + 吃 egress（效能 #2）。改成每頁只載 15 筆、範圍/未付/搜尋/排序全交給 DB。
 * - tab 範圍篩選 + 未付篩選 + server 搜尋，集中在一個 hook、不在 page.tsx 散刻 supabase（紅線 F）。
 *
 * 業務語意（tab = 請款類別）：
 * - 用 `request_category`(tour/company/salary) 當範圍 SSOT。
 *   ✏️ 校準：舊請款頁的 tab 用 type guard（request_type 文字比對 + tour_id 推導）分類，
 *   但 request_category 才是全 app 的事實 SSOT（薪資結算寫 'salary'、獎金/手續費寫 'company'、
 *   報表 / 列印 / 編輯對話框全用 request_category 篩選；guard 是遺留特例）。
 *   現有資料 100% 吻合（43/43 category==guard），改用 category 更正確、更一致、server query 更乾淨。
 * - tab='all'：依 capability 顯示能看的類別聯集（全有→不加範圍篩選、看全部）。
 * - statusFilter='unpaid'：只看未付（status in pending / confirmed）——丙案：未付當篩選不當排序。
 *
 * 紅線守門：
 * - workspace_id：透過 RLS（DB 層）保護、前端不刻特權。
 * - 軟刪除：filterActive（deleted_at IS NULL）。
 * - select 省掉重的 items join（列表不顯示、編輯模式另抓 items）、加 branch_id（分公司欄要用）。
 */

// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- tab 範圍 + 未付為複合條件、entity hook .eq chain 不支援；比照 useReceiptsListView、架構說明見 file header
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'
import type { PaymentRequest } from '@/stores/types'

export type RequestScopeTab = 'all' | 'tour' | 'company' | 'salary'
export type RequestStatusFilter = 'all' | 'unpaid'
type RequestCategory = 'tour' | 'company' | 'salary'

interface UseRequestsListViewParams {
  page: number
  pageSize: number
  tab: RequestScopeTab
  /** capability：能看團體請款 */
  canTour: boolean
  /** capability：能看公司請款 */
  canCompany: boolean
  /** capability：能看薪資請款 */
  canSalary: boolean
  statusFilter?: RequestStatusFilter
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface UseRequestsListViewResult {
  items: PaymentRequest[]
  totalCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// 跟 src/data/entities/payment-requests.ts list.select 對齊；省掉 items join（列表不顯示）、加 branch_id（分公司欄）
const LIST_SELECT =
  'id,code,request_number,request_date,request_type,request_category,expense_type,tour_id,tour_code,tour_name,order_id,order_number,supplier_id,supplier_name,amount,total_amount,status,is_special_billing,batch_id,branch_id,notes,payment_method_id,accounting_subject_id,accounting_voucher_id,budget_warning,transferred_pair_id,disbursement_order_id,approved_at,approved_by,paid_at,paid_by,created_by_name,workspace_id,created_at,created_by,updated_at,updated_by'

/** 解析 tab + capability → 實際要顯示的請款類別集合 */
function resolveCategories(
  tab: RequestScopeTab,
  canTour: boolean,
  canCompany: boolean,
  canSalary: boolean
): RequestCategory[] {
  if (tab === 'tour') return ['tour']
  if (tab === 'company') return ['company']
  if (tab === 'salary') return ['salary']
  // tab === 'all'：依 capability 聯集
  const cats: RequestCategory[] = []
  if (canTour) cats.push('tour')
  if (canCompany) cats.push('company')
  if (canSalary) cats.push('salary')
  return cats
}

export function useRequestsListView(
  params: UseRequestsListViewParams
): UseRequestsListViewResult {
  const {
    page,
    pageSize,
    tab,
    canTour,
    canCompany,
    canSalary,
    statusFilter = 'all',
    search,
    sortBy = 'request_date',
    sortOrder = 'desc',
  } = params

  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state._hasHydrated)
  const isReady = hasHydrated && isAuthenticated

  const swrKey = isReady
    ? `requests-list-view:${JSON.stringify({
        page,
        pageSize,
        tab,
        canTour,
        canCompany,
        canSalary,
        statusFilter,
        search: search?.trim() || '',
        sortBy,
        sortOrder,
      })}`
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = filterActive(
        supabase.from('payment_requests').select(LIST_SELECT, { count: 'exact' })
      )
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      // tab 範圍：用 request_category 過濾。全 3 類都能看（且 tab=all）→ 不加範圍篩選、看全部。
      const cats = resolveCategories(tab, canTour, canCompany, canSalary)
      if (cats.length > 0 && cats.length < 3) {
        query = query.in('request_category', cats)
      }

      // 未付篩選（丙案：當篩選）。未付 = 尚未付款 = pending / confirmed（已核准未撥）
      if (statusFilter === 'unpaid') {
        query = query.in('status', ['pending', 'confirmed'])
      }

      // server-side 搜尋：請款單號 / 團名 / 訂單編號
      const term = search?.trim()
      if (term) {
        query = query.or(
          `code.ilike.%${term}%,tour_name.ilike.%${term}%,order_number.ilike.%${term}%`
        )
      }

      const { data: rows, count, error: queryError } = await query

      if (queryError) {
        logger.error('[requests] list view fetch error:', queryError.message)
        throw queryError
      }

      return {
        items: (rows || []) as unknown as PaymentRequest[],
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
