import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { getServerAuth } from '@/lib/auth/server-auth'
import { hasCapabilityByCode } from '@/app/api/lib/check-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { createPaymentMethodSchema, updatePaymentMethodSchema } from '@/lib/validations/api-schemas'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * GET /api/finance/payment-methods
 * 取得收款/付款方式列表
 *
 * Query params:
 * - type: 'receipt' | 'payment' （選填）
 *
 * 5/15 fix：原本守 FINANCE_READ_SETTINGS、但「業務」role 沒這個 cap、請款表單拉付款方式 401 → 下拉空。
 * 改成「任一 finance.read.* cap 即可」（這是 reference data 查詢、不是設定管理）。
 * 寫入 (POST/PUT/DELETE) 仍守 FINANCE_MANAGE_SETTINGS。
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }
  // OR-gate：任一 finance.read 權限就放行（請款 / 收款 / 設定 / payments / requests 都會讀此 dropdown）
  const allowed =
    (await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.FINANCE_READ_SETTINGS)) ||
    (await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.FINANCE_READ_PAYMENTS)) ||
    (await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.FINANCE_READ_REQUESTS))
  if (!allowed) {
    return NextResponse.json({ error: '沒有財務讀取權限' }, { status: 403 })
  }
  const supabase = await createApiClient()
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') // 'receipt' | 'payment'
  const includeInactive = searchParams.get('include_inactive') === 'true'

  // 明確用 workspace_id 過濾（擁有平台管理資格時 RLS 會放行全部、所以不能只靠 RLS）
  const workspaceId = await getCurrentWorkspaceIdServer()
  let query = supabase
    .from('payment_methods')
    .select(
      `id, name, code, type, description, placeholder, is_active, is_system, sort_order,
       workspace_id, created_at, updated_at, is_customer_visible,
       debit_account_id, credit_account_id,
       fee_percent, fee_fixed, fee_account_id, kind, provider,
       debit_account:chart_of_accounts!debit_account_id(id, code, name),
       credit_account:chart_of_accounts!credit_account_id(id, code, name),
       fee_account:chart_of_accounts!fee_account_id(id, code, name)`
    )
    .order('sort_order')

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data)
})

/**
 * POST /api/finance/payment-methods
 * 新增收款/付款方式
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceIdServer()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增付款方式' })

  // 🔒 zod whitelist：防 attacker 透過 spread body 改 is_system / workspace_id 等敏感欄位
  const validation = await validateBody(request, createPaymentMethodSchema)
  if (!validation.success) return validation.error

  const { data, error } = await supabase
    .from('payment_methods')
    .insert({ ...validation.data, workspace_id: workspaceId })
    .select()
    .single()

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data)
})

/**
 * PUT /api/finance/payment-methods
 * 更新收款/付款方式
 */
export const PUT = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()

  // 🔒 zod whitelist：防止 attacker 透過 spread body 改 is_system / workspace_id
  const validation = await validateBody(request, updatePaymentMethodSchema)
  if (!validation.success) return validation.error
  const { id, ...updates } = validation.data

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '更新付款方式',
    requestId: id,
  })

  // RLS 會確保只能更新自己租戶的資料；workspace_id 不在 schema 裡、無法被改
  const { data, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data)
})

/**
 * DELETE /api/finance/payment-methods
 * 真刪除（hard delete）。停用走 PUT is_active=false、不再用此端點軟刪。
 *
 * FK 行為：
 *   - receipts.payment_method_id ON DELETE RESTRICT → 已被收款用過會被擋
 *   - payment_request_items.payment_method_id ON DELETE SET NULL
 * 受 RESTRICT 擋下時回 409 + 中文訊息、引導 user 改用「停用」
 */
export const DELETE = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createApiClient()
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '刪除付款方式',
    requestId: id,
  })

  const { error } = await supabase.from('payment_methods').delete().eq('id', id)

  if (error) {
    // 23503 = foreign_key_violation（已被 receipts 引用）
    if (error.code === '23503') {
      return NextResponse.json(
        { error: '此方式已被歷史收款紀錄使用、無法刪除。請改用「停用」隱藏。' },
        { status: 409 }
      )
    }
    return dbErrorResponse(error)
  }

  return NextResponse.json({ success: true })
})
