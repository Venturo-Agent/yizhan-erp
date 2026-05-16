/**
 * POST /api/facebook/setup/validate-credentials
 *
 * Setup Wizard StepValidate 階段呼叫。前端送 page_access_token、
 * 後端打 Meta Graph API /me 驗證、回 pageId / pageName。
 *
 * 守門：
 *   - 必須登入
 *   - workspace 必須有 facebook_bot.config capability
 *   - workspace_features.facebook_bot 必須開
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
import { validatePageAccessToken } from '@/lib/facebook/facebook-api-client'
import { logger } from '@/lib/utils/logger'

const schema = z.object({
  page_access_token: z.string().min(1, '請填 page_access_token'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return ApiError.unauthorized('請先登入')
    }

    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const supabase = getSupabaseAdminClient()
    const { data: feature } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('feature_code', 'facebook_bot')
      .maybeSingle()

    if (!feature?.enabled) {
      return ApiError.forbidden('此 workspace 尚未開通 Facebook Messenger 整合（請聯絡平台管理員）')
    }

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const result = await validatePageAccessToken(validation.data.page_access_token)
    if (!result.ok || !result.info) {
      return NextResponse.json(
        { success: false, error: result.error || 'Page Access Token 驗證失敗' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        pageId: result.info.pageId,
        pageName: result.info.pageName,
        category: result.info.category,
        pictureUrl: result.info.pictureUrl,
      },
    })
  } catch (error) {
    logger.error('Facebook validate-credentials error', { error })
    return ApiError.internal('系統錯誤')
  }
}
