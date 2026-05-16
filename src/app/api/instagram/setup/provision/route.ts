/**
 * POST /api/instagram/setup/provision
 *
 * Setup Wizard 最後一步、跑 setup pipeline、加密寫 DB、回 webhook URL + verify token。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { provisionInstagramBot } from '@/lib/instagram/setup-pipeline'
import { logger } from '@/lib/utils/logger'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

const schema = z.object({
  page_access_token: z.string().min(1),
  ig_business_account_id: z.string().min(1),
  app_secret: z.string().optional().nullable(),
  bot_greeting: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return ApiError.unauthorized('請先登入')

    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: 'provision Instagram DM Bot',
    })

    const supabase = getSupabaseAdminClient()
    const { data: feature } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('feature_code', 'instagram_bot')
      .maybeSingle()

    if (!feature?.enabled) return ApiError.forbidden('此 workspace 尚未開通 Instagram DM 整合')

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const result = await provisionInstagramBot({
      workspaceId: auth.data.workspaceId,
      pageAccessToken: validation.data.page_access_token,
      igBusinessAccountId: validation.data.ig_business_account_id,
      appSecret: validation.data.app_secret,
      botGreeting: validation.data.bot_greeting,
    })

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: result.webhookUrl,
        webhookVerifyToken: result.webhookVerifyToken,
        igBusinessAccountId: result.igBusinessAccountId,
        igUsername: result.igUsername,
        botEmployeeId: result.botEmployeeId,
      },
    })
  } catch (error) {
    logger.error('Instagram provision error', { error })
    return ApiError.internal('系統錯誤')
  }
}
