import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import type { Json } from '@/lib/supabase/types'

/**
 * PATCH /api/employees/[id]
 * 編輯員工 — email SSOT、同時 sync employees + auth.users.email
 *
 * 規格：[[Logan-Workspace/audit/2026-05-11-員工-email-SSOT.md]]
 *
 * 為什麼要 API：
 * - 之前用 useEmployee.update（supabase client）直接 UPDATE employees 表、auth.users.email 不會 sync
 * - 改 email 後永遠登不進新 email、是 production bug
 * - 必走 API + service_role + auth.admin.updateUserById sync
 */

// 編輯時所有欄位可選（通常只改部分）。email 如有值必須 valid format（不接空字串）。
const updateEmployeeSchema = z
  .object({
    chinese_name: z.string().min(1).max(50).optional(),
    english_name: z.string().max(100).nullable().optional(),
    display_name: z.string().max(50).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    email: z.string().email('email 格式錯誤').max(255).optional(),
    phone: z.string().max(30).nullable().optional(),
    role_id: z.string().uuid().nullable().optional(),
    status: z.enum(['active', 'inactive', 'on_leave']).optional(),
    job_title: z.string().nullable().optional(),
    monthly_salary: z.number().nullable().optional(),
    branch_id: z.string().uuid().nullable().optional(),
    // jsonb 結構欄位（zod v4 z.record 需指定 key+value）
    personal_info: z.record(z.string(), z.unknown()).optional(),
    job_info: z.record(z.string(), z.unknown()).optional(),
    salary_info: z.record(z.string(), z.unknown()).optional(),
    // 銀行（薪資匯款 / 代墊人對方銀行用、2026-05-15 加）
    bank_code: z.string().max(20).nullable().optional(),
    bank_name: z.string().max(100).nullable().optional(),
    bank_account_number: z.string().max(50).nullable().optional(),
    bank_account_name: z.string().max(100).nullable().optional(),
    // 旅行社業界日期（2026-05-18 加）
    tourism_join_date: z.string().date().nullable().optional(),
    labor_insurance_date: z.string().date().nullable().optional(),
  })
  .strict()

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!guard.ok) return guard.response

    const apiClient = await createApiClient()
    await recordApiAuditContext(apiClient, { actorId: guard.employeeId, reason: '更新員工' })

    const { id } = await params
    const body = await req.json()
    const parsed = updateEmployeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: '欄位驗證失敗', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const data = parsed.data
    const supabase = getSupabaseAdminClient()

    // 1. 取現在的 employee（拿 user_id + current email + 跨 workspace 守門用 workspace_id）
    const { data: current, error: getErr } = await supabase
      .from('employees')
      .select('user_id, email, workspace_id')
      .eq('id', id)
      .single<{ user_id: string | null; email: string | null; workspace_id: string }>()

    if (getErr || !current) {
      return NextResponse.json({ message: '找不到員工' }, { status: 404 })
    }

    // 跨 workspace 守門：caller workspace !== employee workspace 不准改
    if (current.workspace_id !== guard.workspaceId) {
      return NextResponse.json({ message: '不可跨 workspace 修改員工' }, { status: 403 })
    }

    // 2026-05-27 William 拍板：移除薪資銀行帳號加密（SEC-012 截除）。
    // bank_account_number 直接以明文寫進 employees 原欄（走下面的 ...data）。
    // 原因：病根是加密金鑰 PERSONAL_DATA_ENCRYPTION_KEY 未配發、導致存檔 throw 500；
    //       業務上判定員工薪資帳戶不需此層加密、故移除整套（含 encrypted_* 欄位）。

    // 2. UPDATE employees
    const { error: updateErr } = await supabase
      .from('employees')
      .update({
        ...data,
        personal_info: data.personal_info as Json | undefined,
        job_info: data.job_info as Json | undefined,
        salary_info: data.salary_info as Json | undefined,
        updated_at: new Date().toISOString(),
        updated_by: guard.employeeId,
      })
      .eq('id', id)

    if (updateErr) {
      logger.error('[employees.PATCH] update employees failed:', updateErr)
      const t = translateDbError(updateErr)
      return NextResponse.json(
        { message: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    // 3. 如果 email 變了 → sync auth.users.email
    if (data.email && data.email !== current.email) {
      if (!current.user_id) {
        logger.warn('[employees.PATCH] email changed but employee has no user_id, skip auth sync')
      } else {
        const { error: authErr } = await supabase.auth.admin.updateUserById(current.user_id, {
          email: data.email,
          email_confirm: true,
        })
        if (authErr) {
          logger.error('[employees.PATCH] auth sync failed:', authErr)
          return NextResponse.json(
            {
              message: '員工資料已更新但登入 email sync 失敗、請聯絡系統主管',
              detail: authErr.message,
            },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API Error', { path: req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}

/**
 * DELETE /api/employees/[id]
 * 永久刪除員工 — 連同 auth.users 一起級聯清除（避免 orphan auth.user 害新員工同 email 撞 unique）
 *
 * 5/15 William 拍板：HR 刪除流程要級聯。原本 client-side store.delete 只刪 employees row、
 * auth.users 留 orphan、之後新員工同 email 會撞「建立登入帳號失敗」。改成走這個 API：
 *   1. DELETE employees（如有 FK reference 會撞 23503、回 409 friendly message）
 *   2. auth.admin.deleteUser(user_id) 級聯清 auth user
 *   3. 兩步都成功才算 OK
 *
 * 紀律：
 *   - 跨 workspace 守門（不可刪別 workspace 員工）
 *   - 員工有 FK reference（譬如 orders.created_by） → 不刪、提示走離職
 *   - employees DELETE 成功但 auth deleteUser 失敗 → 回 500 + 標 inconsistent state
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!guard.ok) return guard.response

    const apiClient = await createApiClient()
    await recordApiAuditContext(apiClient, { actorId: guard.employeeId, reason: '永久刪除員工' })

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    // 1. 取 employee row（拿 user_id + 跨 workspace 守門用）
    const { data: emp, error: getErr } = await supabase
      .from('employees')
      .select('user_id, workspace_id, display_name, chinese_name, employee_number')
      .eq('id', id)
      .single<{
        user_id: string | null
        workspace_id: string
        display_name: string | null
        chinese_name: string | null
        employee_number: string | null
      }>()

    if (getErr || !emp) {
      return NextResponse.json({ message: '找不到員工' }, { status: 404 })
    }
    if (emp.workspace_id !== guard.workspaceId) {
      return NextResponse.json({ message: '不可跨 workspace 刪除員工' }, { status: 403 })
    }

    // 2. DELETE employees（FK reference 會擋）
    const { error: delErr, count } = await supabase
      .from('employees')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (delErr) {
      logger.error('[employees.DELETE] delete employees failed:', {
        message: delErr.message,
        code: delErr.code,
        details: delErr.details,
      })
      if (
        delErr.code === '23503' ||
        delErr.message?.toLowerCase().includes('foreign key') ||
        delErr.details?.toLowerCase().includes('still referenced')
      ) {
        return NextResponse.json(
          {
            message:
              '員工已有歷史紀錄（訂單 / 出納 / 收款等）、無法刪除、請改用「辦理離職」保留稽核軌跡',
            code: '23503',
            detail: delErr.details,
          },
          { status: 409 }
        )
      }
      const t = translateDbError(delErr)
      return NextResponse.json(
        { message: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }
    if (count === 0) {
      return NextResponse.json({ message: '找不到員工或無權限刪除（RLS 擋下）' }, { status: 404 })
    }

    // 3. 級聯刪除 auth.users（避免 orphan）
    if (emp.user_id) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(emp.user_id)
      if (authErr) {
        // employees 已刪、但 auth user 沒清乾淨 — inconsistent state
        logger.error('[employees.DELETE] auth.admin.deleteUser failed (inconsistent state):', {
          userId: emp.user_id,
          message: authErr.message,
        })
        return NextResponse.json(
          {
            message: `員工資料已刪除、但 auth.users 清理失敗、請通知系統主管手動清 user_id=${emp.user_id}`,
            detail: authErr.message,
            partial: true,
          },
          { status: 500 }
        )
      }
    }

    const empName = emp.display_name || emp.chinese_name || emp.employee_number || '員工'
    logger.log(
      `[employees.DELETE] permanently deleted: ${empName} (id=${id}, user_id=${emp.user_id})`
    )
    return NextResponse.json({ success: true, deletedName: empName })
  } catch (error) {
    logger.error('API Error', { path: _req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
