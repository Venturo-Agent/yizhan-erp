/**
 * tour_dependency.service.ts - 旅遊團關聯資料檢查與清理
 *
 * 提供旅遊團刪除前的關聯檢查、斷開連結等操作。
 * 統一了 useTourOperations 和 archive-management 中的重複邏輯。
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface TourDependencyCheck {
  blockers: string[]
  hasBlockers: boolean
}

/**
 * 檢查旅遊團是否有不可刪除的關聯資料
 *
 * 業務/財務類子表（有資料 → 擋刪除）：
 *   - receipts（收款）
 *   - payment_requests（請款）
 */
export async function checkTourDependencies(tourId: string): Promise<TourDependencyCheck> {
  const [receipts, payments] = await Promise.all([
    supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('tour_id', tourId),
    supabase
      .from('payment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tour_id', tourId),
  ])

  const blockers: string[] = []

  if (receipts.count && receipts.count > 0) blockers.push(`${receipts.count} 筆收款單`)
  if (payments.count && payments.count > 0) blockers.push(`${payments.count} 筆請款單`)

  return { blockers, hasBlockers: blockers.length > 0 }
}

/**
 * 清除旅遊團的配置類關聯資料（UI 設定、排房/排車、確認單等）
 *
 * 注意：FK 改 RESTRICT、必須在刪 tour 前顯式清掉。
 * 業務/財務類（receipts/payment_requests）不在這、
 * 有資料時 checkTourDependencies 會擋、不會走到這一步。
 */
export async function deleteTourConfigurationData(tourId: string): Promise<void> {
  const results = await Promise.all([
    supabase.from('tour_custom_cost_fields').delete().eq('tour_id', tourId),
    supabase.from('tour_departure_data').delete().eq('tour_id', tourId),
    supabase.from('tour_documents').delete().eq('tour_id', tourId),
    // tour_itinerary_days 已合併進 tour_itinerary_items（merge migration 20260502120000）
    supabase.from('tour_meal_settings').delete().eq('tour_id', tourId),
    supabase.from('tour_member_fields').delete().eq('tour_id', tourId),
    supabase.from('tour_role_assignments').delete().eq('tour_id', tourId),
  ])
  const failed = results.find(r => r.error)
  if (failed?.error) {
    logger.error('清除旅遊團配置資料失敗:', failed.error)
    throw new Error(`清除旅遊團配置資料失敗：${failed.error.message}`)
  }
}

/**
 * 檢查旅遊團是否有已付款訂單
 */
export async function checkTourPaidOrders(
  tourId: string
): Promise<{ hasPaidOrders: boolean; count: number }> {
  const { data: paidOrders, error } = await supabase
    .from('orders')
    .select('id, payment_status')
    .eq('tour_id', tourId)
    .neq('payment_status', 'unpaid')

  if (error) {
    logger.error('查詢已付款訂單失敗:', error)
    throw error
  }

  return {
    hasPaidOrders: (paidOrders?.length ?? 0) > 0,
    count: paidOrders?.length ?? 0,
  }
}

/**
 * 刪除旅遊團的空訂單（沒有團員的）
 *
 * 注意：order_members.order_id 是 FK RESTRICT、
 * 必須真的 filter「沒 members 的 order」、不能 blind delete。
 */
export async function deleteTourEmptyOrders(tourId: string): Promise<void> {
  // 1. 查該團所有 orders
  const { data: allOrders, error: queryError } = await supabase
    .from('orders')
    .select('id')
    .eq('tour_id', tourId)
  if (queryError) {
    logger.error('查詢旅遊團訂單失敗:', queryError)
    throw queryError
  }
  const orderIds = (allOrders ?? []).map(o => o.id)
  if (orderIds.length === 0) return

  // 2. 查哪些 order 有 members
  const { data: membersData, error: memberError } = await supabase
    .from('order_members')
    .select('order_id')
    .in('order_id', orderIds)
  if (memberError) {
    logger.error('查詢團員失敗:', memberError)
    throw memberError
  }
  const ordersWithMembers = new Set((membersData ?? []).map(m => m.order_id as string))
  const emptyOrderIds = orderIds.filter(id => !ordersWithMembers.has(id))

  if (emptyOrderIds.length === 0) return

  // 3. 只刪空訂單
  const { error } = await supabase.from('orders').delete().in('id', emptyOrderIds)
  if (error) {
    logger.error('刪除空訂單失敗:', error)
    throw new Error(`刪除空訂單失敗: ${error.message}`)
  }
}

/**
 * 斷開旅遊團關聯的報價單（不刪除，只解除連結）
 */
export async function unlinkTourQuotes(tourId: string): Promise<number> {
  const { data: linkedQuotes, error: queryError } = await supabase
    .from('quotes')
    .select('id')
    .eq('tour_id', tourId)

  if (queryError) {
    logger.error('查詢關聯報價單失敗:', queryError)
    throw queryError
  }

  if (linkedQuotes && linkedQuotes.length > 0) {
    const { error } = await supabase
      .from('quotes')
      .update({ tour_id: null, status: 'proposed', updated_at: new Date().toISOString() })
      .eq('tour_id', tourId)
    if (error) {
      logger.error('斷開報價單失敗:', error.message)
      throw error
    }
  }

  return linkedQuotes?.length ?? 0
}

/**
 * 刪除旅遊團關聯的行程表
 */
export async function unlinkTourItineraries(tourId: string): Promise<number> {
  const { data: linkedItineraries, error: queryError } = await supabase
    .from('itineraries')
    .select('id')
    .eq('tour_id', tourId)

  if (queryError) {
    logger.error('查詢關聯行程表失敗:', queryError)
    throw queryError
  }

  if (linkedItineraries && linkedItineraries.length > 0) {
    // 先清除 tour_itinerary_items 的 itinerary_id 外鍵（避免 FK constraint）
    const itineraryIds = linkedItineraries.map(i => i.id)
    const { error: unlinkError } = await supabase
      .from('tour_itinerary_items')
      .update({ itinerary_id: null })
      .in('itinerary_id', itineraryIds)
    if (unlinkError) {
      logger.error('解除核心表行程關聯失敗:', unlinkError.message)
      throw unlinkError
    }

    const { error } = await supabase.from('itineraries').delete().eq('tour_id', tourId)
    if (error) {
      logger.error('刪除關聯行程表失敗:', error.message)
      throw error
    }
  }

  return linkedItineraries?.length ?? 0
}
