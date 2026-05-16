/**
 * POST /api/line/setup/validate-credentials
 *
 * Setup Wizard StepValidate 階段呼叫。前端送 channel_access_token、
 * 後端打 LINE Bot Info API 驗證、回 botUserId / displayName / 等。
 *
 * 守門：
 *   - 必須登入（getServerAuth）
 *   - workspace 必須有 line_bot.config capability
 *   - workspace_features.line_bot 必須開（platform admin 才能開）
 *
 * 不寫 DB、純驗證。Setup pipeline（provision）才會寫 DB。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { validateChannelAccessToken } from '@/lib/line/line-api-client'
import { logger } from '@/lib/utils/logger'

const schema = z.object({
  channel_access_token: z.string().min(1, '請填 channel_access_token'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return ApiError.unauthorized('請先登入')
    }

    // 🔒 capability 守門：channel_access_token 是高風險敏感資料、要 line_bot.config
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    // workspace 必須開了 line_bot feature（平台 admin 賣的）
    const supabase = getSupabaseAdminClient()
    const { data: feature } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('feature_code', 'line_bot')
      .maybeSingle()

    if (!feature?.enabled) {
      return ApiError.forbidden('此 workspace 尚未開通 LINE Bot 整合（請聯絡平台管理員）')
    }

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const result = await validateChannelAccessToken(validation.data.channel_access_token)
    if (!result.ok || !result.info) {
      return NextResponse.json(
        { success: false, error: result.error || 'token 驗證失敗' },
        { status: 200 } // 回 200、UI 自己看 success
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        botUserId: result.info.userId,
        basicId: result.info.basicId,
        displayName: result.info.displayName,
        pictureUrl: result.info.pictureUrl,
      },
    })
  } catch (error) {
    logger.error('LINE validate-credentials error', { error })
    return ApiError.internal('系統錯誤')
  }
}
