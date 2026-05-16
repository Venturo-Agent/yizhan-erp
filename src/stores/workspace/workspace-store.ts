/**
 * Workspace Store (使用 createStore)
 * 管理 workspaces 表格資料
 * 自動繼承快取優先、Realtime 同步等功能
 */

import { createStore } from '../core/create-store'
import type { Workspace } from './types'
import type { BaseEntity } from '@/types'

/**
 * Workspace 擴展型別（符合 BaseEntity）
 */
type WorkspaceEntity = Workspace & BaseEntity

/**
 * Workspace Store
 * 表格: workspaces
 * 快取策略: 全量快取 (數量極少，通常 1-3 個)
 */
export const useWorkspaceStoreData = createStore<WorkspaceEntity>({
  tableName: 'workspaces',
})

/**
 * Hook 型別（方便使用）
 */
type WorkspaceStoreDataType = ReturnType<typeof useWorkspaceStoreData>
