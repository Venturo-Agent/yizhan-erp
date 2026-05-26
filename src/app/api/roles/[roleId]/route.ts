import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

/**
 * DELETE /api/roles/[roleId]
 * 刪除角色（系統主管角色擋下）
 *
 * capability 守門 + RLS 雙保險
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_ROLES)
    if (!guard.ok) return guard.response

    const { roleId } = await params
    const supabase = await createApiClient()

    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: '刪除職務',
      requestId: roleId,
    })

    // 檢查職務是否擁有管理員資格
    const { data: role } = await supabase
      .from('workspace_roles')
      .select('is_admin')
      .eq('id', roleId)
      .single()

    if (role?.is_admin) {
      return NextResponse.json({ error: '無法刪除擁有管理員資格的職務' }, { status: 400 })
    }

    const { error } = await supabase.from('workspace_roles').delete().eq('id', roleId)

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
