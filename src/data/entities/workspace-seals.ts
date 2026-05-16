'use client'

/**
 * Workspace Seals Entity
 *
 * 對應 workspace_seals 表（文件中心章印管理 Phase 1）
 *
 * 使用方式：
 * import { useWorkspaceSeals, createWorkspaceSeal } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

export interface WorkspaceSeal extends BaseEntity {
  workspace_id: string
  name: string
  image_url: string
  is_active: boolean
  display_order: number
}

const workspaceSealEntity = createEntityHook<WorkspaceSeal>('workspace_seals', {
  list: {
    select: 'id,workspace_id,name,image_url,is_active,display_order,created_at,updated_at',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,workspace_id,name,image_url,is_active,display_order',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.medium,
})

export const useWorkspaceSeals = workspaceSealEntity.useList
export const useWorkspaceSealsSlim = workspaceSealEntity.useListSlim
export const useWorkspaceSeal = workspaceSealEntity.useDetail

export const createWorkspaceSeal = workspaceSealEntity.create
export const updateWorkspaceSeal = workspaceSealEntity.update
export const deleteWorkspaceSeal = workspaceSealEntity.delete
export const invalidateWorkspaceSeals = workspaceSealEntity.invalidate
