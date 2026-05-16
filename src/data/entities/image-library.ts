'use client'

/**
 * Image Library Entity - 圖片庫管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

interface ImageLibraryItem {
  id: string
  name: string
  file_path: string
  public_url: string
  description: string | null
  category: string | null
  tags: string[] | null
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  country_id: string | null
  city_id: string | null
  attraction_id: string | null
  workspace_id: string
  created_at: string
  created_by: string | null
  updated_at: string
}

const imageLibraryEntity = createEntityHook<ImageLibraryItem>('image_library', {
  workspaceScoped: true,
  list: {
    select:
      'id,workspace_id,name,description,file_path,public_url,category,tags,file_size,width,height,mime_type,country_id,city_id,attraction_id,created_by,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,name,public_url,category,country_id,city_id,attraction_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

const _useImageLibrary = imageLibraryEntity.useList
const _useImageLibrarySlim = imageLibraryEntity.useListSlim
const _useImageLibraryItem = imageLibraryEntity.useDetail
const _useImageLibraryPaginated = imageLibraryEntity.usePaginated
const _useImageLibraryDictionary = imageLibraryEntity.useDictionary

export const createImageLibraryItem = imageLibraryEntity.create
const _updateImageLibraryItem = imageLibraryEntity.update
const _deleteImageLibraryItem = imageLibraryEntity.delete
const _invalidateImageLibrary = imageLibraryEntity.invalidate
