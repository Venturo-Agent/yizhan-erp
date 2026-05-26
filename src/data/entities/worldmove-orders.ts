'use client'

/**
 * Worldmove Orders Entity
 *
 * 對應 worldmove_orders 表（eSIM 管理模組 Phase 1）
 *
 * 使用方式：
 * import { useWorldmoveOrders, createWorldmoveOrder } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

export interface WorldmoveOrder extends BaseEntity {
  workspace_id: string
  source_type: 'order' | 'payment' | 'manual' | null
  source_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  worldmove_order_id: string | null
  subtotal: number
  discount: number
  total_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  provider_response: Record<string, unknown> | null
  note: string | null
  created_by: string | null
}

const worldmoveOrderEntity = createEntityHook<WorldmoveOrder>('worldmove_orders', {
  list: {
    select:
      'id,workspace_id,source_type,source_id,customer_name,customer_email,worldmove_order_id,total_amount,status,created_by,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,workspace_id,customer_name,worldmove_order_id,total_amount,status,created_at',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.medium,
})

export const useWorldmoveOrders = worldmoveOrderEntity.useList
export const useWorldmoveOrdersSlim = worldmoveOrderEntity.useListSlim
export const useWorldmoveOrder = worldmoveOrderEntity.useDetail

export const createWorldmoveOrder = worldmoveOrderEntity.create
export const updateWorldmoveOrder = worldmoveOrderEntity.update
export const deleteWorldmoveOrder = worldmoveOrderEntity.delete
export const invalidateWorldmoveOrders = worldmoveOrderEntity.invalidate
