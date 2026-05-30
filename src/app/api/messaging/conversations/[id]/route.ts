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
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
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
    /** 手動命名（群組對話改名）*/
    display_name: z.string().max(100).optional().nullable(),
    /** 群組自訂頭像 URL（上傳完後由 client patch）*/
    picture_url: z.string().url().max(2048).optional().nullable(),
    /** true = 把 unread_count 歸零（agent 進入對話自動清未讀）*/
    mark_as_read: z.boolean().optional(),
  })
  .refine(d => Object.values(d).some(v => v !== undefined), { message: '至少要更新一個欄位' })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
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

    // 全 channel（LINE / FB / IG）走 inbox_conversations.id（UUID）：動態組 update payload
    // P4（2026-05-29）：舊 synthetic 'line:' id 分支已退役（讀寫皆走統一 inbox_*）。
    const updates: Record<string, unknown> = {}
    if (validation.data.bot_paused !== undefined) updates.bot_paused = validation.data.bot_paused
    if (validation.data.bot_paused_until !== undefined)
      updates.bot_paused_until = validation.data.bot_paused_until
    if (validation.data.is_archived !== undefined) updates.is_archived = validation.data.is_archived
    if (validation.data.customer_id !== undefined) updates.customer_id = validation.data.customer_id
    if (validation.data.display_name !== undefined)
      updates.display_name = validation.data.display_name
    if (validation.data.picture_url !== undefined) updates.picture_url = validation.data.picture_url
    // agent 進入對話自動清未讀
    if (validation.data.mark_as_read === true) updates.unread_count = 0

    const convTable = supabase.from.bind(supabase) as unknown as (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (
          col: string,
          value: string
        ) => {
          eq: (
            col: string,
            value: string
          ) => Promise<{
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
