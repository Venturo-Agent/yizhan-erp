/**
 * POST /api/line/conversations/[lineUserId]/pause
 * 切換某 LINE 客戶的 bot 暫停狀態（agent 接手 / 恢復 bot）。
 *
 * Body: { paused: boolean, notes?: string }
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
    reason: '切換 LINE bot 暫停狀態',
    requestId: lineUserId,
  })

  let body: { paused?: boolean; notes?: string }
  try {
    body = (await req.json()) as { paused?: boolean; notes?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const paused = !!body.paused
  const notes = body.notes ?? null

  const supabase = getSupabaseAdminClient()

  // line_conversation_overrides 尚未納入生成類型，用 unknown 中轉
  const supabaseAny = supabase as unknown as SupabaseClient
  const { error } = await supabaseAny
    .from('line_conversation_overrides')
    .upsert(
      {
        workspace_id: guard.workspaceId,
        line_user_id: lineUserId,
        bot_paused: paused,
        paused_by: paused ? guard.employeeId : null,
        paused_at: paused ? new Date().toISOString() : null,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,line_user_id' }
    )

  if (error) {
    logger.error('[pause] upsert error:', error)
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ ok: true, paused })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineUserId: string }> }
) {
  const { lineUserId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
  if (!guard.ok) return guard.response

  const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
  if (!feature.ok) return feature.response

  // line_conversation_overrides 尚未納入生成類型，用 unknown 中轉
  const supabaseAny = getSupabaseAdminClient() as unknown as SupabaseClient
  const { data } = await supabaseAny
    .from('line_conversation_overrides')
    .select('bot_paused, paused_at, notes')
    .eq('workspace_id', guard.workspaceId)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  return NextResponse.json({ paused: data?.bot_paused ?? false, paused_at: data?.paused_at, notes: data?.notes })
}
