/**
 * POST /api/messaging/conversations/[id]/memory/regenerate
 *
 * 手動觸發速記卡重生（重新跑 LLM 摘要）。
 *
 * 用途：
 *   - 業務看 AI 寫的速記卡覺得有偏差、按按鈕讓 AI 重看一次
 *   - 連續失敗 3 次暫停的對話、清失敗計數後可重試
 *
 * 守 ai_hub.write capability。
 * 同步等 LLM 跑完才回（不像 webhook fire-and-forget、UI 要顯示「重生成功」）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { generateMemorySummary } from '@/lib/ai/memory-summarizer'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const { id: conversationId } = await params

    // 重置 failed_attempts（手動觸發、給連續失敗暫停的卡一個重試機會）
    const adminClient = getSupabaseAdminClient() as unknown as SupabaseClient
    await adminClient
      .from('customer_memories')
      .update({
        failed_attempts: 0,
        last_error: null,
        updated_by: guard.employeeId ?? null,
      })
      .eq('conversation_id', conversationId)
      .eq('workspace_id', guard.workspaceId)

    // 同步等 LLM 完、回結果給 UI
    const result = await generateMemorySummary({
      conversationId,
      workspaceId: guard.workspaceId,
    })

    if (!result.ok) {
      logger.warn('regenerate memory failed', {
        conversationId,
        reason: result.reason,
        error: result.error,
      })
      return NextResponse.json(
        {
          success: false,
          reason: result.reason,
          error: result.error || '重生失敗、請稍後再試',
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('regenerate memory exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
