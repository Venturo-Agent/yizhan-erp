'use client'

/**
 * Payment Requests Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { PaymentRequest } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'

const paymentRequestEntity = createEntityHook<PaymentRequest>('payment_requests', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    // SELECT 必含 accounting_subject_id / accounting_voucher_id / budget_warning /
    // transferred_pair_id；下游（BatchReceiptDialog / PrintDisbursementPreview /
    // useCreateDisbursement / budget_warning service）需要這些欄位才能正確顯示對沖、預算警示。
    select:
      'id,code,request_number,request_date,request_type,request_category,expense_type,tour_id,tour_code,tour_name,order_id,order_number,supplier_id,supplier_name,amount,total_amount,status,is_special_billing,batch_id,notes,payment_method_id,accounting_subject_id,accounting_voucher_id,budget_warning,transferred_pair_id,disbursement_order_id,approved_at,approved_by,paid_at,paid_by,created_by_name,workspace_id,created_at,created_by,updated_at,updated_by,items:payment_request_items(*)',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,code,tour_id,status,total_amount,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const usePaymentRequests = paymentRequestEntity.useList
const _usePaymentRequestsSlim = paymentRequestEntity.useListSlim
const _usePaymentRequest = paymentRequestEntity.useDetail
const _usePaymentRequestsPaginated = paymentRequestEntity.usePaginated
const _usePaymentRequestDictionary = paymentRequestEntity.useDictionary

export const createPaymentRequest = paymentRequestEntity.create
export const updatePaymentRequest = paymentRequestEntity.update

/**
 * 刪除 payment_request 時、自動 cascade pair 對手
 * 成本轉移會建一對 PR（src amount<0、dst amount>0、共用 transferred_pair_id）
 * 只刪一邊 → 對手變孤兒（pair_id 還在但對手不存在）→ PrintDisbursementPreview 配對失效
 */
export const deletePaymentRequest = async (id: string) => {
  const { data: row } = await supabase
    .from('payment_requests')
    .select('transferred_pair_id')
    .eq('id', id)
    .maybeSingle()
  const pairId = (row as { transferred_pair_id?: string } | null)?.transferred_pair_id ?? null

  if (pairId) {
    const { data: pairs } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('transferred_pair_id', pairId)
    const pairIds = (pairs ?? []).map(r => (r as { id: string }).id).filter(x => x !== id)
    for (const pid of pairIds) {
      await paymentRequestEntity.delete(pid)
    }
  }

  await paymentRequestEntity.delete(id)
}

export const invalidatePaymentRequests = paymentRequestEntity.invalidate
