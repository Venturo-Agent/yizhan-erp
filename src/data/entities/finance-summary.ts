'use client'

/**
 * Finance Summary RPC Hooks
 *
 * 將 cross-table aggregate（tour PL / treasury summary）的 RPC 呼叫
 * 封裝為 entity hook、避免 feature 層直接 import supabase。
 *
 * 使用方式：
 * import { useTourPL, useTreasurySummary } from '@/data'
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

// 自訂 RPC type-safe wrapper：types.ts 由 `supabase gen` 產出、未同步的 RPC 透過此處手動定型
type CustomRpcMap = {
  compute_tour_pl: {
    args: { p_tour_id: string }
    returns: Array<{
      estimated_revenue: number | string
      confirmed_revenue: number | string
      cost: number | string
      gross_profit: number | string
      estimated_profit: number | string
      margin: number | string
      order_count: number | string
    }>
  }
  compute_treasury_summary: {
    args: { p_workspace_id: string; p_period_start: string; p_period_end: string }
    returns: Array<{
      total_receipts: number | string
      total_payments: number | string
      balance: number | string
      pending_receipts: number | string
      pending_payments: number | string
      pending_disbursements: number | string
    }>
  }
}

const customRpc = supabase as unknown as {
  rpc<K extends keyof CustomRpcMap>(
    fn: K,
    args: CustomRpcMap[K]['args']
  ): Promise<{ data: CustomRpcMap[K]['returns'] | null; error: Error | null }>
}

// ============================================
// Tour P&L
// ============================================

export interface TourPL {
  estimated_revenue: number
  confirmed_revenue: number
  cost: number
  gross_profit: number
  estimated_profit: number
  margin: number
  order_count: number
}

/**
 * 取得單一 tour 的 P&L 數字（estimated/confirmed revenue、cost、gross_profit、margin）
 * 取代 client-side 撈 receipts + payment_requests 自己 sum 的 N+1 邏輯
 */
export function useTourPL(tourId: string | null | undefined) {
  const swrKey = tourId ? ['compute_tour_pl', tourId] : null
  const { data, error, isLoading, mutate } = useSWR<TourPL | null>(
    swrKey,
    async () => {
      if (!tourId) return null
      const { data, error } = await customRpc.rpc('compute_tour_pl', {
        p_tour_id: tourId,
      })
      if (error) throw error
      const row = data?.[0]
      if (!row) return null
      // 將 numeric 強制轉為 number（PostgREST 對 numeric 可能回 string）
      return {
        estimated_revenue: Number(row.estimated_revenue) || 0,
        confirmed_revenue: Number(row.confirmed_revenue) || 0,
        cost: Number(row.cost) || 0,
        gross_profit: Number(row.gross_profit) || 0,
        estimated_profit: Number(row.estimated_profit) || 0,
        margin: Number(row.margin) || 0,
        order_count: Number(row.order_count) || 0,
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  )
  return { data, error, isLoading, mutate }
}

// ============================================
// Treasury Summary
// ============================================

export interface TreasurySummary {
  total_receipts: number
  total_payments: number
  balance: number
  pending_receipts: number
  pending_payments: number
  pending_disbursements: number
}

/**
 * 取得指定期間內的金庫總覽彙總（收入 / 支出 / 餘額 / 各 pending 數）
 * 取代 client-side 全撈 receipts/payment_requests/disbursement_orders 再 aggregate
 */
export function useTreasurySummary(
  workspaceId: string | null | undefined,
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined
) {
  const swrKey =
    workspaceId && periodStart && periodEnd
      ? ['compute_treasury_summary', workspaceId, periodStart, periodEnd]
      : null
  const { data, error, isLoading, mutate } = useSWR<TreasurySummary | null>(
    swrKey,
    async () => {
      if (!workspaceId || !periodStart || !periodEnd) return null
      const { data, error } = await customRpc.rpc('compute_treasury_summary', {
        p_workspace_id: workspaceId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      })
      if (error) throw error
      const row = data?.[0]
      if (!row) return null
      return {
        total_receipts: Number(row.total_receipts) || 0,
        total_payments: Number(row.total_payments) || 0,
        balance: Number(row.balance) || 0,
        pending_receipts: Number(row.pending_receipts) || 0,
        pending_payments: Number(row.pending_payments) || 0,
        pending_disbursements: Number(row.pending_disbursements) || 0,
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  )
  return { data, error, isLoading, mutate }
}
