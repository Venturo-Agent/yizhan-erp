import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { changePasswordSchema } from '@/lib/validations/api-schemas'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * 用戶自行更改密碼
 * 使用 Supabase Auth 驗證當前密碼，並更新 Supabase Auth 密碼
 * 不再更新 employees.password_hash（已棄用）
 */
/**
 * auth-only 合理：員工改自己密碼、登入即可（不需 capability）
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 5 requests per minute
    const rateLimited = await checkRateLimit(request, 'change-password', 5, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 Session 檢查：必須已登入
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const validation = await validateBody(request, changePasswordSchema)
    if (!validation.success) return validation.error
    const {
      employee_number,
      workspace_code: _workspace_code,
      current_password,
      new_password,
    } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. 用當前登入用戶的資訊查詢（已經有 session 了）
    // 5/17 加查 must_change_password：首次登入跳過舊密碼驗證
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, employee_number, user_id, workspace_id, must_change_password')
      .eq('id', auth.data.employeeId)
      .single()

    if (empError || !employee) {
      logger.error('Employee not found:', empError)
      return errorResponse('找不到此員工', 404, ErrorCode.NOT_FOUND)
    }

    // 2. 取得 authEmail（先從 auth.users 查、fallback 用舊邏輯拼）
    let authEmail: string | undefined
    if (employee.user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(employee.user_id)
      authEmail = authUser?.user?.email ?? undefined
    }
    if (!authEmail) {
      const empNum = employee.employee_number
      authEmail = `corner_${empNum.toLowerCase()}@venturo.com`
    }

    // 3. 舊密碼驗證 — 首次登入跳過、其他情況必驗
    //
    // 為什麼這樣設計：
    // - 首次登入 must_change_password=true、所有員工預設密碼都是 12345678
    //   輸入「12345678」當舊密碼很蠢、business 無感、體感卡關
    // - 正常改密碼（must_change_password=false）還是要驗舊密碼、防電腦借人 / session 被劫持
    //   後改密碼鎖死帳號
    const isFirstTimeChange = employee.must_change_password === true
    if (!isFirstTimeChange) {
      if (!current_password) {
        return errorResponse('請輸入目前密碼', 400, ErrorCode.VALIDATION_ERROR)
      }
      // 用 anon client 驗舊密碼（admin client 拿 SERVICE_ROLE_KEY、用 admin client 驗密碼會
      // 留下「成功登入」session 在 admin context、且 admin 不該做用戶層 sign-in。改用 anon 才正規。）
      const verifyClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )
      const { error: signInError } = await verifyClient.auth.signInWithPassword({
        email: authEmail,
        password: current_password,
      })

      if (signInError) {
        return errorResponse('目前密碼錯誤', 401, ErrorCode.UNAUTHORIZED)
      }
    }

    // 3. 更新 Supabase Auth 密碼
    if (!employee.user_id) {
      return errorResponse('此帳號尚未綁定登入系統', 400, ErrorCode.VALIDATION_ERROR)
    }

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: auth.data.employeeId,
      reason: '員工自行更改密碼',
    })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
      password: new_password,
    })

    if (updateError) {
      logger.error('Failed to update password:', updateError)
      return errorResponse('更新密碼失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    // 4. 更新 must_change_password 標記
    await supabaseAdmin
      .from('employees')
      .update({ must_change_password: false })
      .eq('id', employee.id)

    logger.log('✅ Password changed for employee:', employee_number)
    // 回傳 authEmail 讓 client 用新密碼重新 signInWithPassword 拿 fresh session
    // （admin.updateUserById 會 invalidate 既有 session、不重 sign in 會 redirect 死循環）
    return successResponse({ message: '密碼更新成功', authEmail })
  } catch (error) {
    logger.error('Change password error:', error)
    captureException(error, { module: 'auth.change-password' })
    return errorResponse('伺服器錯誤', 500, ErrorCode.INTERNAL_ERROR)
  }
}
