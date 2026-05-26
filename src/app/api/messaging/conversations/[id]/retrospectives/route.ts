/**
 * GET /api/messaging/conversations/[id]/retrospectives
 *
 * 列某對話的全部復盤歷史（時間倒序、最新在上）。
 * 守 ai_hub.read。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params

    const supabase = await createApiClient()
    const query = supabase
      .from('conversation_retrospectives')
      .select(
        'id, summary_text, notes, status, conversation_type, message_count_at_generation, generated_by, created_at, updated_at'
      )
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
    const { data, error } = await filterActive(query)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logger.error('GET retrospectives history error', { error })
      return ApiError.internal('讀取復盤歷史失敗')
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    logger.error('GET retrospectives history exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
