/**
 * order-stats.service.ts - 訂單統計數據重算
 *
 * 提供訂單金額重算邏輯，配合價格鏈實作
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { mutate } from 'swr'

/**
 * 重算訂單的 total_amount 和 remaining_amount
 *
 * @description 根據團員數量和每人售價重新計算訂單總額：
 * 1. 查詢該訂單下所有團員數量
 * 2. 從 tour.selling_price_per_person 獲取每人售價
 * 3. 計算新的 total_amount = 團員數 × 每人售價
 * 4. 更新 remaining_amount = total_amount - paid_amount
 *
 * @param order_id - 訂單 ID
 * @returns void
 * @throws 如果 DB 查詢或更新失敗
 *
 * @example
 * // 團員異動後重算訂單金額
 * await recalculateOrderAmount(order_id)
 */
export async function recalculateOrderAmount(order_id: string): Promise<void> {
  try {
    // 1. 查詢訂單基本資訊
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, tour_id, paid_amount')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      logger.error('查詢訂單失敗:', orderError)
      throw new Error('訂單不存在')
    }

    // 2. 查詢該訂單的團員數量
    const { count: memberCount, error: memberCountError } = await supabase
      .from('order_members')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', order_id)

    if (memberCountError) {
      logger.error('查詢團員數量失敗:', memberCountError)
      throw memberCountError
    }

    const totalMembers = memberCount || 0

    // 3. 查詢 tour 的每人售價
    const { data: tourData, error: tourError } = (await supabase
      .from('tours')
      .select('selling_price_per_person')
      .eq('id', order.tour_id!)
      .single()) as { data: { selling_price_per_person: number | null } | null; error: unknown }

    if (tourError || !tourData) {
      logger.warn('Failed to fetch tour selling price, defaulting to 0:', tourError)
    }

    const sellingPricePerPerson = tourData?.selling_price_per_person || 0

    // 4. 計算新的總金額
    const newTotalAmount = totalMembers * sellingPricePerPerson
    const newRemainingAmount = newTotalAmount - (order.paid_amount || 0)

    // 5. 更新訂單
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        member_count: totalMembers,
        total_amount: newTotalAmount,
        remaining_amount: newRemainingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    if (updateError) {
      logger.error('更新訂單金額失敗:', updateError)
      throw updateError
    }

    // 6. 刷新 SWR 快取
    await mutate('orders')
    await mutate(`order-${order_id}`)

    logger.log('訂單金額已重算:', {
      order_id,
      member_count: totalMembers,
      selling_price_per_person: sellingPricePerPerson,
      total_amount: newTotalAmount,
      remaining_amount: newRemainingAmount,
    })
  } catch (error) {
    logger.error('recalculateOrderAmount 失敗:', error)
    throw error
  }
}

/**
 * 重算訂單支付狀態
 *
 * @description 根據 paid_amount 和 total_amount 的比例更新 payment_status
 *
 * @param order_id - 訂單 ID
 */
export async function recalculatePaymentStatus(order_id: string): Promise<void> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, paid_amount')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error('訂單不存在')
    }

    const { total_amount, paid_amount } = order
    let payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded'

    if (!paid_amount || paid_amount <= 0) {
      payment_status = 'unpaid'
    } else if (paid_amount >= (total_amount || 0)) {
      payment_status = 'paid'
    } else {
      payment_status = 'partial'
    }

    await supabase
      .from('orders')
      .update({
        payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    logger.log('訂單支付狀態已重算:', { order_id, payment_status })
  } catch (error) {
    logger.error('recalculatePaymentStatus 失敗:', error)
    throw error
  }
}
