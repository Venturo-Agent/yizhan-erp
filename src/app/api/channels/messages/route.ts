/**
 * POST /api/channels/messages
 *
 * 5/14：channel_messages INSERT 走 server admin client、繞 client supabase RLS 詭異 bug
 * （SQL 模擬可、client supabase 失敗、原因不明）
 *
 * 守門：
 *   - require capability: channels.write
 *   - sender_employee_id 服務端強制設為 guard.employeeId（client 不能偽冒）
 *   - DB trigger check_channel_post_permission 仍會跑（公告守門、reply 放行）
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { tryHappyReply } from '@/lib/channels/happy-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

export const POST = apiHandler(async (req: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.CHANNELS_WRITE)
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => ({}))
  const {
    channel_id,
    body: msgBody,
    message_type = 'text',
    reply_to_id = null,
    recipient_employee_id = null,
  } = body as {
    channel_id?: string
    body?: string
    message_type?: string
    reply_to_id?: string | null
    recipient_employee_id?: string | null
  }

  if (!channel_id || typeof channel_id !== 'string') {
    return NextResponse.json({ error: '需要 channel_id' }, { status: 400 })
  }
  if (!msgBody || typeof msgBody !== 'string' || !msgBody.trim()) {
    return NextResponse.json({ error: '訊息內容不能空' }, { status: 400 })
  }

  // channel_members / channel_messages 尚未納入生成類型，用 unknown 中轉
  const client = getSupabaseAdminClient() as unknown as SupabaseClient

  // 確認該 user 是 channel member，且 channel 屬於 caller 的 workspace（admin client 繞 RLS，需手動 workspace 隔離）
  const { data: memberCheck } = await client
    .from('channel_members')
    .select('id, channels!inner(workspace_id)')
    .eq('channel_id', channel_id)
    .eq('employee_id', guard.employeeId)
    .maybeSingle()

  if (!memberCheck) {
    return NextResponse.json({ error: '你不是該頻道成員' }, { status: 403 })
  }

  // workspace 隔離：確認 channel 屬於 caller 的 workspace（admin client 繞過 RLS、需手動驗證）
  const channelWorkspaceId = (memberCheck as { channels?: { workspace_id?: string } }).channels
    ?.workspace_id
  if (channelWorkspaceId !== guard.workspaceId) {
    return NextResponse.json({ error: '你不是該頻道成員' }, { status: 403 })
  }

  await recordApiAuditContext(client, {
    actorId: guard.employeeId,
    reason: '發送頻道訊息',
    requestId: channel_id,
  })

  const { data: message, error } = await client
    .from('channel_messages')
    .insert({
      channel_id,
      sender_employee_id: guard.employeeId, // 服務端強制、client 不能偽冒
      body: msgBody.trim(),
      message_type,
      reply_to_id,
      recipient_employee_id,
    })
    .select('*')
    .single()

  if (error) return dbErrorResponse(error)

  // HAPPY Bot fire-and-forget：bot channel 自動 LLM 回應、不擋主 response
  // 內部會檢查 channel.type === 'bot' && agent_id、非 bot channel 直接 return
  void tryHappyReply(channel_id)

  return NextResponse.json({ message })
})
