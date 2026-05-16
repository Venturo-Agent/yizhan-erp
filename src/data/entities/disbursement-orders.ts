'use client'

/**
 * Disbursement Orders Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { DisbursementOrder } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'
import { invalidatePaymentRequests } from './payment-requests'

const disbursementOrderEntity = createEntityHook<DisbursementOrder>('disbursement_orders', {
  list: {
    // 2026-05-15 補 payment_method_id / total_fee（wizard 編輯模式必要）+ accounting_voucher_id + batch_uuid + 軟刪
    select:
      'id,code,amount,payment_method,payment_method_id,total_fee,status,handled_by,handled_at,notes,created_at,updated_at,workspace_id,updated_by,order_number,disbursement_date,confirmed_by,confirmed_at,created_by,pdf_url,disbursement_type,refund_id,bank_account_id,accounting_voucher_id,batch_uuid,deleted_at,deleted_by,deleted_reason',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,code,status,amount,disbursement_date,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useDisbursementOrders = disbursementOrderEntity.useList
const _useDisbursementOrdersSlim = disbursementOrderEntity.useListSlim
const _useDisbursementOrder = disbursementOrderEntity.useDetail
const _useDisbursementOrdersPaginated = disbursementOrderEntity.usePaginated
const _useDisbursementOrderDictionary = disbursementOrderEntity.useDictionary

const _createDisbursementOrder = disbursementOrderEntity.create
export const updateDisbursementOrder = disbursementOrderEntity.update

/**
 * 刪除出納單時、自動把綁進來的 payment_requests 釋放回 pending
 * 沒這層保護、刪了單會留下 status='confirmed' 但沒對應出納單的孤兒 PR、
 * 再也撈不回 pending pool、無法重新加入新出納單
 */
export const deleteDisbursementOrder = async (id: string) => {
  const { error: releaseErr } = await supabase
    .from('payment_requests')
    .update({
      disbursement_order_id: null,
      status: 'pending',
    } as never)
    .eq('disbursement_order_id', id)
  if (releaseErr) throw new Error(releaseErr.message)

  await disbursementOrderEntity.delete(id)
  await invalidatePaymentRequests()
}

export const invalidateDisbursementOrders = disbursementOrderEntity.invalidate
