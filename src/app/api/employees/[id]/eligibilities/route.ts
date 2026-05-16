/**
 * /api/employees/[id]/eligibilities
 *
 * 5/13 William 拍板：員工資格管理 API。
 *
 * GET → 拿員工的資格清單（陣列 of eligibility_code）
 * PUT → 設定員工資格（傳 codes: string[]、先刪舊再 INSERT 新）
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { isValidEligibilityCode } from '@/lib/eligibilities'
import { logger } from '@/lib/utils/logger'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

// GET /api/employees/[id]/eligibilities
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const guard = await requireCapability(CAPABILITIES.HR_READ_EMPLOYEES)
    if (!guard.ok) return guard.response

    const client = getSupabaseAdminClient()
    const { data, error } = await client
      .from('employee_eligibilities')
      .select('eligibility_code')
      .eq('employee_id', id)
      .eq('workspace_id', guard.workspaceId)

    if (error) return dbErrorResponse(error)

    return NextResponse.json({
      data: (data || []).map((d) => d.eligibility_code),
    })
  } catch (error) {
    logger.error('API Error', { path: _req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}

// PUT /api/employees/[id]/eligibilities  body: { codes: string[] }
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!guard.ok) return guard.response

    const body = await req.json()
    const codes: string[] = Array.isArray(body.codes) ? body.codes : []

    // 驗證 code 合法性
    const invalid = codes.filter((c) => !isValidEligibilityCode(c))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `不合法的資格 code: ${invalid.join(', ')}` },
        { status: 400 },
      )
    }

    const client = getSupabaseAdminClient()

    await recordApiAuditContext(client, {
      actorId: guard.employeeId,
      reason: '更新員工保費資格',
      requestId: id,
    })

    // 先刪舊（workspace scoped）
    const { error: delError } = await client
      .from('employee_eligibilities')
      .delete()
      .eq('employee_id', id)
      .eq('workspace_id', guard.workspaceId)

    if (delError) return dbErrorResponse(delError)

    // INSERT 新
    if (codes.length > 0) {
      const rows = codes.map((code) => ({
        employee_id: id,
        eligibility_code: code,
        workspace_id: guard.workspaceId,
        created_by: guard.employeeId,
      }))
      const { error: insError } = await client
        .from('employee_eligibilities')
        .insert(rows)

      if (insError) return dbErrorResponse(insError)
    }

    return NextResponse.json({ success: true, count: codes.length })
  } catch (error) {
    logger.error('API Error', { path: req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
