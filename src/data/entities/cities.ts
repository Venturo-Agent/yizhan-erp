'use client'

/**
 * Cities Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { City } from '@/stores/region-store'

const cityEntity = createEntityHook<City>('cities', {
  list: {
    select:
      'id,country_id,country_code,region_id,name,name_en,description,timezone,display_order,is_active,created_at,updated_at,airport_code,background_image_url,background_image_url_2,primary_image,is_major,parent_city_id,workspace_id,usage_count',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,name_en,airport_code,country_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 基礎資料，變動少
  skipAuditFields: true,
})

export const useCities = cityEntity.useList
const _useCitiesSlim = cityEntity.useListSlim
const _useCity = cityEntity.useDetail
const _useCitiesPaginated = cityEntity.usePaginated
const _useCityDictionary = cityEntity.useDictionary

const _createCity = cityEntity.create
export const updateCity = cityEntity.update
const _deleteCity = cityEntity.delete
const _invalidateCities = cityEntity.invalidate
