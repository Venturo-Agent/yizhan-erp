/**
 * PATCH /api/ai/training-queue/[id]
 *
 * 業務 review 標：
 *   - status='trained'    → 已補進 KB / 已訓練、AI 下次應該答得出來
 *   - status='declined'   → 不採納（垃圾訊息 / 不該答 / 不在業務範圍）
 *   - status='duplicated' → 跟既有主題重複、合併（前端可用做 dedup）
 *   - notes               → 業務寫補充說明（譬如「已補進景點表的清邁條目」）
 *
 * 守 ai_hub.write。
 * 2026-05-28 William 拍板「白痴起點 + 訓練飛輪」。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'

const patchSchema = z.object({
  status: z.enum(['pending', 'trained', 'declined', 'duplicated']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  topic_hint: z.string().max(200).optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id } = await params
    if (!id) return ApiError.validation('缺少 id 參數')

    const validation = await validateBody(request, patchSchema)
    if (!validation.success) return validation.error

    const supabase = await createApiClient()
    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: 'review AI 知識缺口',
      requestId: id,
    })

    const update: Record<string, unknown> = {}
    if (validation.data.status !== undefined) {
      update.status = validation.data.status
      // 標 trained / declined / duplicated 時、記下是誰標的 + 時間
      if (validation.data.status !== 'pending') {
        update.reviewed_by = guard.employeeId ?? null
        update.reviewed_at = new Date().toISOString()
      } else {
        // 拉回 pending 就清掉 review 記號（譬如標錯要重來）
        update.reviewed_by = null
        update.reviewed_at = null
      }
    }
    if (validation.data.notes !== undefined) update.notes = validation.data.notes
    if (validation.data.topic_hint !== undefined) update.topic_hint = validation.data.topic_hint

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true, noop: true })
    }

    const { error } = await supabase
      .from('ai_knowledge_gaps')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      logger.error('PATCH training-queue error', { error })
      return ApiError.internal('更新失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PATCH training-queue exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
