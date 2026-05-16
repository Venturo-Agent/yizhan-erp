import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'
import { validateBody } from '@/lib/api/validation'
import { createEmployeeSchema } from '@/lib/validations/api-schemas'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'

/**
 * POST /api/employees/create
 * 建立新員工（包含 Supabase Auth 帳號）
 *
 * capability 守門：限定有 hr.employees.write 才能建立員工
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!guard.ok) return guard.response
    const auth = { data: { employeeId: guard.employeeId, workspaceId: guard.workspaceId } }

    const supabaseClient = await createApiClient()
    await recordApiAuditContext(supabaseClient, { actorId: guard.employeeId, reason: '建立員工' })

    // 🔒 zod whitelist：只收名單上的欄位、過濾掉 workspace_id / user_id / must_change_password 等敏感欄位
    //    密碼必填（min 8）、不再 fallback '12345678'
    const validation = await validateBody(request, createEmployeeSchema)
    if (!validation.success) return validation.error
    const { password, ...employeeData } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. 取得當前用戶的 workspace_id
    const { data: currentUser } = await supabaseAdmin
      .from('employees')
      .select('workspace_id')
      .eq('id', auth.data.employeeId)
      .single()

    if (!currentUser?.workspace_id) {
      return NextResponse.json({ message: '無法取得租戶資訊' }, { status: 400 })
    }

    // 2. 取得 workspace code + 員工上限
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('code, max_employees')
      .eq('id', currentUser.workspace_id)
      .single()

    // 2.5 檢查員工數量上限
    const maxEmployees = workspace?.max_employees ?? null
    if (maxEmployees != null) {
      const { count } = await supabaseAdmin
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentUser.workspace_id)
        .neq('status', 'terminated')

      if (count != null && count >= maxEmployees) {
        return NextResponse.json(
          { message: `已達員工數量上限（${maxEmployees} 人），請升級方案或聯繫系統主管` },
          { status: 403 }
        )
      }
    }

    // 3. 建立 Supabase Auth 帳號
    // SSOT：employees.email = auth.users.email = 用戶填的 email
    // 規格：[[Logan-Workspace/audit/2026-05-11-員工-email-SSOT.md]]
    // 砍掉舊的 hardcoded fallback `${workspaceCode}_${employee_number}@venturo.com`
    // schema 已強制 email required、employeeData.email 必有值
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: employeeData.email,
      password,
      email_confirm: true,
    })

    if (authError) {
      // 5/15 加詳細 error：原本只回「建立登入帳號失敗」黑箱、user 不知道根因
      logger.error('Failed to create auth user:', { message: authError.message, status: authError.status, raw: authError })
      const msg = authError.message ?? ''
      const lower = msg.toLowerCase()
      // 常見：員工被 DELETE 但 auth.users 還留著 orphan、新建撞 email unique
      if (
        lower.includes('already') ||
        lower.includes('email_exists') ||
        lower.includes('user already registered')
      ) {
        return NextResponse.json(
          {
            message: `此 Email「${employeeData.email}」已被其他帳號使用。
可能原因：之前同 email 員工被刪、但登入帳號（auth.users）沒一起清。請改用其他 Email、或聯絡系統管理員清理 orphan auth user。`,
            code: 'email_exists',
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { message: `建立登入帳號失敗：${msg || '未知錯誤'}` },
        { status: 500 }
      )
    }

    // 4. 建立員工資料
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        ...employeeData,
        workspace_id: currentUser.workspace_id,
        user_id: authUser.user.id,
        must_change_password: true,
      })
      .select('id, employee_number')
      .single()

    if (empError) {
      // Rollback: 刪除剛建立的 auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      const translated = translateDbError(empError)
      return NextResponse.json(
        { message: translated.message, field: translated.field, code: translated.code },
        { status: translated.httpStatus }
      )
    }

    logger.log(`Employee created: ${employee.employee_number}`)

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employee_number: employee.employee_number,
      },
    })
  } catch (error) {
    logger.error('Create employee error:', error)
    return NextResponse.json({ message: '伺服器錯誤' }, { status: 500 })
  }
}
