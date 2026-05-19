'use client'

/**
 * Order Members Entity
 *
 * 5/19 SWR 水管健檢補建（caller 數 125、整 codebase 最痛缺口）。
 * 過去散刻 supabase.from('order_members')... 寫入後沒 invalidate、
 * 訂單成員清單永遠 stale（PNR 匹配後新成員不顯示是其中一例）。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type OrderMember = Database['public']['Tables']['order_members']['Row']

const orderMemberEntity = createEntityHook<OrderMember>('order_members', {
  list: {
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useOrderMembers = orderMemberEntity.useList
export const useOrderMember = orderMemberEntity.useDetail
export const createOrderMember = orderMemberEntity.create
export const updateOrderMember = orderMemberEntity.update
export const deleteOrderMember = orderMemberEntity.delete
export const invalidateOrderMembers = orderMemberEntity.invalidate
