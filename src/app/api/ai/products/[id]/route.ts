import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'

/**
 * /api/ai/products/[id] — 單筆商品改 / 刪除
 *
 * PATCH  = 更新欄位（含「上架 / 下架」切換 is_published）
 * DELETE = 軟刪（is_active=false、地方法律 #3：軟刪除統一 is_active、不真 DELETE、留紀錄）
 *
 * 守門 requireCapability(AI_HUB_WRITE)、隔離 .eq(workspace_id)（admin client 繞 RLS、應用層守）。
 */

const CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'CNY', 'HKD'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 更新用 schema：全欄位 optional（partial update）、不帶 default
const updateSchema = z.object({
  name: z.string().trim().min(1, '商品名稱必填').max(200).optional(),
  contents: z.string().trim().max(2000).nullish(),
  price: z.number().min(0, '價格不能為負').nullish(),
  currency: z.enum(CURRENCIES).optional(),
  description: z.string().trim().max(4000).nullish(),
  valid_from: z.string().regex(DATE_RE, '日期格式須為 YYYY-MM-DD').nullish(),
  valid_to: z.string().regex(DATE_RE, '日期格式須為 YYYY-MM-DD').nullish(),
  validity_note: z.string().trim().max(500).nullish(),
  is_published: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: '商品代號格式錯誤' }, { status: 400 })
  }

  const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
  if (!guard.ok) return guard.response

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '欄位驗證失敗' },
      { status: 400 }
    )
  }

  // 同時提供起訖日才在這裡比對；只改其一交給 DB CHECK 守（避免漏比現有值）
  const { valid_from, valid_to } = parsed.data
  if (valid_from && valid_to && valid_to < valid_from) {
    return NextResponse.json({ error: '販賣結束日不能早於開始日' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '更新 AI 商品',
    requestId: id,
  })

  const { data, error } = await supabase
    .from('ai_products')
    .update({ ...parsed.data, updated_by: guard.employeeId })
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId) // 跨租戶守門（admin client 繞 RLS）
    .eq('is_active', true) // 已刪的不能改
    .select()
    .maybeSingle()

  if (error) return dbErrorResponse(error)
  if (!data) return NextResponse.json({ error: '商品不存在或已刪除' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: '商品代號格式錯誤' }, { status: 400 })
  }

  const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
  if (!guard.ok) return guard.response

  const supabase = getSupabaseAdminClient()
  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '刪除 AI 商品',
    requestId: id,
  })

  // 軟刪：is_active=false（地方法律 #3、不真 DELETE）
  const { data, error } = await supabase
    .from('ai_products')
    .update({ is_active: false, updated_by: guard.employeeId })
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)
    .eq('is_active', true)
    .select()
    .maybeSingle()

  if (error) return dbErrorResponse(error)
  if (!data) return NextResponse.json({ error: '商品不存在或已刪除' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
