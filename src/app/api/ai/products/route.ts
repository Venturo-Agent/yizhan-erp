import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'

/**
 * /api/ai/products — 客戶在 AI Hub 自助上架的商品
 *
 * 讀取走 entity hook（useAiProducts、client 直連 + RLS）、這裡只做寫入。
 * POST = 新增一筆商品。
 *
 * 守門：requireCapability(AI_HUB_WRITE)（紅線 0：走 capability、不寫死角色）。
 * 隔離：admin client 繞 RLS、靠 requireCapability 給的 workspaceId 寫死 workspace_id（紅線 H/C）。
 * 稽核：created_by / updated_by 填 employeeId（紅線 B）、recordApiAuditContext。
 */

const CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'CNY', 'HKD'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const productSchema = z.object({
  name: z.string().trim().min(1, '商品名稱必填').max(200),
  contents: z.string().trim().max(2000).nullish(),
  price: z.number().min(0, '價格不能為負').nullish(),
  currency: z.enum(CURRENCIES).default('TWD'),
  description: z.string().trim().max(4000).nullish(),
  valid_from: z.string().regex(DATE_RE, '日期格式須為 YYYY-MM-DD').nullish(),
  valid_to: z.string().regex(DATE_RE, '日期格式須為 YYYY-MM-DD').nullish(),
  validity_note: z.string().trim().max(500).nullish(),
  is_published: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
  if (!guard.ok) return guard.response

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '欄位驗證失敗' },
      { status: 400 }
    )
  }

  // 販賣期間：結束日不能早於開始日（DB 也有 CHECK、這裡先給友善訊息）
  const { valid_from, valid_to } = parsed.data
  if (valid_from && valid_to && valid_to < valid_from) {
    return NextResponse.json({ error: '販賣結束日不能早於開始日' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '新增 AI 商品' })

  const { data, error } = await supabase
    .from('ai_products')
    .insert({
      ...parsed.data,
      workspace_id: guard.workspaceId,
      created_by: guard.employeeId,
      updated_by: guard.employeeId,
    })
    .select()
    .single()

  if (error) return dbErrorResponse(error)
  return NextResponse.json(data, { status: 201 })
}
