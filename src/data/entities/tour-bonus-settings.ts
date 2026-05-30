'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { TourBonusSetting } from '@/types/bonus.types'

const tourBonusSettingEntity = createEntityHook<TourBonusSetting>('tour_bonus_settings', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    select:
      'id,workspace_id,tour_id,type,bonus,bonus_type,employee_id,description,payment_request_id,disbursement_date,created_at,updated_at',
    orderBy: { column: 'type', ascending: true },
  },
  slim: {
    select:
      'id,tour_id,type,bonus,bonus_type,employee_id,description,payment_request_id,disbursement_date',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const useTourBonusSettings = tourBonusSettingEntity.useList
const _useTourBonusSettingsSlim = tourBonusSettingEntity.useListSlim
const _useTourBonusSetting = tourBonusSettingEntity.useDetail
const _useTourBonusSettingsPaginated = tourBonusSettingEntity.usePaginated
const _useTourBonusSettingDictionary = tourBonusSettingEntity.useDictionary

export const createTourBonusSetting = tourBonusSettingEntity.create
export const updateTourBonusSetting = tourBonusSettingEntity.update
export const deleteTourBonusSetting = tourBonusSettingEntity.delete
export const invalidateTourBonusSettings = tourBonusSettingEntity.invalidate
