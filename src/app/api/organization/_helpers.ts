/**
 * 三維（brands / branches / departments）共用 API helpers
 * onboarding fix pack 2026-05-10
 *
 * 三張表 schema 結構幾乎一樣（code / name / is_default / is_active / display_order）
 * 用一個 generic helper 避免 3 倍 boilerplate
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

export type DimensionTable = 'brands' | 'branches' | 'departments'

export const dimensionRowSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().int().optional(),
  // 只有 departments 用、必須掛在某個 branch 底下（2026-05-14 schema 加 NOT NULL）
  // brands / branches 沒這欄、忽略即可
  branch_id: z.string().uuid().optional(),
})

export type DimensionRow = z.infer<typeof dimensionRowSchema>

// 三維表（brands / branches / departments）是 onboarding fix pack 2026-05-10 新加
// Supabase Database type 還沒 regenerate、所以查詢時 cast supabase client 為 any
// 等 migration 跑完跑 `supabase gen types` 即可拔掉 cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function listDimension(table: DimensionTable) {
  const guard = await requireCapability(CAPABILITIES.SETTINGS_READ_COMPANY)
  if (!guard.ok) return guard.response

  const supabase = getSupabaseAdminClient() as unknown as AnyClient
  const { data, error } = await supabase
    .from(table)
    .select('id, code, name, is_default, is_active, display_order, created_at, updated_at')
    .eq('workspace_id', guard.workspaceId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logger.error(`[organization/${table}] list error:`, error)
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
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
    return NextResponse.json(
      { error: '輸入資料格式錯誤、請檢查必填欄位' },
      { status: 400 }
    )
  }

  // departments 必須掛在某個 branch 底下、強制驗證
  if (table === 'departments' && !parsed.data.branch_id) {
    return NextResponse.json(
      { error: '新增部門必須選擇所屬分公司（branch_id）' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdminClient() as unknown as AnyClient
  const insertPayload: Record<string, unknown> = {
    workspace_id: guard.workspaceId,
    code: parsed.data.code.trim().toUpperCase(),
    name: parsed.data.name.trim(),
    is_default: parsed.data.is_default ?? false,
    is_active: parsed.data.is_active ?? true,
    display_order: parsed.data.display_order ?? 0,
  }
  if (table === 'departments') {
    insertPayload.branch_id = parsed.data.branch_id
  }

  const { data, error } = await supabase
    .from(table)
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    logger.error(`[organization/${table}] create error:`, error)
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
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
    return NextResponse.json(
      { error: '輸入資料格式錯誤、請檢查必填欄位' },
      { status: 400 }
    )
  }
  if (!parsed.data.id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient() as unknown as AnyClient

  // 設 default 時、清掉同 workspace 其他 default（保留 partial unique 不衝突）
  if (parsed.data.is_default) {
    await supabase
      .from(table)
      .update({ is_default: false })
      .eq('workspace_id', guard.workspaceId)
      .neq('id', parsed.data.id)
  }

  // departments 改 branch 也要更新（業務上允許「部門搬家到另一家分公司」、但要謹慎）
  const updatePayload: Record<string, unknown> = {
    code: parsed.data.code.trim().toUpperCase(),
    name: parsed.data.name.trim(),
    is_default: parsed.data.is_default,
    is_active: parsed.data.is_active,
    display_order: parsed.data.display_order,
    updated_at: new Date().toISOString(),
  }
  if (table === 'departments' && parsed.data.branch_id) {
    updatePayload.branch_id = parsed.data.branch_id
  }

  const { data, error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('id', parsed.data.id)
    .eq('workspace_id', guard.workspaceId)
    .select()
    .single()

  if (error) {
    logger.error(`[organization/${table}] update error:`, error)
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
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

  const supabase = getSupabaseAdminClient() as unknown as AnyClient

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
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
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
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ success: true })
}
