'use client'

/**
 * Airport Images Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { AirportImage } from '@/stores/types'

const airportImageEntity = createEntityHook<AirportImage>('airport_images', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    select:
      'id,airport_code,image_url,label,season,is_default,display_order,uploaded_by,workspace_id,created_at,updated_at',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,url,airport_code,display_order',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
  // airport_images 沒有 created_by/updated_by 欄位
  skipAuditFields: true,
})

export const useAirportImages = airportImageEntity.useList
const _useAirportImagesSlim = airportImageEntity.useListSlim
const _useAirportImage = airportImageEntity.useDetail
const _useAirportImagesPaginated = airportImageEntity.usePaginated
const _useAirportImageDictionary = airportImageEntity.useDictionary

export const createAirportImage = airportImageEntity.create
const _updateAirportImage = airportImageEntity.update
export const deleteAirportImage = airportImageEntity.delete
const _invalidateAirportImages = airportImageEntity.invalidate
