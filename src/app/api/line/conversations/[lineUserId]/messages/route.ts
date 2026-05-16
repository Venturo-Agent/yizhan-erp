/**
 * POST /api/line/conversations/[lineUserId]/messages
 *
 * agent 主動發訊息給 LINE 客戶（介入接管 bot）。
 * 走 LINE Push API（沒 reply token、隨時送）。
 *
 * 動作：
 *   1. requireCapability(CAPABILITIES.AI_HUB_WRITE)
 *   2. 取 caller workspace 的 channel_access_token
 *   3. push 訊息到 LINE
 *   4. 寫一筆 line_conversation_messages（direction=outbound, sender=agent）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { pushToLine } from '@/lib/line/reply-client'
import { logger } from '@/lib/utils/logger'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

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
    reason: 'agent 主動發 LINE 訊息',
    requestId: lineUserId,
  })

  let body: { text?: string }
  try {
    body = (await req.json()) as { text?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text = (body.text || '').trim()
  if (!text) {
    return NextResponse.json({ error: '訊息內容不能為空' }, { status: 400 })
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: '訊息長度超過 5000 字' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()

  // 取 workspace 的 LINE channel access token
  const { data: settings, error: settingsError } = await supabase
    .from('workspace_line_settings')
    .select('channel_access_token, is_active')
    .eq('workspace_id', guard.workspaceId)
    .maybeSingle()

  if (settingsError || !settings) {
    logger.error('[push] no workspace_line_settings:', settingsError)
    return NextResponse.json({ error: '此 workspace 尚未開通 LINE Bot' }, { status: 400 })
  }
  if (!settings.is_active) {
    return NextResponse.json({ error: 'LINE Bot 未啟用' }, { status: 400 })
  }

  // push 到 LINE
  const result = await pushToLine({
    to: lineUserId,
    messages: [{ type: 'text', text }],
    channelAccessToken: settings.channel_access_token,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: `LINE 發送失敗：${result.error || result.status}` },
      { status: 502 }
    )
  }

  // 寫 line_conversation_messages（agent 發的訊息）
  const { error: insertError } = await supabase
    .from('line_conversation_messages')
    .insert({
      workspace_id: guard.workspaceId,
      line_user_id: lineUserId,
      direction: 'outbound',
      sender: 'agent',
      message_type: 'text',
      content: text,
    })

  if (insertError) {
    logger.warn('[push] sent ok but insert log failed:', insertError)
    // 不阻擋成功 response、push 已送出
  }

  return NextResponse.json({ ok: true })
}
