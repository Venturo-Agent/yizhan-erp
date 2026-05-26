import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { getServerAuth } from '@/lib/auth/server-auth'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { validateBody } from '@/lib/api/validation'
import { createBranchSchema } from '@/lib/validations/api-schemas'
import { logger } from '@/lib/utils/logger'
import { translateDbError, dbErrorResponse } from '@/lib/db-error-translate'

/**
 * /api/branches — 分公司管理
 *
 * GET：列出所有分公司（同租戶員工都能看、給 select 下拉用）
 *      RLS 守 SELECT、API 不必再檢查
 * POST：新增分公司（hr.employees.write 才能新增）
 */

export async function GET() {
  try {
    // 最低守門：確認登入。內容由 RLS 過濾、同租戶員工都能讀
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
    const supabase = await createApiClient()
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, code, display_order, tax_id')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) return dbErrorResponse(error)
    return NextResponse.json(data ?? [])
  } catch (e) {
    logger.error('GET /api/branches failed', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!guard.ok) return guard.response

    const supabase = await createApiClient()
    await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增分公司' })

    const validation = await validateBody(request, createBranchSchema)
    if (!validation.success) return validation.error

    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({
        ...validation.data,
        workspace_id: guard.workspaceId,
      })
      .select('id, name, code, display_order, tax_id')
      .single()

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json(newBranch, { status: 201 })
  } catch (e) {
    logger.error('POST /api/branches failed', e)
    const t = translateDbError(e)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
