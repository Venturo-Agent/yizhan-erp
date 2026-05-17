/**
 * GET /api/messaging/conversations/[id]/messages
 *
 * 拉一個對話 thread 的訊息列表（時間正序、預設最多 200 則）。
 * 5/14 簡化：所有 channel 的訊息走 inbox_messages、不再有 LINE synthetic 路徑。
 *
 * 路由：
 *   - id = UUID（inbox_conversations.id）→ inbox_messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import type { SupabaseTableName } from '@/lib/supabase/typed-client'

interface MessageRow {
  id: number
  conversation_id: string
  workspace_id: string
  direction: 'inbound' | 'outbound'
  sender_type: 'contact' | 'agent' | 'ai_agent' | 'system'
  sender_employee_id: string | null
  message_type: string
  content: string | null
  media_url: string | null
  source_id: string | null
  created_at: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params
    if (!conversationId) {
      return NextResponse.json({ error: 'missing conversation id' }, { status: 400 })
    }

    const supabase = await createApiClient()

    // inbox_messages 尚未納入生成類型，用 unknown 中轉
    const msgTable = supabase.from('inbox_messages' as unknown as SupabaseTableName)

    const { data, error } = await msgTable
      .select(
        'id, conversation_id, workspace_id, direction, sender_type, sender_employee_id, message_type, content, media_url, source_id, created_at'
      )
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      logger.error('GET messages error', { error })
      return dbErrorResponse(error)
    }

    return NextResponse.json({ data: (data ?? []) as MessageRow[] })
  } catch (error) {
    logger.error('GET messages exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
