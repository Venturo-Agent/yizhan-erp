'use client'

/**
 * Worldmove eSIM Items Entity
 *
 * 對應 worldmove_esim_items 表（eSIM 管理模組 Phase 1）
 * 每張 eSIM 卡的詳細資訊（子表、attach to worldmove_orders）
 *
 * 使用方式：
 * import { useWorldmoveEsimItems, createWorldmoveEsimItem } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

export interface WorldmoveEsimItem extends BaseEntity {
  order_id: string
  workspace_id: string
  product_id: string | null
  product_name: string
  product_code: string
  iccid: string | null
  activation_code: string | null
  qr_code_url: string | null
  sm_dp_address: string | null
  valid_from: string | null
  valid_until: string | null
  data_used_mb: number
  data_limit_mb: number | null
  last_usage_synced_at: string | null
  status: 'pending' | 'active' | 'activated' | 'expired' | 'cancelled' | 'suspended'
  unit_price: number
  provider_item_id: string | null
  provider_response: Record<string, unknown> | null
}

const worldmoveEsimItemEntity = createEntityHook<WorldmoveEsimItem>('worldmove_esim_items', {
  list: {
    select:
      'id,order_id,workspace_id,product_id,product_name,product_code,iccid,valid_from,valid_until,data_used_mb,data_limit_mb,status,unit_price,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select:
      'id,order_id,workspace_id,product_name,iccid,status,valid_until,unit_price',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.medium,
})

export const useWorldmoveEsimItems = worldmoveEsimItemEntity.useList
export const useWorldmoveEsimItemsSlim = worldmoveEsimItemEntity.useListSlim
export const useWorldmoveEsimItem = worldmoveEsimItemEntity.useDetail

export const createWorldmoveEsimItem = worldmoveEsimItemEntity.create
export const updateWorldmoveEsimItem = worldmoveEsimItemEntity.update
export const deleteWorldmoveEsimItem = worldmoveEsimItemEntity.delete
export const invalidateWorldmoveEsimItems = worldmoveEsimItemEntity.invalidate
