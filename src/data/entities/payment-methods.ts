'use client'

/**
 * Payment Methods Entity（付款方式）
 *
 * 2026-05-21 建：補紅線 F + H 修法配套
 * 對應表：public.payment_methods
 * RLS pattern：workspace_scoped (pm_all + pm_select、5/13 寫對的範本)
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

const paymentMethodEntity = createEntityHook<PaymentMethod>('payment_methods', {
  list: {
    select: '*',
    orderBy: { column: 'sort_order', ascending: true },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const usePaymentMethods = paymentMethodEntity.useList
export const usePaymentMethod = paymentMethodEntity.useDetail
export const invalidatePaymentMethods = paymentMethodEntity.invalidate
export const createPaymentMethod = paymentMethodEntity.create
export const updatePaymentMethod = paymentMethodEntity.update
export const deletePaymentMethod = paymentMethodEntity.delete
export type { PaymentMethod }
