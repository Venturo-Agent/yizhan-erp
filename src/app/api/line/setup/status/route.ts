/**
 * GET /api/line/setup/status
 *
 * Setup Wizard 進來時呼叫、檢查當前 workspace 是否已開通 LINE Bot。
 * 若已開通、Wizard 顯示「已開通」狀態 + 「重新設定」按鈕。
 *
 * 不回 token / secret（客戶看不到原始值、要改密的話走完整 wizard）。
 */

import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ApiError } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return ApiError.unauthorized('請先登入')
    }

    // 🔒 capability 守門：channel_id 是 LINE OA destination ID（PII）、要 line_bot.config
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('workspace_line_settings')
      .select(
        'id, channel_id, is_active, webhook_verified_at, bot_employee_id, bot_greeting, effective_from, effective_to'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (error) {
      logger.error('LINE status fetch error', { error })
      return ApiError.internal('系統錯誤')
    }

    return NextResponse.json({
      success: true,
      data: data
        ? {
            is_active: data.is_active,
            channel_id: data.channel_id,
            webhook_verified_at: data.webhook_verified_at,
            bot_employee_id: data.bot_employee_id,
            bot_greeting: data.bot_greeting,
            effective_from: data.effective_from,
            effective_to: data.effective_to,
          }
        : { is_active: false },
    })
  } catch (error) {
    logger.error('LINE status error', { error })
    return ApiError.internal('系統錯誤')
  }
}
