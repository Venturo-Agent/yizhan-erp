/**
 * GET /api/cron/line-flush
 *
 * 送出「is_expired = TRUE 且 sent_at IS NULL」的 LINE bot debounce 回覆。
 *
 * 呼叫頻率：每分鐘（Coolify cron / GitHub Actions / 外部 cron service）
 * 驗證：CRON_SECRET header
 *
 * 流程：
 *   1. 查 line_bot_reply_debounce WHERE is_expired=TRUE AND sent_at IS NULL
 *   2. 每筆：查 workspace_line_settings → channel_access_token
 *   3. 組 BotContext → processIncomingTextMessage（PUSH 模式）
 *   4. 標 sent_at
 *
 * 最壞情況延遲：pg_cron 30s 標 expired + cron 60s 打一次 → 最慢 90s 後 user 收到回覆
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { processIncomingTextMessage } from '@/lib/line/handler'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { markDebounceSent } from '@/lib/line/debounce'
import { logger } from '@/lib/utils/logger'
import type { BotContext } from '@/types/line.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET

function verifyCronSecret(request: NextRequest): boolean {
  if (!CRON_SECRET) return true // dev 不強制
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const supabaseAny = supabase as unknown as SupabaseClient

  // 1. 查過期 pending replies
  const { data: pending, error: queryErr } = await supabaseAny
    .from('line_bot_reply_debounce')
    .select('id, workspace_id, line_user_id, accumulated_text')
    .eq('is_expired', true)
    .is('sent_at', null)
    .limit(20)

  if (queryErr) {
    logger.error('[line-flush] query failed', queryErr)
    return NextResponse.json({ error: 'query failed' }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ flushed: 0 })
  }

  let flushed = 0
  let failed = 0

  for (const row of pending) {
    if (!row.accumulated_text?.trim()) {
      await markDebounceSent(supabase, {
        workspaceId: row.workspace_id,
        lineUserId: row.line_user_id,
      })
      continue
    }

    // 2. 取 workspace LINE 設定（channel_access_token + bot employee）
    const { data: settings } = await supabaseAny
      .from('workspace_line_settings')
      .select('channel_access_token_encrypted, bot_employee_id, is_active')
      .eq('workspace_id', row.workspace_id)
      .maybeSingle()

    if (!settings?.is_active || !settings.channel_access_token_encrypted) {
      await markDebounceSent(supabase, {
        workspaceId: row.workspace_id,
        lineUserId: row.line_user_id,
      })
      continue
    }

    let channelAccessToken: string
    try {
      channelAccessToken = await decryptIntegrationSecret(settings.channel_access_token_encrypted)
    } catch {
      logger.error('[line-flush] decrypt token failed', { workspaceId: row.workspace_id })
      failed++
      continue
    }

    const ctx: BotContext = {
      workspaceId: row.workspace_id,
      botEmployeeId: settings.bot_employee_id ?? null,
      lineUserId: row.line_user_id,
      channelAccessToken,
      lineDisplayName: null,
    }

    try {
      // PUSH 模式：replyToken = null → handler 走 PUSH API
      await processIncomingTextMessage(ctx, row.accumulated_text, null)
      await markDebounceSent(supabase, {
        workspaceId: row.workspace_id,
        lineUserId: row.line_user_id,
      })
      flushed++
    } catch (err) {
      logger.error('[line-flush] processIncomingTextMessage failed', err, {
        workspaceId: row.workspace_id,
        lineUserId: row.line_user_id,
      })
      failed++
    }
  }

  return NextResponse.json({ flushed, failed, total: pending.length })
}
