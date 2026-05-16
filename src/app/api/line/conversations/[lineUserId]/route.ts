/**
 * GET /api/line/conversations/[lineUserId]
 *
 * 取得某 LINE 用戶的完整訊息流（時間正序）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { dbErrorResponse } from '@/lib/db-error-translate'

export interface ConversationMessage {
  id: number
  line_user_id: string
  direction: 'inbound' | 'outbound'
  sender: 'customer' | 'bot' | 'agent'
  message_type: string
  content: string | null
  created_at: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineUserId: string }> }
) {
  try {
    const { lineUserId } = await params

    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
    if (!feature.ok) return feature.response

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('line_conversation_messages')
      .select('id, line_user_id, direction, sender, message_type, content, created_at')
      .eq('workspace_id', guard.workspaceId)
      .eq('line_user_id', lineUserId)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) {
      logger.error(`[/api/line/conversations/${lineUserId}] error:`, error)
      return dbErrorResponse(error)
    }

    return NextResponse.json({ messages: data ?? [] })
  } catch (error) {
    logger.error('API Error', { path: _req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
