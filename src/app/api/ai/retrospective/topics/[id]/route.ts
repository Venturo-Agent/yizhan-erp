/**
 * PATCH /api/ai/retrospective/topics/[id]
 *
 * 更新主題狀態 / 補充說明（業務 review 後標 added_to_rag / declined）。
 *
 * 守 ai_hub.write。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'

const patchSchema = z.object({
  status: z.enum(['pending', 'added_to_rag', 'declined']).optional(),
  notes: z.string().max(2000).optional().nullable(),
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

    const validation = await validateBody(request, patchSchema)
    if (!validation.success) return validation.error

    const update: Record<string, unknown> = {
      updated_by: guard.employeeId ?? undefined,
      updated_at: new Date().toISOString(),
    }
    if (validation.data.status !== undefined) update.status = validation.data.status
    if (validation.data.notes !== undefined) update.notes = validation.data.notes

    const supabase = await createApiClient()
    const { error } = await supabase
      .from('rag_topic_queue')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      logger.error('PATCH retrospective topic error', { error })
      return ApiError.internal('更新失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PATCH retrospective topic exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
