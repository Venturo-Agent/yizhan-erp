import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

const VALID_READ_SCOPES = ['self', 'department', 'branch', 'group'] as const

/**
 * PUT /api/roles/[roleId]
 * 更新角色 metadata（目前支援 name / description / read_scope）
 * capability 守門 + RLS 雙保險
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_ROLES)
    if (!guard.ok) return guard.response

    const { roleId } = await params
    const supabase = await createApiClient()
    const body = await request.json()

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
    if (body.description !== undefined) update.description = body.description || null
    if (body.read_scope !== undefined) {
      if (!VALID_READ_SCOPES.includes(body.read_scope)) {
        return NextResponse.json(
          { error: '無效的讀取範圍、必須是 self / department / branch / group 其中一個' },
          { status: 400 }
        )
      }
      update.read_scope = body.read_scope
    }

    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: '更新職務設定',
      requestId: roleId,
    })

    const { data, error } = await supabase
      .from('workspace_roles')
      .update(update)
      .eq('id', roleId)
      .select()
      .single()

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}

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
