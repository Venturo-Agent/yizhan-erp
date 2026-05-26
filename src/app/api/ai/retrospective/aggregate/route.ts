/**
 * POST /api/ai/retrospective/aggregate
 *
 * 觸發「大型復盤」：掃 workspace 全速記卡 unanswered_questions、LLM 聚合、
 * 寫進 rag_topic_queue。
 *
 * 守 ai_hub.write（破壞性操作 — 會寫多筆 row）。
 *
 * 回應同步等 LLM 跑完（可能 5-15 秒）、UI 顯示「跑了幾個主題」。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { aggregateRetrospective } from '@/lib/ai/retrospective-aggregator'
import { logger } from '@/lib/utils/logger'

export async function POST(_request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const result = await aggregateRetrospective(guard.workspaceId, guard.employeeId)

    if (!result.ok) {
      logger.info('retrospective aggregate not-ok', {
        workspaceId: guard.workspaceId,
        reason: result.reason,
        error: result.error,
      })
      return NextResponse.json(
        {
          success: false,
          reason: result.reason,
          error:
            result.reason === 'no_memories'
              ? '尚無速記卡可分析（對話累積 20 則才會自動建立）'
              : result.reason === 'no_unanswered'
                ? '所有速記卡都沒抓到「答不出來」的問題（AI 表現太好？）'
                : (result.error ?? '聚合失敗、請稍後再試'),
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      topicCount: result.topicCount ?? 0,
      runId: result.runId,
    })
  } catch (error) {
    logger.error('POST retrospective aggregate exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
