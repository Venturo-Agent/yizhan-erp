/**
 * POST /api/messaging/conversations/[id]/reply
 *
 * Agent 從 /messaging UI 手動回客戶。
 *
 * 守 ai_hub.write capability。
 * channel routing 走 src/lib/messaging/send-reply.ts、發送後自動寫 outbound message。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { sendAgentReply } from '@/lib/messaging/send-reply'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'

const schema = z.object({
  text: z.string().min(1).max(5000),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: '發送 AI Hub 對話回覆',
    })

    const result = await sendAgentReply({
      conversationId,
      workspaceId,
      text: validation.data.text,
      senderEmployeeId: guard.employeeId,
    })

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({ success: true, data: { messageId: result.messageId } })
  } catch (error) {
    logger.error('POST reply error', { error })
    return ApiError.internal('系統錯誤')
  }
}
