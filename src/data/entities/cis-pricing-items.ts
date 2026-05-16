'use client'

/**
 * CIS Pricing Items Entity — 漫途衍生項目價目表
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CisPricingItem } from '@/types/cis.types'

const cisPricingItemEntity = createEntityHook<CisPricingItem>('cis_pricing_items', {
  list: {
    select: '*',
    orderBy: { column: 'sort_order', ascending: true },
  },
  slim: { select: 'id,code,name,category,price_low,price_high,is_active' },
  detail: { select: '*' },
  workspaceScoped: true,
  cache: CACHE_PRESETS.medium,
})

export const useCisPricingItems = cisPricingItemEntity.useList
export const useCisPricingItemsSlim = cisPricingItemEntity.useListSlim
export const useCisPricingItem = cisPricingItemEntity.useDetail
export const useCisPricingItemsPaginated = cisPricingItemEntity.usePaginated

export const createCisPricingItem = cisPricingItemEntity.create
export const updateCisPricingItem = cisPricingItemEntity.update
export const deleteCisPricingItem = cisPricingItemEntity.delete
export const invalidateCisPricingItems = cisPricingItemEntity.invalidate
