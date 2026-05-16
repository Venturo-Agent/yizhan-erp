/**
 * 統一的 Server 端認證服務
 *
 * 所有 Server Actions 都應該使用這個服務來取得認證資訊
 * 內建 fallback 機制：優先從 user_metadata 讀取，否則從 employees 表查詢
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { User } from '@supabase/supabase-js'

interface ServerAuthResult {
  user: User
  workspaceId: string
  employeeId: string
}

interface ServerAuthError {
  error: string
  code: 'NOT_AUTHENTICATED' | 'NO_WORKSPACE' | 'EMPLOYEE_NOT_FOUND'
}

type AuthResult =
  | { success: true; data: ServerAuthResult }
  | { success: false; error: ServerAuthError }

/**
 * 取得當前登入用戶的認證資訊
 *
 * 使用方式：
 * ```ts
 * const auth = await getServerAuth()
 * if (!auth.success) {
 *   return { error: auth.error.error }
 * }
 * const { user, workspaceId, employeeId } = auth.data
 * ```
 */
export async function getServerAuth(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()

  // 1. 取得 Supabase Auth 用戶
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: {
        error: '請先登入',
        code: 'NOT_AUTHENTICATED',
      },
    }
  }

  // 記錄 auth user 資訊以便除錯
  const { logger } = await import('@/lib/utils/logger')
  logger.log('🔍 getServerAuth - auth user:', {
    auth_uid: user.id?.substring(0, 8),
    auth_email: user.email,
    metadata: user.user_metadata,
  })

  // 2. 嘗試從 user_metadata 取得 workspace_id（快速路徑）
  let workspaceId = user.user_metadata?.workspace_id as string | undefined
  let employeeId = user.user_metadata?.employee_id as string | undefined

  // 3. 如果 user_metadata 沒有，從 employees 表查詢
  // 使用 admin client 繞過 RLS，確保能查到員工資料
  if (!workspaceId || !employeeId) {
    const adminClient = getSupabaseAdminClient()

    // 統一 ID 架構：
    // - 標準: employees.user_id = auth.uid()
    // - 兼容: employees.id = auth.uid()（Pattern A 舊資料）
    const { data: employees } = await adminClient
      .from('employees')
      .select('id, workspace_id, user_id')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .limit(1)

    const employee = employees?.[0]

    if (!employee) {
      // 記錄詳細資訊以便除錯
      const { logger } = await import('@/lib/utils/logger')
      logger.error('找不到員工資料', {
        auth_uid: user.id,
        auth_email: user.email,
        user_metadata: user.user_metadata,
      })
      return {
        success: false,
        error: {
          error: '找不到員工資料',
          code: 'EMPLOYEE_NOT_FOUND',
        },
      }
    }

    workspaceId = employee.workspace_id ?? undefined
    employeeId = employee.id
  }

  if (!workspaceId) {
    return {
      success: false,
      error: {
        error: '找不到工作空間',
        code: 'NO_WORKSPACE',
      },
    }
  }

  return {
    success: true,
    data: {
      user,
      workspaceId,
      employeeId: employeeId || user.id,
    },
  }
}

/**
 * 簡化版：只檢查是否已登入，不需要 workspace
 * 用於不需要 workspace 隔離的操作（如發送訊息）
 */
async function _getServerUser(): Promise<{ user: User } | { error: string }> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: '請先登入' }
  }

  return { user }
}

/**
 * 取得 Supabase Server Client（已認證）
 * 方便 Server Actions 使用
 */
export async function getAuthenticatedSupabase() {
  return createSupabaseServerClient()
}
