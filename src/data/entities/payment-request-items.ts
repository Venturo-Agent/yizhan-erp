'use client'

/**
 * Payment Request Items Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { PaymentRequestItem } from '@/stores/types'

const paymentRequestItemEntity = createEntityHook<PaymentRequestItem>(
  'payment_request_items',
  {
    list: {
      // 2026-05-15 補回 advanced_by / advanced_by_name / payment_method_id / tour_id /
      // custom_request_date — 之前 schema 變動時被拿掉、但 DB 已復活、不撈 UI 載不到代墊人
      select:
        'id,request_id,item_number,category,supplier_id,supplier_name,description,quantity,unit_price,subtotal,amount,sort_order,workspace_id,created_at,created_by,updated_at,updated_by,notes,advanced_by,advanced_by_name,payment_method_id,tour_id,custom_request_date',
      orderBy: { column: 'sort_order', ascending: true },
    },
    slim: {
      select: 'id,request_id,item_number,category,supplier_name,subtotal',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.medium,
  }
)

export const usePaymentRequestItems = paymentRequestItemEntity.useList
const _usePaymentRequestItemsSlim = paymentRequestItemEntity.useListSlim
const _usePaymentRequestItem = paymentRequestItemEntity.useDetail
const _usePaymentRequestItemsPaginated = paymentRequestItemEntity.usePaginated
const _usePaymentRequestItemDictionary = paymentRequestItemEntity.useDictionary

export const createPaymentRequestItem = paymentRequestItemEntity.create
const _updatePaymentRequestItem = paymentRequestItemEntity.update
const _deletePaymentRequestItem = paymentRequestItemEntity.delete
export const invalidatePaymentRequestItems = paymentRequestItemEntity.invalidate
