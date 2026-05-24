'use client'

/**
 * Brands Entity（品牌）
 *
 * 2026-05-24 建：品牌功能地基（多品牌公司用）。
 * 對應表：public.brands（workspace_scoped、每 workspace 至少 1 個 is_default）。
 * 案子（tours）透過 tours.brand_id 歸屬品牌；員工透過 employee_brands 分配品牌。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type Brand = Database['public']['Tables']['brands']['Row']

const brandEntity = createEntityHook<Brand>('brands', {
  list: {
    select: '*',
    orderBy: { column: 'display_order', ascending: true },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useBrands = brandEntity.useList
export const useBrand = brandEntity.useDetail
export const invalidateBrands = brandEntity.invalidate
export const createBrand = brandEntity.create
export const updateBrand = brandEntity.update
export const deleteBrand = brandEntity.delete
export type { Brand }
