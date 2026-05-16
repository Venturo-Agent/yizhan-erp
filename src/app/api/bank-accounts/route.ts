import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { upsertBankAccountSchema } from '@/lib/validations/api-schemas'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * GET /api/bank-accounts
 * 取得銀行帳戶列表（RLS 自動過濾當前租戶）
 */
export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_READ_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('bank_accounts')
    .select(
      'id, code, name, bank_code, bank_name, account_number, is_default, is_active, is_disbursement_eligible, workspace_id, created_at, updated_at'
    )
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json(data)
})

/**
 * POST /api/bank-accounts
 * 新增銀行帳戶
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增銀行帳戶' })

  const validation = await validateBody(request, upsertBankAccountSchema)
  if (!validation.success) return validation.error
  const {
    code,
    name,
    bank_code,
    bank_name,
    account_number,
    is_default,
    account_id,
    is_disbursement_eligible,
  } = validation.data

  // 🔒 設預設時必須限定 workspace_id、否則會清掉全平台所有租戶的預設標記
  if (is_default) {
    await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('workspace_id', workspaceId)
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      code,
      name,
      bank_code,
      bank_name,
      account_number,
      account_id,
      is_default: is_default || false,
      workspace_id: workspaceId,
      is_active: true,
      // 新欄位、Supabase types 還沒 regen、cast 繞過
      ...(is_disbursement_eligible !== undefined
        ? { is_disbursement_eligible }
        : {}),
    } as never)
    .select()
    .single()

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json(data)
})

/**
 * PUT /api/bank-accounts
 * 更新銀行帳戶
 */
export const PUT = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '更新銀行帳戶' })

  const validation = await validateBody(request, upsertBankAccountSchema)
  if (!validation.success) return validation.error
  const {
    id,
    code,
    name,
    bank_code,
    bank_name,
    account_number,
    is_default,
    account_id,
    is_disbursement_eligible,
  } = validation.data

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 🔒 設預設時必須限定 workspace_id、否則會清掉全平台所有租戶的預設標記
  if (is_default) {
    await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('workspace_id', workspaceId)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .update({
      code,
      name,
      bank_code,
      bank_name,
      account_number,
      account_id,
      is_default,
      ...(is_disbursement_eligible !== undefined
        ? { is_disbursement_eligible }
        : {}),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json(data)
})

/**
 * DELETE /api/bank-accounts?id=xxx
 * 刪除銀行帳戶
 */
export const DELETE = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '刪除銀行帳戶', requestId: id })

  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ success: true })
})
