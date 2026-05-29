/**
 * 兩維（brands / branches）共用 API helpers
 * onboarding fix pack 2026-05-10
 *
 * 兩張表 schema 結構幾乎一樣（code / name / is_default / is_active / display_order）
 * 用一個 generic helper 避免 2 倍 boilerplate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

export type DimensionTable = 'brands' | 'branches'

export const dimensionRowSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().int().optional(),
  // 只有 branches 用、8 碼數字（DB CHECK 已建）
  tax_id: z
    .string()
    .regex(/^\d{8}$/)
    .optional(),
})

export type DimensionRow = z.infer<typeof dimensionRowSchema>

export async function listDimension(table: DimensionTable) {
  const guard = await requireCapability(CAPABILITIES.SETTINGS_READ_COMPANY)
  if (!guard.ok) return guard.response

  const supabase = getSupabaseAdminClient()
  const selectCols =
    table === 'branches'
      ? 'id, code, name, type, is_default, is_active, display_order, tax_id, created_at, updated_at'
      : 'id, code, name, is_default, is_active, display_order, created_at, updated_at'
  const { data, error } = await supabase
    .from(table)
    .select(selectCols)
    .eq('workspace_id', guard.workspaceId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logger.error(`[organization/${table}] list error:`, error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
  return NextResponse.json({ data: data ?? [] })
}

export async function createDimension(table: DimensionTable, request: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.SETTINGS_MANAGE_COMPANY)
  if (!guard.ok) return guard.response

  const auth = await getServerAuth()
  if (!auth.success) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: `新增${table}`,
  })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的 JSON' }, { status: 400 })
  }

  const parsed = dimensionRowSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '輸入資料格式錯誤、請檢查必填欄位' }, { status: 400 })
  }

  // branches 必須帶 8 碼統編
  if (table === 'branches' && !parsed.data.tax_id) {
    return NextResponse.json({ error: '新增分公司必須填寫 8 碼統一編號' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const basePayload = {
    workspace_id: guard.workspaceId,
    code: parsed.data.code.trim().toUpperCase(),
    name: parsed.data.name.trim(),
    is_default: parsed.data.is_default ?? false,
    is_active: parsed.data.is_active ?? true,
    display_order: parsed.data.display_order ?? 0,
  }

  const insertResult =
    table === 'branches'
      ? await supabase
          .from('branches')
          .insert({ ...basePayload, tax_id: parsed.data.tax_id! })
          .select()
          .single()
      : await supabase.from('brands').insert(basePayload).select().single()

  const { data, error } = insertResult

  if (error) {
    logger.error(`[organization/${table}] create error:`, error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ data })
}

export async function updateDimension(table: DimensionTable, request: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.SETTINGS_MANAGE_COMPANY)
  if (!guard.ok) return guard.response

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: `更新${table}`,
  })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無效的 JSON' }, { status: 400 })
  }

  const parsed = dimensionRowSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '輸入資料格式錯誤、請檢查必填欄位' }, { status: 400 })
  }
  if (!parsed.data.id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // branches 更新時 tax_id 必填（避免 update 把 NOT NULL 欄位漏掉）
  if (table === 'branches' && !parsed.data.tax_id) {
    return NextResponse.json({ error: '分公司統一編號必填' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()

  // 設 default 時、清掉同 workspace 其他 default（保留 partial unique 不衝突）
  if (parsed.data.is_default) {
    await supabase
      .from(table)
      .update({ is_default: false })
      .eq('workspace_id', guard.workspaceId)
      .neq('id', parsed.data.id)
  }

  const baseUpdate = {
    code: parsed.data.code.trim().toUpperCase(),
    name: parsed.data.name.trim(),
    is_default: parsed.data.is_default,
    is_active: parsed.data.is_active,
    display_order: parsed.data.display_order,
    updated_at: new Date().toISOString(),
  }

  const updateResult =
    table === 'branches'
      ? await supabase
          .from('branches')
          .update({ ...baseUpdate, tax_id: parsed.data.tax_id! })
          .eq('id', parsed.data.id)
          .eq('workspace_id', guard.workspaceId)
          .select()
          .single()
      : await supabase
          .from('brands')
          .update(baseUpdate)
          .eq('id', parsed.data.id)
          .eq('workspace_id', guard.workspaceId)
          .select()
          .single()

  const { data, error } = updateResult

  if (error) {
    logger.error(`[organization/${table}] update error:`, error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ data })
}

export async function deleteDimension(table: DimensionTable, request: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.SETTINGS_MANAGE_COMPANY)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: `刪除${table}`,
    requestId: id,
  })

  const supabase = getSupabaseAdminClient()

  // 不允許刪 default（避免 workspace 沒有任何 default 撐住業務 FK）
  const { data: existing, error: existErr } = await supabase
    .from(table)
    .select('id, is_default')
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)
    .maybeSingle()

  if (existErr) {
    logger.error(`[organization/${table}] check before delete error:`, existErr)
    const t = translateDbError(existErr)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 })
  }
  if (existing.is_default) {
    return NextResponse.json(
      { error: '預設項目不可刪除（請先把另一筆設為預設、再刪此項）' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)

  if (error) {
    logger.error(`[organization/${table}] delete error:`, error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ success: true })
}
