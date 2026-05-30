import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * GET /api/roles
 * 取得當前租戶的角色列表
 * （不需要傳 workspace_id，自動取得）
 */
export const GET = apiHandler(async () => {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceIdServer()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  // 明確過濾 workspace_id（避免系統主管看到其他租戶的職務）
  const { data, error } = await supabase
    .from('workspace_roles')
    .select(
      'id, name, description, is_admin, sort_order, workspace_id, read_scope, created_at, updated_at'
    )
    .eq('workspace_id', workspaceId)
    .eq('is_system_bot', false) // 2026-05-26 William 拍板：機器人角色（System Bot）不顯示在職務管理
    .order('sort_order', { ascending: true })

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data)
})

/**
 * POST /api/roles
 * 建立新角色
 */
export const POST = apiHandler(async (request: NextRequest) => {
  // 補上 capability 守門
  const guard = await requireCapability(CAPABILITIES.HR_MANAGE_ROLES)
  if (!guard.ok) return guard.response

  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceIdServer()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '建立職務' })

  const body = await request.json()
  const { name, description } = body

  if (!name) {
    return NextResponse.json({ error: '缺少角色名稱' }, { status: 400 })
  }

  // 取得最大 sort_order（RLS 會自動過濾）
  const { data: roles } = await supabase
    .from('workspace_roles')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (roles?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name,
      description,
      is_admin: false,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data)
})
