/**
 * 同步員工的 user_id 和 workspace 到 metadata
 * 使用 Admin Client 繞過 RLS 限制
 *
 * 這個 API 解決登入時的雞生蛋問題：
 * - 更新 employees.user_id 需要 RLS 檢查 workspace
 * - 但 RLS 需要 user_id 才能找到 workspace
 * - 所以用 admin client 繞過 RLS
 */

import { logger } from '@/lib/utils/logger'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { translateDbError } from '@/lib/db-error-translate'
import { validateBody } from '@/lib/api/validation'
import { syncEmployeeSchema } from '@/lib/validations/api-schemas'

/**
 * 故意不守 requireCapability：登入後 auth user ↔ employee 同步、不需 capability
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, syncEmployeeSchema)
    if (!validation.success) return validation.error
    const { employee_id, user_id, workspace_id, access_token } = validation.data

    // 驗證請求者身份
    // 方法1: 使用 access_token 驗證（登入後 session cookie 可能還沒設好）
    // 方法2: 使用 session cookie 驗證（已登入的情況）
    const supabaseAdmin = getSupabaseAdminClient()

    if (access_token) {
      // 用 admin client 驗證 token 對應的用戶
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(access_token)
      if (error || !user || user.id !== user_id) {
        logger.error('Token 驗證失敗:', error?.message || 'user mismatch')
        return errorResponse('Unauthorized: invalid token', 401, ErrorCode.UNAUTHORIZED)
      }
      logger.log('Token 驗證成功:', user.id)
    } else {
      // 備用：用 cookie session 驗證
      const supabase = await createSupabaseServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || user.id !== user_id) {
        return errorResponse('Unauthorized: user mismatch', 401, ErrorCode.UNAUTHORIZED)
      }
    }

    // 跨租戶綁帳號守門：
    // 查目標 employee 的真實 workspace、驗 body 傳的 workspace_id 對齊、
    // 拒絕已綁定其他 auth user 的員工被覆蓋。
    const { data: targetEmp, error: empLookupErr } = await supabaseAdmin
      .from('employees')
      .select('id, workspace_id, user_id')
      .eq('id', employee_id)
      .single()

    if (empLookupErr || !targetEmp) {
      logger.error('找不到目標員工:', { employee_id, err: empLookupErr?.message })
      return errorResponse('找不到目標員工', 404, ErrorCode.NOT_FOUND)
    }

    if (workspace_id && workspace_id !== targetEmp.workspace_id) {
      logger.error('workspace_id 與員工實際所屬不符', {
        employee_id,
        body_workspace_id: workspace_id,
        actual_workspace_id: targetEmp.workspace_id,
      })
      return errorResponse('workspace 不符', 403, ErrorCode.FORBIDDEN)
    }

    if (targetEmp.user_id && targetEmp.user_id !== user_id) {
      logger.error('目標員工已綁定其他帳號、拒絕覆蓋', {
        employee_id,
        existing: targetEmp.user_id,
        attempted: user_id,
      })
      return errorResponse('此員工已綁定其他帳號', 403, ErrorCode.FORBIDDEN)
    }

    // 1. 更新 employees.user_id（繞過 RLS）
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ user_id })
      .eq('id', employee_id)

    if (updateError) {
      logger.error('更新 user_id 失敗:', updateError)
      const t = translateDbError(updateError)
      return errorResponse(t.message, t.httpStatus, ErrorCode.DATABASE_ERROR)
    }

    logger.log('已更新 employees.user_id:', user_id)

    // 2. 更新 auth.users 的 metadata（使用 admin）
    // 用員工的真實 workspace_id（SSOT、不信 body 傳的）
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        user_metadata: {
          workspace_id: targetEmp.workspace_id,
          employee_id,
        },
      }
    )

    if (metadataError) {
      logger.warn('更新 user_metadata 失敗:', metadataError)
      // 不回傳錯誤，因為 user_id 已經設好了
    } else {
      logger.log('已更新 user_metadata:', {
        workspace_id: targetEmp.workspace_id,
        employee_id,
      })
    }

    return successResponse(null)
  } catch (error) {
    logger.error('sync-employee 錯誤:', error)
    return errorResponse('Internal server error', 500, ErrorCode.INTERNAL_ERROR)
  }
}
