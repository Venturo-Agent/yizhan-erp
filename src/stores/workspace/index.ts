// Workspace store barrel

import { useWorkspaceStoreData } from './workspace-store'
import type { Workspace } from './types'

export * from './types'
export { useWorkspaceStoreData } from './workspace-store'

/**
 * Workspace store hook（tenants 編輯 / calendar 全租戶篩選等）
 */
export const useWorkspaceStore = () => {
  const store = useWorkspaceStoreData()
  return {
    workspaces: store.items as Workspace[],
    loadWorkspaces: store.fetchAll,
    updateWorkspace: store.update,
  }
}
