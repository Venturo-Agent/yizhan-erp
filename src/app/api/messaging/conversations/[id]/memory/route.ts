/**
 * GET    /api/messaging/conversations/[id]/memory — 讀客戶速記卡
 * PATCH  /api/messaging/conversations/[id]/memory — 手動編輯 memory_json
 * DELETE /api/messaging/conversations/[id]/memory — 軟刪除（重置）
 *
 * 守 ai_hub.read (GET) / ai_hub.write (PATCH/DELETE)。
 *
 * 設計：
 *   - GET 直接回 memory_json + meta（last_summarized_at / failed_attempts / last_error）
 *   - PATCH 全替換 memory_json（caller 傳完整 object）、updated_by 記為當前員工
 *   - DELETE 走 softDelete helper、failed_attempts 不重設（下次 regenerate 才重置）
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { filterActive } from '@/lib/data/filter-active'
import { softDelete } from '@/lib/data/soft-delete'
import { logger } from '@/lib/utils/logger'
import type { SupabaseTableName } from '@/lib/supabase/typed-client'
import type { MemoryJson } from '@/lib/ai/memory-summarizer'

// PATCH schema — 整段 memory_json 替換、不做欄位級驗證（業務員手動編輯時保留彈性）
const patchSchema = z.object({
  memory_json: z.record(z.string(), z.unknown()),
})

interface MemoryRow {
  id: string
  memory_json: MemoryJson | null
  last_summarized_message_count: number
  last_summarized_at: string | null
  failed_attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

const TABLE = 'customer_memories' as unknown as SupabaseTableName

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params

    const supabase = await createApiClient()
    const baseQuery = supabase
      .from(TABLE)
      .select(
        'id, memory_json, last_summarized_message_count, last_summarized_at, failed_attempts, last_error, created_at, updated_at'
      )
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
    const { data, error } = await filterActive(baseQuery).maybeSingle<MemoryRow>()

    if (error) {
      logger.error('GET memory error', { error })
      return ApiError.internal('讀取速記卡失敗')
    }

    return NextResponse.json({ data: data ?? null })
  } catch (error) {
    logger.error('GET memory exception', { error })
    return ApiError.internal('系統錯誤')
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params

    const validation = await validateBody(request, patchSchema)
    if (!validation.success) return validation.error

    const supabase = await createApiClient()

    // upsert：沒卡建一張、有卡就更新
    const { error } = await supabase.from(TABLE).upsert(
      {
        workspace_id: workspaceId,
        conversation_id: conversationId,
        memory_json: validation.data.memory_json,
        updated_by: guard.employeeId ?? undefined,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'conversation_id' }
    )

    if (error) {
      logger.error('PATCH memory error', { error })
      return ApiError.internal('儲存速記卡失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PATCH memory exception', { error })
    return ApiError.internal('系統錯誤')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params

    const supabase = await createApiClient()

    // 先查 row id（softDelete helper 走 PK、不接 conversation_id）
    const lookup = await filterActive(
      supabase
        .from(TABLE)
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('workspace_id', workspaceId)
    ).maybeSingle<{ id: string }>()

    if (lookup.error || !lookup.data) {
      // 沒卡 = 已是 clean state、視為成功
      return NextResponse.json({ success: true })
    }

    if (!guard.employeeId) return ApiError.unauthorized('員工身分缺')

    const result = await softDelete(
      supabase as unknown as Parameters<typeof softDelete>[0],
      { workspaceId, actorId: guard.employeeId },
      { table: 'customer_memories', id: lookup.data.id, reason: '速記卡手動清空' }
    )

    if (!result.ok) {
      logger.error('DELETE memory error', { error: result.error })
      return ApiError.internal('刪除速記卡失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('DELETE memory exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
