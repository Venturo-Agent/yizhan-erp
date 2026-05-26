import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * GET /api/job-roles/selector-fields
 * 取得當前租戶的選人欄位 + 映射的職務
 */
export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.HR_READ_ROLES)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('workspace_selector_fields')
    .select(
      `
      id, name, level, is_required, sort_order, created_at,
      selector_field_roles (
        role_id,
        workspace_roles:role_id ( id, name )
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  // 整理格式：把 nested 的 roles 攤平
  const result = data?.map(field => ({
    ...field,
    roles:
      field.selector_field_roles?.map((sfr: Record<string, unknown>) => sfr.workspace_roles) ?? [],
    selector_field_roles: undefined,
  }))

  return NextResponse.json(result)
})

/**
 * POST /api/job-roles/selector-fields
 * 建立新選人欄位 + 映射
 * body: { name, level, is_required, role_ids }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.HR_MANAGE_ROLES)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '建立選人欄位' })

  const body = await request.json()
  const { name, level, is_required = false, role_ids = [] } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '缺少欄位名稱' }, { status: 400 })
  }
  if (!level || !['tour', 'order'].includes(level)) {
    return NextResponse.json({ error: '層級必須是 tour 或 order' }, { status: 400 })
  }

  // 取得最大 sort_order
  const { data: existing } = await supabase
    .from('workspace_selector_fields')
    .select('sort_order')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  // 建立欄位
  const { data: field, error } = await supabase
    .from('workspace_selector_fields')
    .insert({
      workspace_id: workspaceId,
      name: name.trim(),
      level,
      is_required,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '此欄位名稱已存在' }, { status: 409 })
    }
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  // 建立映射
  if (role_ids.length > 0 && field) {
    const mappings = role_ids.map((role_id: string) => ({
      field_id: field.id,
      role_id,
    }))

    const { error: mapError } = await supabase.from('selector_field_roles').insert(mappings)

    if (mapError) {
      const t = translateDbError(mapError)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }
  }

  return NextResponse.json(field)
})
