/**
 * PATCH /api/messaging/conversations/[id]
 *
 * 更新對話 thread 狀態：
 *   - bot_paused: agent 接管時暫停 AI 自動回覆
 *   - bot_paused_until: 暫停過期時間（NULL = 永久）
 *   - is_archived: 封存
 *   - customer_id: 綁定 ERP 客戶
 *
 * 守 ai_hub.write capability + workspace 隔離。
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
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

const schema = z
  .object({
    bot_paused: z.boolean().optional(),
    bot_paused_until: z.string().datetime().optional().nullable(),
    is_archived: z.boolean().optional(),
    customer_id: z.string().optional().nullable(),
    /** true = 把 unread_count 歸零（agent 進入對話自動清未讀）*/
    mark_as_read: z.boolean().optional(),
  })
  .refine(d => Object.values(d).some(v => v !== undefined), { message: '至少要更新一個欄位' })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params
    if (!conversationId) {
      return NextResponse.json({ error: 'missing conversation id' }, { status: 400 })
    }

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const supabase = await createApiClient()
    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: 'update inbox conversation',
    })

    // LINE synthetic id：寫到 line_conversation_overrides
    if (conversationId.startsWith('line:')) {
      const lineUserId = conversationId.slice('line:'.length)
      const overrides: Record<string, unknown> = {
        workspace_id: workspaceId,
        line_user_id: lineUserId,
      }
      if (validation.data.bot_paused !== undefined) {
        overrides.bot_paused = validation.data.bot_paused
        overrides.paused_by = guard.employeeId
        overrides.paused_at = new Date().toISOString()
      }
      if (validation.data.bot_paused_until !== undefined) {
        overrides.paused_until = validation.data.bot_paused_until
      }

      const lineOverrideTable = supabase.from as unknown as (
        table: string
      ) => {
        upsert: (
          values: Record<string, unknown>,
          options: { onConflict: string }
        ) => Promise<{ error: { message: string } | null }>
      }
      const { error: lineErr } = await lineOverrideTable('line_conversation_overrides').upsert(
        overrides,
        { onConflict: 'workspace_id,line_user_id' }
      )
      if (lineErr) {
        logger.error('PATCH LINE override failed', { lineErr, conversationId })
        return dbErrorResponse(lineErr)
      }
      return NextResponse.json({ success: true })
    }

    // FB / IG / LINE（走 UUID）：動態組 update payload
    const updates: Record<string, unknown> = {}
    if (validation.data.bot_paused !== undefined) updates.bot_paused = validation.data.bot_paused
    if (validation.data.bot_paused_until !== undefined)
      updates.bot_paused_until = validation.data.bot_paused_until
    if (validation.data.is_archived !== undefined) updates.is_archived = validation.data.is_archived
    if (validation.data.customer_id !== undefined) updates.customer_id = validation.data.customer_id
    // agent 進入對話自動清未讀
    if (validation.data.mark_as_read === true) updates.unread_count = 0

    const convTable = supabase.from as unknown as (
      table: string
    ) => {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, value: string) => {
          eq: (col: string, value: string) => Promise<{
            error: { message: string } | null
          }>
        }
      }
    }

    const { error } = await convTable('inbox_conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)

    if (error) {
      logger.error('PATCH conversation update failed', { error, conversationId })
      return dbErrorResponse(error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PATCH conversation exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
