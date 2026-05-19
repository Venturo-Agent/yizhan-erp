/**
 * Receipt Service - 收款核心邏輯
 *
 * 所有收款建立、確認、刪除後的統計更新都透過這裡
 * 確保訂單 paid_amount / payment_status 和團 total_revenue / profit 一致
 *
 * 注意：因為這個 service 從 server API + browser 兩種 context 都會被呼叫、
 * supabase client 用參數傳進來、避免「server context 用瀏覽器 client 拿不到 session」的隱性 bug。
 */

import { logger } from '@/lib/utils/logger'
import { supabase as browserSupabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

type DbClient = SupabaseClient

/**
 * 收款變動後重算訂單和團的統計數據
 * - 只計算 status='confirmed' / 'refunded' 且未刪除的收款
 * - 任何收款建立、確認、刪除、退款後都應呼叫
 *
 * @param orderId  訂單 id（影響 orders.paid_amount / payment_status）
 * @param tourId   團 id（影響 tours.total_revenue / profit）
 * @param client   可選的 supabase client；server context 必須傳入 server client、否則沒有 user session
 */
export async function recalculateReceiptStats(
  orderId: string | null | undefined,
  tourId: string | null | undefined,
  client?: DbClient
): Promise<void> {
  const sb = client ?? browserSupabase
  if (orderId) {
    await recalculateOrderPayment(sb, orderId)
  }
  if (tourId) {
    await recalculateTourFinancials(sb, tourId)
  }
  await invalidateFinanceCache(tourId)
}

/**
 * 重算訂單的已收金額和付款狀態
 * - 已確認 (confirmed)：actual_amount 全額計入
 * - 已退款 (refunded)：actual_amount − refund_amount（部分退款留剩餘、全退留 0）
 */
async function recalculateOrderPayment(sb: DbClient, orderId: string): Promise<void> {
  const { data: orderData, error: orderError } = await sb
    .from('orders')
    .select('total_amount')
    .eq('id', orderId)
    .single()

  if (orderError) {
    logger.error('查詢訂單總金額失敗:', orderError)
    throw orderError
  }

  const orderTotalAmount = orderData?.total_amount || 0

  const { data: confirmedReceipts, error: receiptsError } = await sb
    .from('receipts')
    .select('actual_amount, status, refund_amount')
    .eq('order_id', orderId)
    .in('status', ['confirmed', 'refunded'])
    .eq('is_active', true)

  if (receiptsError) {
    logger.error('查詢已確認收款失敗:', receiptsError)
    throw receiptsError
  }

  const totalPaid = (confirmedReceipts || []).reduce((sum, r) => {
    const actual = Number(r.actual_amount) || 0
    if (r.status === 'refunded') {
      return sum + Math.max(0, actual - (Number(r.refund_amount) || 0))
    }
    return sum + actual
  }, 0)

  let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid'
  if (totalPaid >= orderTotalAmount && orderTotalAmount > 0) {
    paymentStatus = 'paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  const { error } = await sb
    .from('orders')
    .update({
      paid_amount: totalPaid,
      remaining_amount: Math.max(0, orderTotalAmount - totalPaid),
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    logger.error('更新訂單付款狀態失敗:', error)
    throw error
  }

  logger.log('訂單付款狀態已重算:', {
    order_id: orderId,
    paid_amount: totalPaid,
    payment_status: paymentStatus,
  })
}

/**
 * 重算團的財務數據（總收入和利潤）
 */
async function recalculateTourFinancials(sb: DbClient, tourId: string): Promise<void> {
  const { data: tourOrdersData, error: tourOrdersError } = await sb
    .from('orders')
    .select('id')
    .eq('tour_id', tourId)

  if (tourOrdersError) {
    logger.error('查詢團訂單失敗:', tourOrdersError)
    throw tourOrdersError
  }

  const orderIds = (tourOrdersData || []).map(o => o.id)

  let receiptsQuery = sb
    .from('receipts')
    .select('actual_amount, status, refund_amount')
    .in('status', ['confirmed', 'refunded'])
    .eq('is_active', true)

  if (orderIds.length > 0) {
    receiptsQuery = receiptsQuery.or(`order_id.in.(${orderIds.join(',')}),tour_id.eq.${tourId}`)
  } else {
    receiptsQuery = receiptsQuery.eq('tour_id', tourId)
  }

  const { data: receiptsData, error: receiptsQueryError } = await receiptsQuery

  if (receiptsQueryError) {
    logger.error('查詢已確認收款失敗:', receiptsQueryError)
    throw receiptsQueryError
  }

  const totalRevenue = (receiptsData || []).reduce((sum, r) => {
    const actual = Number(r.actual_amount) || 0
    if (r.status === 'refunded') {
      return sum + Math.max(0, actual - (Number(r.refund_amount) || 0))
    }
    return sum + actual
  }, 0)

  const { data: currentTour, error: tourCostError } = await sb
    .from('tours')
    .select('total_cost')
    .eq('id', tourId)
    .single()

  if (tourCostError) {
    logger.error('查詢團成本失敗:', tourCostError)
    throw tourCostError
  }

  const totalCost = currentTour?.total_cost || 0
  const profit = totalRevenue - totalCost

  const { error } = await sb
    .from('tours')
    .update({
      total_revenue: totalRevenue,
      profit: profit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tourId)

  if (error) {
    logger.error('更新團財務數據失敗:', error)
    throw error
  }

  logger.log('團財務數據已重算:', {
    tour_id: tourId,
    total_revenue: totalRevenue,
    profit,
  })
}

/**
 * 刷新 SWR 快取（走 entity registry、命中所有 :list / :detail / :paginated key）
 */
async function invalidateFinanceCache(_tourId?: string | null): Promise<void> {
  // SWR 只在瀏覽器有意義；server context 跑到這裡會找不到 SWR cache、靜默 no-op
  if (typeof window === 'undefined') return

  const { invalidateTours, invalidateOrders, invalidateReceipts } = await import('@/data')
  await Promise.all([invalidateTours(), invalidateOrders(), invalidateReceipts()])
}
