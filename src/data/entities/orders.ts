'use client'

/**
 * Orders Entity
 *
 * 使用方式：
 * import { useOrders, useOrder, useOrdersPaginated, useOrderDictionary } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Order } from '@/stores/types'

// ============================================
// Entity 定義
// ============================================

// A1（5/13 拍板）：砍 orders.code、留 order_number 為 SSOT
// 此 entity hook 的 select 已對齊（不含 code）
const orderEntity = createEntityHook<Order>('orders', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    // 2026-05-15 補 notes / identity_options
    // 2026-05-29 補 sales relation：列表帶業務員「當前」資料（員工改暱稱跟著動、不靠 sales_person 字串 fallback）
    select:
      'id,order_number,tour_id,tour_name,contact_person,contact_phone,contact_email,customer_id,sales_person,sales_id,status,payment_status,paid_amount,remaining_amount,total_amount,member_count,adult_count,departure_date,is_active,notes,identity_options,workspace_id,created_at,created_by,updated_at,updated_by,sales:employees!sales_id(id,display_name,chinese_name,english_name)',
    orderBy: {
      column: 'departure_date',
      ascending: false,
    },
    filterSoftDeleted: true,
  },
  slim: {
    // 2026-05-29 同上、slim 也帶 sales relation
    select:
      'id,order_number,tour_id,tour_name,contact_person,contact_phone,sales_person,sales_id,payment_status,paid_amount,remaining_amount,total_amount,member_count,departure_date,created_at,customer_id,sales:employees!sales_id(id,display_name,chinese_name,english_name)',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.high,
})

// ============================================
// 便捷 Hooks Export
// ============================================

/** 完整 Orders 列表 */
export const useOrders = orderEntity.useList

/** 精簡 Orders 列表（列表顯示用）*/
export const useOrdersSlim = orderEntity.useListSlim

/** 單筆 Order（支援 skip pattern）*/
const _useOrder = orderEntity.useDetail

/** 分頁 Orders（server-side pagination + filter + search）*/
export const useOrdersPaginated = orderEntity.usePaginated

/** Order Dictionary（O(1) 查詢）*/
const _useOrderDictionary = orderEntity.useDictionary

// ============================================
// CRUD Export
// ============================================

/** 建立 Order */
export const createOrder = orderEntity.create

/** 更新 Order */
export const updateOrder = orderEntity.update

/** 刪除 Order */
export const deleteOrder = orderEntity.delete

/** 使 Order 快取失效 */
export const invalidateOrders = orderEntity.invalidate
