/**
 * PATCH /api/messaging/conversations/[id]/retrospectives/[retroId]
 *   — 更新復盤的 notes / status
 *
 * DELETE — 軟刪一筆復盤紀錄
 *
 * 守 ai_hub.write。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { softDelete } from '@/lib/data/soft-delete'
import { logger } from '@/lib/utils/logger'

const patchSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'actioned', 'archived']).optional(),
  notes: z.string().max(4000).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; retroId: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId, retroId } = await params
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
      .from('conversation_retrospectives')
      .update(update)
      .eq('id', retroId)
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)

    if (error) {
      logger.error('PATCH retrospective error', { error })
      return ApiError.internal('更新失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PATCH retrospective exception', { error })
    return ApiError.internal('系統錯誤')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; retroId: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    if (!guard.employeeId) return ApiError.unauthorized('員工身分缺')

    const { retroId } = await params
    const supabase = await createApiClient()
    const result = await softDelete(
      supabase as unknown as Parameters<typeof softDelete>[0],
      { workspaceId, actorId: guard.employeeId },
      { table: 'conversation_retrospectives', id: retroId, reason: '業務手動刪除復盤紀錄' }
    )

    if (!result.ok) {
      logger.error('DELETE retrospective error', { error: result.error })
      return ApiError.internal('刪除失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('DELETE retrospective exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
