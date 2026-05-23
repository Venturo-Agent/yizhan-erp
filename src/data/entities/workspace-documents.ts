'use client'

/**
 * Workspace Documents Entity
 *
 * 對應 workspace_documents 表（文件中心 Phase 1）
 *
 * 使用方式：
 * import { useWorkspaceDocuments, createWorkspaceDocument } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { BaseEntity } from '../core/types'

export interface WorkspaceDocument extends BaseEntity {
  workspace_id: string
  name: string
  file_type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'other'
  storage_path: string
  size_bytes: number | null
  created_by: string | null
}

const workspaceDocumentEntity = createEntityHook<WorkspaceDocument>('workspace_documents', {
  list: {
    select:
      'id,workspace_id,name,file_type,storage_path,size_bytes,created_by,created_at,updated_at',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,workspace_id,name,file_type,size_bytes,created_at',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.medium,
})

export const useWorkspaceDocuments = workspaceDocumentEntity.useList
export const useWorkspaceDocumentsSlim = workspaceDocumentEntity.useListSlim
export const useWorkspaceDocument = workspaceDocumentEntity.useDetail

export const createWorkspaceDocument = workspaceDocumentEntity.create
export const updateWorkspaceDocument = workspaceDocumentEntity.update
export const deleteWorkspaceDocument = workspaceDocumentEntity.delete
export const invalidateWorkspaceDocuments = workspaceDocumentEntity.invalidate
