'use client'

/**
 * useReceiptsListView — 收款列表頁專用 paginated hook（B 階段：伺服器主導分頁）
 *
 * 為什麼存在（比照 src/app/(main)/orders/_hooks/useOrdersListView.ts）：
 * - tab 範圍篩選需「tour_id / order_id 是否為空」的 OR / IS NULL 條件，
 *   entity hook（useReceiptsPaginated）的 .eq chain 表達不了。
 * - 收款頁要 server 分頁 + tab + 未付篩選 + 搜尋，集中在一個 hook、
 *   不在 page.tsx 散刻 supabase（紅線 F：列表 hook 統一）。
 *
 * 業務語意：
 * - tab='tour'   ：團體收款（有綁團 tour_id，或有綁單 order_id）
 * - tab='company'：公司收款（都沒綁 = 退稅 / 利息 / 佣金等公司進帳）
 * - tab='all'    ：依 capability 顯示（兩種都能看→全部；只一種→該類）
 * - statusFilter='unpaid'：只看未付（status in pending / pending_verify）
 *   —— William 2026-05-24 丙案：分頁情境下「未付」當篩選、不當排序（比排序更直覺）。
 *
 * 紅線守門：
 * - workspace_id：透過 RLS（DB 層）保護、前端不刻特權。
 * - 軟刪除：filterActive 過濾（跟 entity list filterSoftDeleted 一致）。
 * - select 欄位跟 src/data/entities/receipts.ts list.select 對齊（含 payment_methods join），避免列表 UI 拿不到欄位。
 */

// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- tab 範圍需 OR / IS NULL 條件、entity hook 不支援；比照 useOrdersListView、架構說明見 file header
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeSync } from '@/data/core/entityHookRealtime'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'
import type { Receipt } from '@/types/receipt.types'

export type ReceiptScopeTab = 'all' | 'tour' | 'company'
export type ReceiptStatusFilter = 'all' | 'unpaid'

interface UseReceiptsListViewParams {
  page: number
  pageSize: number
  tab: ReceiptScopeTab
  /** capability：能看團體收款 */
  canTour: boolean
  /** capability：能看公司收款 */
  canCompany: boolean
  statusFilter?: ReceiptStatusFilter
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface UseReceiptsListViewResult {
  items: Receipt[]
  totalCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// 跟 src/data/entities/receipts.ts list.select 一致（含退款欄 / 發票連動 / 驗證 / payment_methods join）
const LIST_SELECT =
  'id,receipt_number,order_id,order_number,tour_id,tour_name,customer_id,customer_name,actual_amount,receipt_amount,fees,status,payment_method,payment_method_id,payment_methods!fk_receipts_payment_method(name,code),payment_date,receipt_date,receipt_type,receipt_account,accounting_subject_id,bank_account_last5,confirmed_at,confirmed_by,is_active,workspace_id,branch_id,created_at,created_by,updated_at,updated_by,notes,batch_id,transferred_pair_id,refunded_at,refund_amount,refund_voucher_id,refund_notes,refunded_by,invoice_id,verified_by,verified_at,rejected_reason'

/** 解析 tab + capability → 實際 server 範圍 */
function resolveScope(
  tab: ReceiptScopeTab,
  canTour: boolean,
  canCompany: boolean
): 'tour' | 'company' | 'both' {
  if (tab === 'tour') return 'tour'
  if (tab === 'company') return 'company'
  // tab === 'all'：依 capability
  if (canTour && canCompany) return 'both'
  if (canCompany) return 'company'
  return 'tour'
}

export function useReceiptsListView(params: UseReceiptsListViewParams): UseReceiptsListViewResult {
  const {
    page,
    pageSize,
    tab,
    canTour,
    canCompany,
    statusFilter = 'all',
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params

  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state._hasHydrated)
  const isReady = hasHydrated && isAuthenticated

  const swrKey = isReady
    ? `receipts-list-view:${JSON.stringify({
        page,
        pageSize,
        tab,
        canTour,
        canCompany,
        statusFilter,
        search: search?.trim() || '',
        sortBy,
        sortOrder,
      })}`
    : null

  // 同事改 → 訂閱 receipts 表變更、刷新本列表自訂分頁 key（北極星 V2「同事改自動同步」）。
  // 複用 entity hook realtime（receipts 已在 publication）；server 分頁只 revalidate 當前頁。
  useRealtimeSync('receipts', 'receipts-list-view')

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // 排序（William 2026-05-26 拍板：分群改吃「狀態」生成欄、修狀態穿插）：
      // 1. list_sort_group：待確認(pending/pending_verify)=0 在上、已確認(confirmed)=1、已退回/取消/退款=2 沉底
      //    —— 不再靠 confirmed_at 的 nullsFirst 分群（confirmed_at 空值會穿插）
      // 2. 群內：
      //    - 預設（收款日 receipt_date）走 list_sort_key —— 待確認「舊在上」(很早收錢卻還沒核銷的浮頂)、已確認/終態「新在上」
      //    - 使用者點其他欄位排序時，群內改用該欄位（方向照使用者選的）
      // 3. id 做穩定 tiebreak —— 同一鍵多筆不再隨機亂跳
      // ⚠️ list_sort_group / list_sort_key 是 DB 生成欄（見 migration finance_list_sort_keys、需先 apply）
      let query = filterActive(
        supabase.from('receipts').select(LIST_SELECT, { count: 'exact' })
      ).order('list_sort_group', { ascending: true })

      query =
        sortBy === 'receipt_date'
          ? query.order('list_sort_key', { ascending: true })
          : query.order(sortBy, { ascending: sortOrder === 'asc' })

      query = query.order('id', { ascending: true }).range(from, to)

      // tab 範圍：團體 = 有綁團或綁單；公司 = 都沒綁
      const scope = resolveScope(tab, canTour, canCompany)
      if (scope === 'tour') {
        query = query.or('tour_id.not.is.null,order_id.not.is.null')
      } else if (scope === 'company') {
        query = query.is('tour_id', null).is('order_id', null)
      }
      // 'both' → 不加範圍篩選

      // 未付篩選（丙案：當篩選）
      if (statusFilter === 'unpaid') {
        query = query.in('status', ['pending', 'pending_verify'])
      }

      // server-side 搜尋：收款單號 / 團名
      const term = search?.trim()
      if (term) {
        query = query.or(`receipt_number.ilike.%${term}%,tour_name.ilike.%${term}%`)
      }

      const { data: rows, count, error: queryError } = await query

      if (queryError) {
        logger.error('[receipts] list view fetch error:', queryError.message)
        throw queryError
      }

      return {
        items: (rows || []) as unknown as Receipt[],
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
