/**
 * POST /api/channels/messages/[id]/revoke
 *
 * 撤回訊息（軟刪除：is_active=false + revoked_at=now）
 * 走 admin client、繞 client supabase RLS 詭異 bug。
 *
 * 守門：
 *   - require channels.write
 *   - 只能撤回自己發的訊息（server 端強制比對 sender_employee_id）
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const guard = await requireCapability(CAPABILITIES.CHANNELS_WRITE)
    if (!guard.ok) return guard.response

    // channel_messages 尚未納入生成類型，用 unknown 中轉
    const client = getSupabaseAdminClient() as unknown as SupabaseClient

    // 確認該 message 真的是 caller 發的，且 channel 屬於 caller 的 workspace（admin client 繞 RLS，需手動 workspace 隔離）
    const { data: msg } = await client
      .from('channel_messages')
      .select('id, channel_id, sender_employee_id, is_active, channels!inner(workspace_id)')
      .eq('id', id)
      .maybeSingle()

    if (!msg) return NextResponse.json({ error: '訊息不存在' }, { status: 404 })

    // workspace 隔離：確認 channel 屬於 caller 的 workspace（admin client 繞過 RLS、需手動驗證）
    const channelWorkspaceId = (msg as { channels?: { workspace_id?: string } }).channels
      ?.workspace_id
    if (channelWorkspaceId !== guard.workspaceId) {
      return NextResponse.json({ error: '訊息不存在' }, { status: 404 })
    }

    if (msg.sender_employee_id !== guard.employeeId) {
      return NextResponse.json({ error: '只能撤回自己發的訊息' }, { status: 403 })
    }
    if (!msg.is_active) return NextResponse.json({ success: true }) // idempotent

    await recordApiAuditContext(client, {
      actorId: guard.employeeId,
      reason: '撤回頻道訊息',
      requestId: id,
    })

    const { error } = await client
      .from('channel_messages')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return dbErrorResponse(error)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('API Error', { path: _req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
