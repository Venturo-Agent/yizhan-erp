/**
 * Workspace Context 工具（client 端 SSOT）
 *
 * 規則：
 * - **client 端 workspace_id 取得只走本檔**。server 端走 `@/lib/supabase/api-client` 的
 *   `getCurrentWorkspaceIdServer()`（session cookie + employees 查、不信 client）。
 * - 本檔以 zustand `useAuthStore` 為唯一資料來源；不再直讀 localStorage 手解 JSON。
 *
 * 歷史脈絡（B10 收斂前）：
 * - `src/lib/workspace-helpers.ts`（已併入本檔）
 * - `src/stores/core/store-utils.ts` 重複版（已改為從 store 取）
 * - `src/data/core/entityHookCache.ts` 直讀 localStorage 版（已改為從 store 取）
 * - `src/lib/supabase/api-client.ts` 同名 `getCurrentWorkspaceId`(server) 已改名為
 *   `getCurrentWorkspaceIdServer`、避免與 client 同名混淆。
 */

import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'

// ============================================
// 非 React 環境（純 function 取值）
// ============================================

/**
 * 從 auth store 取得 workspace_id（非 React 環境）
 * 直接讀取 Zustand store state、不讀 localStorage。
 *
 * @returns workspace_id (UUID) 或 null
 */
export function getWorkspaceId(): string | null {
  const user = useAuthStore.getState().user
  return user?.workspace_id || null
}

/**
 * 別名：`getCurrentWorkspaceId`（向後相容）
 *
 * 之前 `workspace-helpers.ts` 跟 `stores/core/store-utils.ts` 都各 export 一份、
 * 行為相同；收斂為一份、改名統一。caller 可繼續用此名。
 */
export function getCurrentWorkspaceId(): string | null {
  return getWorkspaceId()
}

/**
 * 取得當前使用者的 workspace code (TP, TC)
 *
 * @returns workspace code 或 null
 */
export function getCurrentWorkspaceCode(): string | null {
  const user = useAuthStore.getState().user

  if (!user) {
    logger.warn('[getCurrentWorkspaceCode] No user found')
    return null
  }

  if (user.workspace_code) {
    return user.workspace_code
  }

  logger.warn('[getCurrentWorkspaceCode] User has no workspace_code, please re-login')
  return null
}

/**
 * 取得當前使用者的 employee id
 * 用於 audit 欄位（created_by / updated_by）注入
 *
 * @returns employee id 或 null
 */
export function getCurrentEmployeeId(): string | null {
  return useAuthStore.getState().user?.id || null
}

/**
 * 取得必要的 workspace_id，如果沒有則拋出錯誤
 * 用於所有 RLS 需要 workspace_id 的操作
 */
export function getRequiredWorkspaceId(): string {
  const workspaceId = getWorkspaceId()
  if (!workspaceId) {
    throw new Error('無法取得 workspace_id，請重新登入')
  }
  return workspaceId
}

// ============================================
// React Hook 版本
// ============================================

/**
 * React Hook：取得當前 workspace_id
 * 用於 React 組件中（會跟著 store 更新 re-render）
 */
export function useWorkspaceId(): string | null {
  const user = useAuthStore(state => state.user)
  return user?.workspace_id || null
}

/**
 * React Hook：取得必要的 workspace_id
 * 如果沒有值會拋出錯誤（應該在有 auth guard 的頁面使用）
 */
function _useRequiredWorkspaceId(): string {
  const workspaceId = useWorkspaceId()
  if (!workspaceId) {
    throw new Error('無法取得 workspace_id，請重新登入')
  }
  return workspaceId
}

/**
 * 為 create 操作注入 workspace_id
 * 用於確保所有 RLS 操作都有正確的 workspace_id
 */
function _withWorkspaceId<T extends Record<string, unknown>>(
  data: T
): T & { workspace_id: string } {
  const workspaceId = getRequiredWorkspaceId()
  return {
    ...data,
    workspace_id: workspaceId,
  }
}

// ============================================
// 所有用戶（包括系統主管）都只能看到自己 workspace 的資料
// ============================================
