/**
 * GET /api/line/conversations
 *
 * 列出當前 workspace 的 LINE 對話清單（按 line_user_id 分組、附最後一筆訊息）。
 */

import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConversationSummary {
  line_user_id: string
  display_name: string | null
  picture_url: string | null
  customer_id: string | null
  customer_name: string | null
  last_message: string | null
  last_message_at: string
  last_direction: 'inbound' | 'outbound'
  last_sender: 'customer' | 'bot' | 'agent'
  unread_count: number
}

export const GET = apiHandler(async () => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
  if (!guard.ok) return guard.response

  const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
  if (!feature.ok) return feature.response

  const supabase = getSupabaseAdminClient()
  const { data: messageRows, error } = await supabase
    .from('line_conversation_messages')
    .select('line_user_id, content, message_type, direction, sender, created_at')
    .eq('workspace_id', guard.workspaceId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('[/api/line/conversations] query error:', error)
    return dbErrorResponse(error)
  }

  // 按 line_user_id 分組、各取最後一筆
  const byUser = new Map<string, ConversationSummary>()
  for (const row of messageRows ?? []) {
    if (!row.line_user_id) continue
    if (byUser.has(row.line_user_id)) continue
    byUser.set(row.line_user_id, {
      line_user_id: row.line_user_id,
      display_name: null,
      picture_url: null,
      customer_id: null,
      customer_name: null,
      last_message: row.content,
      last_message_at: row.created_at,
      last_direction: row.direction as 'inbound' | 'outbound',
      last_sender: row.sender as 'customer' | 'bot' | 'agent',
      unread_count: 0,
    })
  }

  // 補 line_user_profiles + 綁定的 customers
  const lineUserIds = Array.from(byUser.keys())
  if (lineUserIds.length > 0) {
    // line_user_profiles 尚未納入生成類型，用 unknown 中轉
    const supabaseAny = supabase as unknown as SupabaseClient
    const { data: profiles } = await supabaseAny
      .from('line_user_profiles')
      .select('line_user_id, display_name, picture_url, customer_id, customers(id, name)')
      .eq('workspace_id', guard.workspaceId)
      .in('line_user_id', lineUserIds)

    for (const p of (profiles ?? []) as unknown as Array<{
      line_user_id: string
      display_name: string | null
      picture_url: string | null
      customer_id: string | null
      customers: { id: string; name: string } | null
    }>) {
      const conv = byUser.get(p.line_user_id)
      if (!conv) continue
      conv.display_name = p.display_name
      conv.picture_url = p.picture_url
      conv.customer_id = p.customer_id
      conv.customer_name = p.customers?.name ?? null
    }
  }

  return NextResponse.json({ conversations: Array.from(byUser.values()) })
})
