'use client'

/**
 * Hotels Entity
 *
 * 飯店資料表，共用 Attraction 型別（欄位相容）
 * 不含 category/tags/duration_minutes/opening_hours/ticket_price/type/contact_name/workspace_id
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Attraction } from '@/app/(main)/library/attractions/_types'

// 飯店表中與 Attraction 相容的欄位
const HOTEL_SELECT_FIELDS = [
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

// 5/13：hotels shared reference data、DB 沒 workspace_id
const hotelEntity = createEntityHook<Attraction>('hotels', {
  workspaceScoped: false,
  list: {
    select: HOTEL_SELECT_FIELDS,
    orderBy: { column: 'name', ascending: true },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,name,city_id',
  },
  detail: { select: HOTEL_SELECT_FIELDS },
  cache: CACHE_PRESETS.low,
})

export const useHotels = hotelEntity.useList
const _useHotel = hotelEntity.useDetail
const _useHotelsPaginated = hotelEntity.usePaginated

export const createHotel = hotelEntity.create
export const updateHotel = hotelEntity.update
export const deleteHotel = hotelEntity.delete
export const invalidateHotels = hotelEntity.invalidate
