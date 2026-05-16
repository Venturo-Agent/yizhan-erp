/**
 * Workspace Helper Functions
 *
 * 提供與 workspace 相關的輔助函數
 */

import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStoreData } from '@/stores/workspace/workspace-store'
import type { Workspace } from '@/stores/workspace/types'
import { logger } from '@/lib/utils/logger'

// 定義 Workspace 擴展型別（包含 code 欄位）
interface WorkspaceWithCode extends Workspace {
  code?: string
}

/**
 * 取得當前使用者的 workspace_id
 * 所有用戶（含系統主管）都回傳自己的 workspace_id
 *
 * @returns workspace_id (UUID) 或 null
 */
export function getCurrentWorkspaceId(): string | null {
  const { user } = useAuthStore.getState()

  if (!user) {
    return null
  }

  return user.workspace_id || null
}

/**
 * 取得當前使用者的 workspace code (TP, TC)
 *
 * @returns workspace code 或 null
 */
export function getCurrentWorkspaceCode(): string | null {
  const { user } = useAuthStore.getState()

  if (!user) {
    logger.warn('[getCurrentWorkspaceCode] No user found')
    return null
  }

  // 使用登入時取得的 workspace_code
  if (user.workspace_code) {
    return user.workspace_code
  }

  // 沒有 workspace_code，可能是舊的登入 session
  logger.warn('[getCurrentWorkspaceCode] User has no workspace_code, please re-login')
  return null
}

/**
 * 取得當前使用者的 workspace 完整資訊
 *
 * @returns workspace 物件或 null
 */
function _getCurrentWorkspace() {
  const { user } = useAuthStore.getState()
  const workspaceStore = useWorkspaceStoreData.getState()
  const workspaces = (workspaceStore.items || []) as WorkspaceWithCode[]

  if (!user) {
    return null
  }

  // 檢查 workspaces 是否已載入
  if (workspaces.length === 0) {
    logger.warn(
      '[getCurrentWorkspace] Workspaces not loaded yet, please ensure fetchAll() is called first'
    )
    return null
  }

  // 從自己的 workspace_id 取得
  const workspaceId = user.workspace_id
  if (!workspaceId) {
    return null
  }

  return workspaces.find((w: WorkspaceWithCode) => w.id === workspaceId) || null
}

/**
 * 取得當前 workspace 的公司名稱
 *
 * @returns 公司名稱或空字串
 */
function getWorkspaceCompanyName(): string {
  const { user } = useAuthStore.getState()
  return user?.workspace_name || ''
}

/**
 * 取得當前 workspace 的年度標語 (e.g., "角落旅行社 2026" 或 "大地旅遊 2026")
 *
 * @returns 標語字串
 */
function _getWorkspaceTagline(): string {
  const name = getWorkspaceCompanyName()
  const year = new Date().getFullYear()
  return name ? `${name} ${year}` : String(year)
}

/**
 * 取得所有可用的 workspaces（根據權限）
 *
 * @returns workspace 陣列
 */
function _getAvailableWorkspaces() {
  const { user } = useAuthStore.getState()
  const workspaceStore = useWorkspaceStoreData.getState()
  const workspaces = (workspaceStore.items || []) as WorkspaceWithCode[]

  if (!user) {
    return []
  }

  // 所有使用者只能看到自己的 workspace
  const workspaceId = user.workspace_id
  if (!workspaceId) {
    return []
  }

  return workspaces.filter((w: WorkspaceWithCode) => w.id === workspaceId)
}
