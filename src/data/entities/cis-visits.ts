'use client'

/**
 * CIS Visits Entity — 拜訪紀錄 + 五階段品牌資料卡
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CisVisit } from '@/types/cis.types'

const cisVisitEntity = createEntityHook<CisVisit>('cis_visits', {
  list: {
    select:
      'id,client_id,visited_at,stage,summary,brand_card,audio_url,created_at,updated_at,workspace_id,created_by',
    orderBy: { column: 'visited_at', ascending: false },
  },
  slim: { select: 'id,client_id,visited_at,stage,summary' },
  detail: { select: '*' },
  workspaceScoped: true,
  cache: CACHE_PRESETS.medium,
})

export const useCisVisits = cisVisitEntity.useList
export const useCisVisit = cisVisitEntity.useDetail
export const useCisVisitsPaginated = cisVisitEntity.usePaginated

export const createCisVisit = cisVisitEntity.create
export const updateCisVisit = cisVisitEntity.update
export const deleteCisVisit = cisVisitEntity.delete
export const invalidateCisVisits = cisVisitEntity.invalidate
