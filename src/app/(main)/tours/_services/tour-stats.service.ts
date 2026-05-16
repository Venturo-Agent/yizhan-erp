/**
 * tour-stats.service.ts - 旅遊團統計數據重算
 *
 * 提供 current_participants 的重算邏輯
 * 任何 order_members 新增/刪除後都應呼叫
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { mutate } from 'swr'

/**
 * 重算旅遊團的 current_participants
 *
 * @description 查詢該團所有訂單下的 order_members 數量，
 * 更新 tours.current_participants。這是團員人數的唯一真相源。
 * 任何 order_members 新增/刪除後都應呼叫此函數。
 *
 * @param tour_id - 團 ID
 * @returns void
 * @throws 如果 DB 查詢或更新失敗（catch 內部 log 但不會向上拋出）
 *
 * @example
 * // 團員異動後重算
 * await recalculateParticipants(order.tour_id)
 */
export async function recalculateParticipants(tour_id: string): Promise<void> {
  try {
    // 查該團所有訂單 ID
    const { data: orders_data, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('tour_id', tour_id)

    if (ordersError) {
      logger.error('查詢團訂單失敗:', ordersError)
      throw ordersError
    }

    const order_ids = (orders_data || []).map(o => o.id)

    let participant_count = 0

    if (order_ids.length > 0) {
      // 計算所有訂單下的 order_members 數量
      const { count, error } = await supabase
        .from('order_members')
        .select('*', { count: 'exact', head: true })
        .in('order_id', order_ids)

      if (error) {
        logger.error('查詢團員數量失敗:', error)
        throw error
      }

      participant_count = count || 0
    }

    // 更新 tours.current_participants
    const { error: update_error } = await supabase
      .from('tours')
      .update({
        current_participants: participant_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tour_id)

    if (update_error) {
      logger.error('更新團人數失敗:', update_error)
      throw update_error
    }

    // 刷新 SWR 快取
    await mutate('tours')
    await mutate(`tour-${tour_id}`)

    logger.log('團人數已重算:', { tour_id, current_participants: participant_count })
  } catch (error) {
    logger.error('recalculateParticipants 失敗:', error)
    throw error
  }
}

/**
 * 重算旅遊團的 total_revenue（從所有訂單 paid_amount 加總）
 *
 * @description 跟 receipt-core.service.recalculateTourFinancials 不同：
 * 那個是看「已收款 receipts」、這個是看「訂單記帳的 paid_amount」。
 * 兩個值理論上應該一致、但可能因 receipt 對帳延遲短暫不一致、
 * 提供這支讓「member 異動」/「order 異動」也能 trigger tour 統計刷新。
 *
 * 任何 order_members 異動 / order paid_amount 變動後都該呼叫。
 */
export async function recalculateTourRevenue(tour_id: string): Promise<void> {
  try {
    // 加總該團所有訂單的 paid_amount
    const { data: orders, error } = await supabase
      .from('orders')
      .select('paid_amount, total_amount')
      .eq('tour_id', tour_id)

    if (error) {
      logger.error('查詢團訂單失敗:', error)
      throw error
    }

    const totalRevenue = (orders || []).reduce(
      (sum, o) => sum + (Number(o.paid_amount) || 0),
      0
    )

    // 取現有 total_cost 算 profit
    const { data: tour } = await supabase
      .from('tours')
      .select('total_cost')
      .eq('id', tour_id)
      .single()
    const totalCost = Number(tour?.total_cost) || 0

    const { error: updateError } = await supabase
      .from('tours')
      .update({
        total_revenue: totalRevenue,
        profit: totalRevenue - totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tour_id)

    if (updateError) {
      logger.error('更新團收入失敗:', updateError)
      throw updateError
    }

    await mutate('tours')
    await mutate(`tour-${tour_id}`)

    logger.log('團收入已重算:', { tour_id, total_revenue: totalRevenue })
  } catch (error) {
    logger.error('recalculateTourRevenue 失敗:', error)
    // 不向上拋、不阻擋主流程
  }
}
