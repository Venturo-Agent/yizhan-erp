import { NextRequest, NextResponse } from 'next/server'
import { getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError, dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * 2026-05-21 修紅線 H：原 API 從 client query string 吃 workspace_id、且字串拼接 SQL（SQL injection 風險）
 * 修法：workspace_id 走 session getCurrentWorkspaceId()、不信 client
 * 同時 backfill workspace_id 欄位（不再用 user_id 當 workspace 儲位）
 *
 * 2026-05-21 補修：原 application 層 .or() filter 跟 RLS policy 邏輯重複（紅線 H 字面違反、字串拼接）
 * RLS expense_categories_workspace_select 已守「workspace_id IS NULL OR = current」
 * 此處不再 application 層重複、靠 RLS 自己擋
 */

// GET - 取得請款類別列表
export const GET = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_READ_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createSupabaseServerClient()

  const { searchParams } = new URL(request.url)
  // 支援多種 type: expense, company_expense, company_income
  const typeFilter = searchParams.get('type')

  let query = supabase
    .from('expense_categories')
    .select(
      `
      *,
      debit_account:chart_of_accounts!debit_account_id(id, code, name),
      credit_account:chart_of_accounts!credit_account_id(id, code, name)
    `
    )
    .order('sort_order', { ascending: true })

  // 如果有指定 type，只取該類型；否則取所有財務相關類型
  if (typeFilter) {
    query = query.eq('type', typeFilter)
  } else {
    query = query.in('type', ['expense', 'company_expense', 'company_income', 'both'])
  }

  const { data, error } = await query

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data || [])
})

// POST - 新增請款類別
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createSupabaseServerClient()
  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增請款類別' })

  const workspaceId = await getCurrentWorkspaceId()
  const body = await request.json()
  // 2026-05-21：不再從 body 吃 workspace_id、走 session
  const { name, icon, color, sort_order, debit_account_id, credit_account_id, type } = body

  if (!name) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 支援多種類型，預設為 expense
  const categoryType = type || 'expense'
  const validTypes = ['expense', 'company_expense', 'company_income', 'both']
  if (!validTypes.includes(categoryType)) {
    return NextResponse.json({ error: '無效的類型' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name,
      icon: icon || '💰',
      color: color || '#c9aa7c',
      type: categoryType,
      workspace_id: workspaceId, // 2026-05-21：寫真 workspace_id、不再塞 user_id
      is_active: true,
      is_system: false,
      sort_order: sort_order || 100,
      debit_account_id: debit_account_id || null,
      credit_account_id: credit_account_id || null,
    })
    .select(
      `
      *,
      debit_account:chart_of_accounts!debit_account_id(id, code, name),
      credit_account:chart_of_accounts!credit_account_id(id, code, name)
    `
    )
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

// PUT - 更新請款類別
export const PUT = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createSupabaseServerClient()
  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '更新請款類別' })
  const body = await request.json()
  const { id, name, icon, color, is_active, sort_order, debit_account_id, credit_account_id } = body

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // RLS 會擋跨 workspace 更新、不需要在 application 層再 explicit filter
  const { data, error } = await supabase
    .from('expense_categories')
    .update({
      name,
      icon,
      color,
      is_active,
      sort_order,
      debit_account_id: debit_account_id || null,
      credit_account_id: credit_account_id || null,
    })
    .eq('id', id)
    .select(
      `
      *,
      debit_account:chart_of_accounts!debit_account_id(id, code, name),
      credit_account:chart_of_accounts!credit_account_id(id, code, name)
    `
    )
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

// DELETE - 刪除請款類別
export const DELETE = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS)
  if (!guard.ok) return guard.response
  const supabase = await createSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '刪除請款類別',
    requestId: id,
  })

  // 檢查是否為系統預設（不能刪除）
  const { data: category } = await supabase
    .from('expense_categories')
    .select('is_system')
    .eq('id', id)
    .single()

  if (category?.is_system) {
    return NextResponse.json({ error: '系統預設類別無法刪除' }, { status: 400 })
  }

  // RLS 會擋跨 workspace 刪除
  const { error } = await supabase.from('expense_categories').delete().eq('id', id)

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ success: true })
})
