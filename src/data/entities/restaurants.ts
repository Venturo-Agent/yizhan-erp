'use client'

/**
 * Restaurants Entity
 *
 * 餐廳資料表，共用 Attraction 型別（欄位相容）
 * 不含 category/tags/duration_minutes/ticket_price/type/contact_name/workspace_id
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Attraction } from '@/app/(main)/library/attractions/_types'

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
const restaurantEntity = createEntityHook<Attraction>('restaurants', {
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
