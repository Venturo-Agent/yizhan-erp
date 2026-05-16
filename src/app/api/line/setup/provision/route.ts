/**
 * POST /api/line/setup/provision
 *
 * Setup Wizard StepProvisioning 階段呼叫、跑完整 setup pipeline：
 *   1. 再次驗證 token（避免 race）
 *   2. 建 / 找 BOT employee
 *   3. upsert workspace_line_settings
 *   4. 回 webhook URL 給 UI 顯示
 *
 * 守門同 validate-credentials。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { provisionLineBot } from '@/lib/line/setup-pipeline'
import { logger } from '@/lib/utils/logger'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

const schema = z.object({
  channel_id: z.string().min(1, '請填 channel_id（LINE OA destination ID）'),
  channel_access_token: z.string().min(1),
  channel_secret: z.string().min(1),
  bot_greeting: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return ApiError.unauthorized('請先登入')
    }

    // 🔒 capability 守門：必須有 line_bot.config（管 LINE OA 串接設定）
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: 'provision LINE Bot',
    })

    const supabase = getSupabaseAdminClient()
    const { data: feature } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('feature_code', 'line_bot')
      .maybeSingle()

    if (!feature?.enabled) {
      return ApiError.forbidden('此 workspace 尚未開通 LINE Bot 整合')
    }

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const result = await provisionLineBot({
      workspaceId: auth.data.workspaceId,
      channelId: validation.data.channel_id,
      channelAccessToken: validation.data.channel_access_token,
      channelSecret: validation.data.channel_secret,
      botGreeting: validation.data.bot_greeting,
    })

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: result.webhookUrl,
        botUserId: result.botUserId,
        botDisplayName: result.botDisplayName,
        botEmployeeId: result.botEmployeeId,
      },
    })
  } catch (error) {
    logger.error('LINE provision error', { error })
    return ApiError.internal('系統錯誤')
  }
}
