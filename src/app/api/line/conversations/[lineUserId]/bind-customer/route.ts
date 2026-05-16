/**
 * POST /api/line/conversations/[lineUserId]/bind-customer
 *
 * 把 LINE 對話綁定到客戶（或解綁、傳 null）。
 * 寫進 line_user_profiles.customer_id。
 *
 * Body: { customer_id: string | null }
 *   - customer_id 給字串 → 綁定該 customer
 *   - customer_id 給 null → 解綁
 *
 * Capability: line_bot.write
 *
 * 注意：
 *   - 必須在當前 workspace 找到該 line_user_id 的 profile（webhook 會自動 upsert profile）
 *   - 若 profile 不存在、會 upsert 一筆（display_name 留空、後續 webhook 會補）
 *   - customer_id 必須屬於當前 workspace、避免跨 workspace 污染
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lineUserId: string }> }
) {
  const { lineUserId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
  if (!guard.ok) return guard.response

  const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
  if (!feature.ok) return feature.response

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '綁定 LINE 對話到客戶',
    requestId: lineUserId,
  })

  let body: { customer_id?: string | null }
  try {
    body = (await req.json()) as { customer_id?: string | null }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const customerId = body.customer_id ?? null

  // line_user_profiles 尚未納入生成類型，用 unknown 中轉
  const supabaseAny = getSupabaseAdminClient() as unknown as SupabaseClient

  // 若要綁定、先驗證 customer 屬於當前 workspace（避免跨租戶污染）
  if (customerId) {
    const { data: customer, error: customerErr } = await supabaseAny
      .from('customers')
      .select('id, workspace_id')
      .eq('id', customerId)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle()

    if (customerErr) {
      logger.error('[bind-customer] customer lookup error:', customerErr)
      const t = translateDbError(customerErr)
      return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
    }
    if (!customer) {
      return NextResponse.json(
        { error: '找不到該客戶、或客戶不屬於當前 workspace' },
        { status: 404 }
      )
    }
  }

  // upsert line_user_profiles
  const { error } = await supabaseAny.from('line_user_profiles').upsert(
    {
      workspace_id: guard.workspaceId,
      line_user_id: lineUserId,
      customer_id: customerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,line_user_id' }
  )

  if (error) {
    logger.error('[bind-customer] upsert error:', error)
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ ok: true, customer_id: customerId })
}
