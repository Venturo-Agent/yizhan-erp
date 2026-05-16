'use client'

/**
 * Attractions Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Attraction } from '@/app/(main)/library/attractions/_types'

// 5/13：attractions shared reference data、DB 沒 workspace_id
const attractionEntity = createEntityHook<Attraction>('attractions', {
  workspaceScoped: false,
  list: {
    // 2026-05-15 補 type / ticket_price / contact_name / fax / country_code（之前 5/13 註解寫「之後對齊」、終於對齊）
    select:
      'id,name,english_name,description,country_id,region_id,city_id,category,type,ticket_price,tags,opening_hours,duration_minutes,address,phone,fax,website,latitude,longitude,google_maps_url,images,is_active,display_order,notes,created_at,updated_at,data_verified,created_by,updated_by,contact_name,country_code,created_by_workspace_id,created_by_user_id',
    orderBy: { column: 'name', ascending: true },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,name,city_id,category,ticket_price',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 基礎資料，變動少
})

export const useAttractions = attractionEntity.useList
const _useAttractionsSlim = attractionEntity.useListSlim
const _useAttraction = attractionEntity.useDetail
const _useAttractionsPaginated = attractionEntity.usePaginated
const _useAttractionDictionary = attractionEntity.useDictionary

export const createAttraction = attractionEntity.create
export const updateAttraction = attractionEntity.update
export const deleteAttraction = attractionEntity.delete
export const invalidateAttractions = attractionEntity.invalidate
