'use client'

/**
 * Restaurants Entity
 *
 * 餐廳資料表。型別走 Attraction 的子集 Restaurant、
 * 表達餐廳欄位是 Attraction 欄位的真子集（不含 category/tags/duration_minutes/
 * opening_hours/ticket_price/type/contact_name/workspace_id）。
 *
 * 2026-05-29 B11：原本標 `<Attraction>` 過度承諾餐廳欄位、改 `<Restaurant>` 對齊真實 schema。
 * 仍可被 useAttractionsData() 三選一混用、因為 Restaurant 是 Attraction 子集。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Attraction } from '@/app/(main)/library/attractions/_types'

// 餐廳欄位是 Attraction 欄位的子集（DB schema 真實映射）
export type Restaurant = Pick<
  Attraction,
  | 'id'
  | 'name'
  | 'english_name'
  | 'description'
  | 'country_id'
  | 'region_id'
  | 'city_id'
  | 'address'
  | 'phone'
  | 'website'
  | 'latitude'
  | 'longitude'
  | 'google_maps_url'
  | 'images'
  | 'is_active'
  | 'data_verified'
  | 'notes'
  | 'display_order'
  | 'created_at'
  | 'updated_at'
>


// 餐廳表中與 Attraction 相容的欄位
const RESTAURANT_SELECT_FIELDS = [
  'id',
  'name',
  'english_name',
  'description',
  'country_id',
  'region_id',
  'city_id',
  'address',
  'phone',
  'website',
  'latitude',
  'longitude',
  'google_maps_url',
  'images',
  'is_active',
  'data_verified',
  'notes',
  'display_order',
  'created_at',
  'updated_at',
  'fax',
  'country_code',
].join(',')

// 5/13：restaurants shared reference data、DB 沒 workspace_id（有 created_by_workspace_id 是另回事）
const restaurantEntity = createEntityHook<Restaurant>('restaurants', {
  workspaceScoped: false,
  list: {
    select: RESTAURANT_SELECT_FIELDS,
    orderBy: { column: 'name', ascending: true },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,name,city_id',
  },
  detail: { select: RESTAURANT_SELECT_FIELDS },
  cache: CACHE_PRESETS.low,
})

export const useRestaurants = restaurantEntity.useList
const _useRestaurant = restaurantEntity.useDetail
const _useRestaurantsPaginated = restaurantEntity.usePaginated

export const createRestaurant = restaurantEntity.create
export const updateRestaurant = restaurantEntity.update
export const deleteRestaurant = restaurantEntity.delete
export const invalidateRestaurants = restaurantEntity.invalidate
