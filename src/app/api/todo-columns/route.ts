import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError, dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * GET /api/todo-columns — 取得當前使用者的個人看板欄位
 *
 * 2026-05-29 個人化：欄位改 per-user（owner_employee_id）。
 * 過渡期相容：同時收 owner=我 + owner is null（舊共用欄、P3 backfill 後消失）、避免 backfill 前後出現空白。
 */
export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.TODOS_READ)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { data, error } = await supabase
    .from('todo_columns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`owner_employee_id.eq.${guard.employeeId},owner_employee_id.is.null`)
    .order('sort_order')

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
  return NextResponse.json(data || [])
})

/**
 * POST /api/todo-columns — 新增欄位
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.TODOS_WRITE)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: '未登入' }, { status: 401 })

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增看板欄位' })

  const body = await request.json()
  const { name, color = 'gray', sort_order } = body

  if (!name) return NextResponse.json({ error: '需要 name' }, { status: 400 })

  // 如果沒給 sort_order，放到最後（只看自己的欄）
  let finalSortOrder = sort_order
  if (typeof finalSortOrder !== 'number') {
    const { data: maxData } = await supabase
      .from('todo_columns')
      .select('sort_order')
      .eq('workspace_id', workspaceId)
      .eq('owner_employee_id', guard.employeeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    finalSortOrder = (maxData?.sort_order || 0) + 1
  }

  const { data, error } = await supabase
    .from('todo_columns')
    .insert({
      workspace_id: workspaceId,
      owner_employee_id: guard.employeeId, // 個人欄
      name,
      color,
      sort_order: finalSortOrder,
    })
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
})

/**
 * PUT /api/todo-columns — 更新欄位（名稱、顏色、排序）
 * Body: { id, name?, color?, sort_order? }
 * 或批量排序：{ reorder: [{ id, sort_order }, ...] }
 */
export const PUT = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.TODOS_WRITE)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '更新看板欄位' })
  const body = await request.json()

  // 批量重新排序（只動自己的欄）
  if (body.reorder && Array.isArray(body.reorder)) {
    for (const item of body.reorder) {
      await supabase
        .from('todo_columns')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('owner_employee_id', guard.employeeId)
    }
    return NextResponse.json({ success: true })
  }

  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: '需要 id' }, { status: 400 })

  // 只能改自己的欄（個人化）
  const { data, error } = await supabase
    .from('todo_columns')
    .update(updates)
    .eq('id', id)
    .eq('owner_employee_id', guard.employeeId)
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
})

/**
 * DELETE /api/todo-columns?id=xxx — 刪除欄位（系統欄位不可刪）
 */
export const DELETE = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.TODOS_WRITE)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '需要 id' }, { status: 400 })

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '刪除看板欄位',
    requestId: id,
  })

  // 只能刪自己的欄（個人化）
  const { error } = await supabase
    .from('todo_columns')
    .delete()
    .eq('id', id)
    .eq('owner_employee_id', guard.employeeId)
  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
  return NextResponse.json({ success: true })
})
