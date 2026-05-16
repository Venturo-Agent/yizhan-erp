/**
 * POST /api/channels/dm
 *
 * 5/13 William 拍板：sidebar「同事」section 點員工 → 找 / 建 1on1 DM channel。
 *
 * 為什麼走 API 而不是 client supabase：
 *   channels_insert RLS policy 在 manual SQL 模擬下持續 reject、即使
 *   `WITH CHECK (true)` 也擋（疑似 Supabase auth.uid() 在 RLS context
 *   評估的 quirk）、繞不過。改用 server API + service_role admin client。
 *
 * 守門：
 *   - require capability: channels.write（看訊息標配、能發 = 能建）
 *   - 確認 peer 在同 workspace 且 status='active'
 *   - 已有 DM → 回現有 channel id（idempotent）
 *   - 沒有 → 建 channel + 2 channel_members、回 new id
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

// supabase types.ts 沒同步 channels / channel_members 表（5/13 待 regen）、
// 暫用 from 取出後 any cast、避免擋 build。Regen 後可移除 any。

export const POST = apiHandler(async (req: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.CHANNELS_WRITE)
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => ({}))
  const peerEmployeeId = (body as { peer_employee_id?: string }).peer_employee_id

  if (!peerEmployeeId || typeof peerEmployeeId !== 'string') {
    return NextResponse.json({ error: '需要 peer_employee_id' }, { status: 400 })
  }
  if (peerEmployeeId === guard.employeeId) {
    return NextResponse.json({ error: '不能跟自己開私訊' }, { status: 400 })
  }

  // channels / channel_members 尚未納入生成類型，用 unknown 中轉
  const client = getSupabaseAdminClient() as unknown as SupabaseClient

  // 確認 peer 在同 workspace + active
  const { data: peer, error: peerErr } = await client
    .from('employees')
    .select('id, workspace_id, status, employee_type')
    .eq('id', peerEmployeeId)
    .maybeSingle()

  if (peerErr) return dbErrorResponse(peerErr)
  if (!peer || peer.workspace_id !== guard.workspaceId || peer.status !== 'active') {
    return NextResponse.json({ error: '找不到該員工' }, { status: 404 })
  }

  // 找現有 DM：me + peer 都是 member、type='dm'、無 agent
  // 用 admin client（繞 RLS）查
  const { data: myDmRows } = await client
    .from('channel_members')
    .select('channel_id')
    .eq('employee_id', guard.employeeId)
  const myDmChannelIds = (myDmRows || []).map((r: { channel_id: string }) => r.channel_id)

  if (myDmChannelIds.length > 0) {
    const { data: existingChannels } = await client
      .from('channels')
      .select('id, type, agent_id, is_archived')
      .in('id', myDmChannelIds)
      .eq('type', 'dm')
      .eq('workspace_id', guard.workspaceId)
      .is('agent_id', null)
      .eq('is_archived', false)

    if (existingChannels && existingChannels.length > 0) {
      const candidateIds = existingChannels.map((c: { id: string }) => c.id)
      const { data: peerInThese } = await client
        .from('channel_members')
        .select('channel_id')
        .eq('employee_id', peerEmployeeId)
        .in('channel_id', candidateIds)

      const matched = (peerInThese || [])[0]
      if (matched) {
        return NextResponse.json({ channel_id: matched.channel_id, created: false })
      }
    }
  }

  // 沒既有 DM、建新的
  await recordApiAuditContext(client, {
    actorId: guard.employeeId,
    reason: '發送私訊',
    requestId: peerEmployeeId,
  })

  const { data: newChannel, error: createErr } = await client
    .from('channels')
    .insert({
      workspace_id: guard.workspaceId,
      type: 'dm',
      name: null,
      created_by: guard.employeeId,
      is_system: false,
      is_official: false,
      post_permission: 'all',
    })
    .select('id')
    .single()

  if (createErr || !newChannel) return dbErrorResponse(createErr ?? new Error('建 channel 失敗'))

  // 兩個 member（me owner + peer member）
  const { error: memberErr } = await client.from('channel_members').insert([
    { channel_id: newChannel.id, employee_id: guard.employeeId, role: 'owner' },
    { channel_id: newChannel.id, employee_id: peerEmployeeId, role: 'member' },
  ])

  if (memberErr) {
    // 回滾：砍掉 channel 避免孤兒
    await client.from('channels').delete().eq('id', newChannel.id)
    return dbErrorResponse(memberErr)
  }

  return NextResponse.json({ channel_id: newChannel.id, created: true })
})
