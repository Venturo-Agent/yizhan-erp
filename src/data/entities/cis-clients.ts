'use client'

/**
 * CIS Clients Entity
 *
 * 漫途整合行銷的客戶（多為旅行社）。
 * Workspace 隔離 + RLS 雙保險（cis_clients 表本身有 workspace_id + RLS policy）。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { CisClient } from '@/types/cis.types'

const cisClientEntity = createEntityHook<CisClient>('cis_clients', {
  list: {
    select:
      'id,code,company_name,contact_name,phone,email,travel_types,tags,status,notes,created_at,updated_at,workspace_id,created_by',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,code,company_name,status',
  },
  detail: { select: '*' },
  workspaceScoped: true,
  cache: CACHE_PRESETS.medium,
})

export const useCisClients = cisClientEntity.useList
export const useCisClientsSlim = cisClientEntity.useListSlim
export const useCisClient = cisClientEntity.useDetail
export const useCisClientsPaginated = cisClientEntity.usePaginated
export const useCisClientDictionary = cisClientEntity.useDictionary

export const createCisClient = cisClientEntity.create
export const updateCisClient = cisClientEntity.update
export const deleteCisClient = cisClientEntity.delete
export const invalidateCisClients = cisClientEntity.invalidate
