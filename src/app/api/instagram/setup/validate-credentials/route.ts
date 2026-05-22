/**
 * POST /api/instagram/setup/validate-credentials
 *
 * IG 走 Meta Graph API、需驗 Page Access Token + IG Business Account ID 配對。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { validateInstagramBusinessAccount } from '@/lib/instagram/instagram-api-client'
import { logger } from '@/lib/utils/logger'

const schema = z.object({
  instagram_user_access_token: z.string().min(1, '請填 instagram_user_access_token'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return ApiError.unauthorized('請先登入')

    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const supabase = getSupabaseAdminClient()
    const { data: feature } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('feature_code', 'ai_hub')
      .maybeSingle()

    if (!feature?.enabled) {
      return ApiError.forbidden('此 workspace 尚未開通 AI Hub')
    }

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const result = await validateInstagramBusinessAccount(
      validation.data.instagram_user_access_token
    )
    if (!result.ok || !result.info) {
      return NextResponse.json(
        { success: false, error: result.error || 'IG Business 驗證失敗' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.info,
    })
  } catch (error) {
    logger.error('Instagram validate-credentials error', { error })
    return ApiError.internal('系統錯誤')
  }
}
