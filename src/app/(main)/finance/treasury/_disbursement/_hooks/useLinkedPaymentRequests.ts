'use client'

/**
 * useLinkedPaymentRequests — 撥款頁專用：只撈「已連動到某出納單」的請款單（最少欄位）
 *
 * 為什麼存在（B 階段、效能 #2）：
 * - DisbursementPage 原本 `usePaymentRequests({ all: true })` 全撈整張 payment_requests 表
 *   （含 40+ 欄位 + items 巢狀 join），但全頁只用來：
 *     (a) 列表「請款單數」欄：依 disbursement_order_id 計數；
 *     (b) handleConfirmPaid：找出連動的請款單去標 paid + recalc。
 *   兩處都只關心 disbursement_order_id IS NOT NULL 的列、只需 id/disbursement_order_id/tour_id/status。
 * - 本 hook 只撈「已連動」的請款單 + 4 個欄位 → 規模化時大幅省 egress，行為不變
 *   （頁面的 .filter(r => r.disbursement_order_id === X) 在較小集合上結果一致）。
 *
 * 紅線守門：
 * - workspace_id：透過 RLS（DB 層）保護、前端不刻特權。
 * - 軟刪除：filterActive（deleted_at IS NULL）、跟 entity list 一致。
 * - 寫入後刷新：本 hook 有自己的 SWR key、invalidatePaymentRequests（entity key）刷不到、
 *   頁面 op 後要另呼叫本 hook 的 refresh()（比照 payments/page.tsx refreshAll 模式、紅線 F）。
 */

// eslint-disable-next-line venturo/no-direct-useswr-in-pages -- 需「disbursement_order_id IS NOT NULL」條件、entity hook .eq chain 不支援；比照 useReceiptsListView、架構說明見 file header
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { filterActive } from '@/lib/data/filter-active'

/** 撥款頁需要的請款單最小形狀（只取計數 + confirm-paid 用得到的欄位） */
export interface LinkedPaymentRequest {
  id: string
  disbursement_order_id: string | null
  tour_id: string | null
  status: string | null
}

interface UseLinkedPaymentRequestsResult {
  items: LinkedPaymentRequest[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useLinkedPaymentRequests(): UseLinkedPaymentRequestsResult {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state._hasHydrated)
  const isReady = hasHydrated && isAuthenticated

  const swrKey = isReady ? 'disbursement-linked-payment-requests' : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const { data: rows, error: queryError } = await filterActive(
        supabase
          .from('payment_requests')
          .select('id,disbursement_order_id,tour_id,status')
      ).not('disbursement_order_id', 'is', null)

      if (queryError) {
        logger.error('[disbursement] linked payment requests fetch error:', queryError.message)
        throw queryError
      }

      return (rows || []) as unknown as LinkedPaymentRequest[]
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  )

  return {
    items: data || [],
    loading: !hasHydrated || isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: async () => {
      await mutate()
    },
  }
}
