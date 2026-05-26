import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError, dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

// GET: 列出會計科目（RLS 自動過濾）
export const GET = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.ACCOUNTING_ACCOUNTS_READ)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // revenue, expense, asset, liability

  let query = supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, parent_id, is_system_locked, is_active, description')
    .eq('is_active', true)
    .order('code')

  if (type) {
    query = query.eq('account_type', type)
  }

  const { data, error } = await query

  if (error) {
    return dbErrorResponse(error)
  }

  // 轉換欄位名稱以相容前端
  const formattedData = data?.map(item => ({
    ...item,
    type: item.account_type,
    is_system: item.is_system_locked,
    level: item.parent_id ? 2 : 1,
  }))

  return NextResponse.json(formattedData)
})

// POST: 新增會計科目
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.ACCOUNTING_ACCOUNTS_WRITE)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增會計科目' })

  const body = await request.json()
  const { code, name, type, description, parent_id } = body

  if (!code || !name || !type) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert({
      workspace_id: workspaceId,
      code,
      name,
      account_type: type,
      description,
      parent_id,
      is_system_locked: false,
      is_active: true,
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

// PUT: 更新會計科目
export const PUT = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.ACCOUNTING_ACCOUNTS_WRITE)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '更新會計科目',
    requestId: id,
  })

  const body = await request.json()
  const { name, description, is_active } = body

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update({
      name,
      description,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
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

// DELETE: 刪除會計科目（系統科目不能刪）
export const DELETE = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.ACCOUNTING_ACCOUNTS_WRITE)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '刪除會計科目',
    requestId: id,
  })

  // 檢查是否為系統科目
  const { data: subject } = await supabase
    .from('chart_of_accounts')
    .select('is_system_locked')
    .eq('id', id)
    .single()

  if (subject?.is_system_locked) {
    return NextResponse.json({ error: '系統科目不能刪除' }, { status: 400 })
  }

  const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id)

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ success: true })
})
