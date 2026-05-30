'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { WorkspaceBonusDefault } from '@/types/bonus.types'

const workspaceBonusDefaultEntity = createEntityHook<WorkspaceBonusDefault>(
  'workspace_bonus_defaults',
  {
    workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
    list: {
      select: 'id,workspace_id,type,bonus,bonus_type,employee_id,description,created_at,updated_at',
      orderBy: { column: 'type', ascending: true },
    },
    slim: {
      select: 'id,type,bonus,bonus_type,employee_id,description',
    },
    detail: { select: '*' },
    cache: CACHE_PRESETS.low,
  }
)

export const useWorkspaceBonusDefaults = workspaceBonusDefaultEntity.useList
const _useWorkspaceBonusDefaultsSlim = workspaceBonusDefaultEntity.useListSlim
const _useWorkspaceBonusDefault = workspaceBonusDefaultEntity.useDetail
const _useWorkspaceBonusDefaultsPaginated = workspaceBonusDefaultEntity.usePaginated
const _useWorkspaceBonusDefaultDictionary = workspaceBonusDefaultEntity.useDictionary

const _createWorkspaceBonusDefault = workspaceBonusDefaultEntity.create
const _updateWorkspaceBonusDefault = workspaceBonusDefaultEntity.update
const _deleteWorkspaceBonusDefault = workspaceBonusDefaultEntity.delete
const _invalidateWorkspaceBonusDefaults = workspaceBonusDefaultEntity.invalidate
