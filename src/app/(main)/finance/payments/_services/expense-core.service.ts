/**
 * Expense Service - 請款核心邏輯
 *
 * @module expense-core.service
 * @description
 * 請款（支出）異動後的統計重算。與 receipt-core.service 對稱，
 * 負責維護團的 total_cost 和 profit。
 *
 * 這是支出統計的 **Single Source of Truth**：
 * - 團的 `total_cost` 由此重算（不允許手動修改）
 * - `profit = total_revenue - total_cost`
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { invalidateTours } from '@/data'

/**
 * 重算團的成本統計
 *
 * @description 重算 tours.total_cost / fee_cost / profit。
 * - total_cost：該團所有 payment_request_items.subtotal 加總（業務成本）
 * - fee_cost：該團 items 對應出納單 disbursement_order_items.fee_amount 加總（2026-05-21 加）
 * - profit = total_revenue - (total_cost + fee_cost)
 *
 * 2026-05-21 William 拍板：手續費歸到「導致它發生的團」、利潤才精準。
 * 不回填 payment_request_items.subtotal、避免循環。
 *
 * @param tour_id - 團 ID
 */
export async function recalculateExpenseStats(tour_id: string): Promise<void> {
  try {
    // 1. 查該團所有有效請款單
    const { data: requests_data, error: requestsError } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('tour_id', tour_id)
      .in('status', ['pending', 'confirmed', 'paid'])

    if (requestsError) {
      logger.error('查詢有效請款單失敗:', requestsError)
      throw requestsError
    }

    let total_cost = 0
    let fee_cost = 0

    // 2. 查該團 items（單 query 同時撈 subtotal + 出納單 fee_amount）
    const { data: items_data, error: itemsError } = await supabase
      .from('payment_request_items')
      .select('subtotal, disbursement_order_items(fee_amount)')
      .eq('tour_id', tour_id)

    if (itemsError) {
      logger.error('查詢請款項目失敗:', itemsError)
      throw itemsError
    }

    if (items_data && items_data.length > 0) {
      for (const item of items_data) {
        total_cost += item.subtotal || 0
        // disbursement_order_items 可能是 single object 或 array（generated types 推斷不準）
        // cast 透過 unknown 處理兩種情況、reduce fee_amount
        const doi = (
          item as unknown as {
            disbursement_order_items?:
              | { fee_amount: number | null }
              | Array<{ fee_amount: number | null }>
              | null
          }
        ).disbursement_order_items
        if (Array.isArray(doi)) {
          for (const d of doi) {
            fee_cost += d.fee_amount || 0
          }
        } else if (doi && typeof doi === 'object') {
          fee_cost += doi.fee_amount || 0
        }
      }
    }

    // 3. 查 tours.total_revenue
    const { data: tour_data, error: tourError } = await supabase
      .from('tours')
      .select('total_revenue')
      .eq('id', tour_id)
      .single()

    if (tourError) {
      logger.error('查詢團收入失敗:', tourError)
      throw tourError
    }

    const total_revenue = tour_data?.total_revenue || 0
    const profit = total_revenue - total_cost - fee_cost

    // 4. 更新 tours: total_cost / fee_cost / profit
    const { error: updateError } = await supabase
      .from('tours')
      .update({
        total_cost,
        fee_cost,
        profit,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', tour_id)

    if (updateError) {
      logger.error('更新團成本失敗:', updateError)
      throw updateError
    }

    await invalidateTours()

    logger.log('Tour 成本數據已更新:', { tour_id, total_cost, fee_cost, profit })
  } catch (error) {
    logger.error('重算團成本失敗:', error)
    throw error
  }
}
