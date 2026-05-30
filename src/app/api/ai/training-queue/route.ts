/**
 * GET /api/ai/training-queue
 *
 * 列 workspace 的 ai_knowledge_gaps（AI 答不出來的清單、給業務 review 補料用）。
 *
 * Query params:
 *   - status: 'pending' | 'trained' | 'declined' | 'duplicated' | 'all'（預設 pending）
 *
 * 守 ai_hub.read。RLS 走 workspace_scoped。
 * 2026-05-28 William 拍板「白痴起點 + 訓練飛輪」。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
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

    const supabase = await createApiClient()
    let query = supabase
      .from('ai_knowledge_gaps')
      .select(
        'id, conversation_id, external_user_id, customer_name, question_text, topic_hint, ai_response, status, notes, reviewed_by, reviewed_at, created_at, updated_at'
      )
      .eq('workspace_id', workspaceId)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(200)

    if (error) {
      logger.error('GET training-queue error', { error })
      return ApiError.internal('讀取訓練清單失敗')
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    logger.error('GET training-queue exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
