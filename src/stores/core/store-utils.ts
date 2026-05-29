/**
 * Store 工廠輔助工具
 *
 * UUID 生成、UUID 驗證、使用者 context 讀取、錯誤解析
 * 從 create-store.ts 抽離，避免單一檔案過長
 */

import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import type { UserRole } from '@/types/user.types'
import { useAuthStore } from '@/stores/auth-store'

// ============================================
// UUID 工具
// ============================================

/**
 * 驗證 UUID 格式（防 SQL injection）
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * 生成 UUID（相容不支援 crypto.randomUUID 的瀏覽器）
 */
export function generateUUID(): string {
  // 優先使用原生 crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: 使用 crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    )
  }
  // 最後手段：Math.random（不推薦，但能用）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================
// 使用者 Context 讀取工具
// ============================================

/**
 * 取得當前使用者的 workspace_id 和 role
 *
 * B10 收斂：原本直讀 localStorage 手解 JSON、改為走 zustand auth store。
 * `useAuthStore` 自己用 zustand persist middleware、SSR 安全。
 *
 * isAdmin flag 已從 auth-store 移除、userRole 一律回 'staff'。
 * 系統內沒有 user 特權概念、權限決策走 workspace_features + role_capabilities。
 * 這個函式只服務 stores/core 內部 cache scoping、不涉及權限決策。
 */
export function getCurrentUserContext(): { workspaceId: string | null; userRole: UserRole | null } {
  if (typeof window === 'undefined') return { workspaceId: null, userRole: null }
  const user = useAuthStore.getState().user
  if (!user) return { workspaceId: null, userRole: null }
  return {
    workspaceId: user.workspace_id || null,
    userRole: 'staff' as UserRole,
  }
}

/**
 * 取得當前使用者的 workspace_id（向後相容）
 *
 * B10 收斂：re-export `@/lib/workspace-context` 的同名函式、確保 client 端單一實作 SSOT。
 * 之前同名於三檔（workspace-helpers / store-utils / api-client(server)）各自實作、易撞名。
 */
export { getCurrentWorkspaceId } from '@/lib/workspace-context'

/**
 * 取得當前使用者的員工 ID（用於追蹤 created_by, updated_by）
 *
 * B10 收斂：原本直讀 localStorage、改為走 zustand store。
 */
export function getCurrentEmployeeId(): string | null {
  if (typeof window === 'undefined') return null
  return useAuthStore.getState().user?.id || null
}

// ============================================
// 錯誤解析工具
// ============================================

/**
 * 將未知錯誤格式解析為可讀訊息
 */
export function parseErrorMessage(error: unknown, fallback = '操作失敗'): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const err = error as {
      message?: string
      error?: string
      details?: string
      code?: string
      hint?: string
    }
    if (err.message) return err.message
    if (err.details) return err.details
    if (err.error) return err.error
    if (err.code) return `資料庫錯誤 (${err.code})`
    if (err.hint) return err.hint
    if (Object.keys(error).length === 0) return '資料庫操作失敗，請檢查必填欄位或權限設定'
    try {
      return JSON.stringify(error)
    } catch {
      return '未知錯誤'
    }
  }
  return fallback
}

/**
 * 判斷是否為 unique constraint 違反錯誤
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  return (
    err.code === '23505' ||
    (err.message?.includes('duplicate key') ?? false) ||
    (err.message?.includes('unique constraint') ?? false) ||
    (err.message?.includes('violates unique constraint') ?? false)
  )
}

// ============================================
// Code 生成工具
// ============================================

/**
 * 從資料庫查詢並生成下一個 code
 * 每次 insertAttempt > 0 時加偏移量避免並發衝突
 */
export async function generateNextCode(
  tableName: string,
  codePrefix: string,
  insertAttempt: number
): Promise<string> {
  const { data: maxCodeResults } = await dynamicFrom(tableName)
    .select('code')
    .like('code', `${codePrefix}%`)
    .order('code', { ascending: false })
    .limit(1)

  let nextNumber = 1
  const codeResults = maxCodeResults as Array<{ code?: string }> | null
  if (codeResults && codeResults.length > 0 && codeResults[0]?.code) {
    const numericPart = codeResults[0].code.replace(codePrefix, '')
    const currentMax = parseInt(numericPart, 10)
    if (!isNaN(currentMax)) {
      nextNumber = currentMax + 1
    }
  }

  // 加入隨機偏移量避免並發衝突（第二次重試開始）
  if (insertAttempt > 0) {
    nextNumber += insertAttempt
  }

  logger.log(`[${tableName}] 生成 code: ${codePrefix}${String(nextNumber).padStart(6, '0')}`)
  return `${codePrefix}${String(nextNumber).padStart(6, '0')}`
}
