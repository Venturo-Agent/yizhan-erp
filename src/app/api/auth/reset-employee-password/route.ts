import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { resetEmployeePasswordSchema } from '@/lib/validations/api-schemas'

/**
 * 檢查員工是否擁有管理員資格
 */
import { canManageRoles, hasCapabilityByCode } from '@/app/api/lib/check-capability'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

/**
 * 重設員工密碼 API
 * 只更新 Supabase Auth 密碼（不更新 password_hash）
 * 🔒 需要管理員資格
 */
/**
 * auth-only 合理：HR 重設員工密碼、用 admin 流程驗證、本身已守
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 10 requests per minute (admin password reset)
    const rateLimited = await checkRateLimit(request, 'reset-employee-password', 10, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：需要已登入用戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    // 🔒 檢查是否擁有管理角色的 capability（hr.roles.write）
    const isAdmin = await canManageRoles(auth.data.employeeId)
    if (!isAdmin) {
      return errorResponse('您沒有此權限', 403, ErrorCode.FORBIDDEN)
    }

    const validation = await validateBody(request, resetEmployeePasswordSchema)
    if (!validation.success) return validation.error
    const { employee_id, new_password } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. 查詢員工的 user_id + workspace_id（含 workspace 守門）
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, user_id, display_name, workspace_id')
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      return errorResponse('找不到此員工', 404, ErrorCode.NOT_FOUND)
    }

    // 跨 workspace 守門：除非 caller 是平台租戶管理員（有 workspaces.write capability）
    // VENTURO（漫途）平台方 admin 有 workspaces.write、能透過租戶管理頁 reset 任何客戶 admin 密碼
    // 一般客戶 admin（只有 hr.roles.write）只能 reset 自家員工
    if (employee.workspace_id !== auth.data.workspaceId) {
      const isPlatformAdmin = await hasCapabilityByCode(
        auth.data.employeeId,
        'workspaces.write'
      )
      if (!isPlatformAdmin) {
        logger.error('跨租戶重設密碼嘗試（非平台 admin）', {
          caller_workspace: auth.data.workspaceId,
          target_workspace: employee.workspace_id,
          target_employee: employee_id,
        })
        return errorResponse('不能重設其他公司員工的密碼', 403, ErrorCode.FORBIDDEN)
      }
    }

    if (!employee.user_id) {
      return errorResponse('此員工尚未綁定登入帳號', 400, ErrorCode.VALIDATION_ERROR)
    }

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: auth.data.employeeId,
      reason: `重設員工密碼（target: ${employee_id}）`,
    })

    // 2. 更新 Supabase Auth 密碼
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      employee.user_id,
      { password: new_password }
    )

    if (updateError) {
      logger.error('Update password error:', updateError)
      return errorResponse('重置密碼失敗，請稍後再試', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`✅ 已重設 ${employee.display_name} 的密碼`)
    return successResponse({ message: '密碼已更新' })
  } catch (error) {
    logger.error('Reset employee password error:', error)
    captureException(error, { module: 'auth.reset-employee-password' })
    return errorResponse('伺服器錯誤', 500, ErrorCode.INTERNAL_ERROR)
  }
}
