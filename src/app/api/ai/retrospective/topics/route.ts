/**
 * GET /api/ai/retrospective/topics
 *
 * 列 workspace 的 rag_topic_queue（依 occurrence_count 降序、status filter）
 *
 * Query params:
 *   - status: 'pending' | 'added_to_rag' | 'declined' | 'all'（預設 pending）
 *   - run: uuid （只看某一次 run 的、預設不過濾）
 *
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

export async function GET(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const status = request.nextUrl.searchParams.get('status') ?? 'pending'
    const runId = request.nextUrl.searchParams.get('run')

    const supabase = await createApiClient()
    let query = supabase
      .from('rag_topic_queue')
      .select(
        'id, topic_summary, occurrence_count, example_conversation_ids, example_questions, status, notes, generated_run_id, generated_at, created_at, updated_at'
      )
      .eq('workspace_id', workspaceId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (runId) {
      query = query.eq('generated_run_id', runId)
    }

    const { data, error } = await filterActive(query)
      .order('occurrence_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      logger.error('GET retrospective topics error', { error })
      return ApiError.internal('讀取主題清單失敗')
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    logger.error('GET retrospective topics exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
