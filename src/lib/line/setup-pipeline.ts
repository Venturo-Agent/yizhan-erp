/**
 * LINE Bot Setup Pipeline — 自助開通自動化
 *
 * Setup Wizard 最後一步觸發、做 4 件事：
 *   1. 驗證 channel_access_token（call LINE Bot Info API）
 *   2. 建 / 找 BOT employee（employee_number = `BOT-{WORKSPACE_CODE}-001`）
 *      - 平台共用「系統機器人」role（workspace_id NULL）
 *      - 5 個 capability 已 seed: orders.r/w, customers.r/w, tours.r
 *   3. upsert workspace_line_settings（含 token, secret, bot_employee_id, is_active）
 *   4. 回 webhook URL 給 UI 顯示、客戶複製貼回 LINE Developers
 *
 * 加密：token/secret 用 AES-256-GCM 加密後存 _encrypted 欄；明文欄保留緩衝期
 *       待全部 workspace 重 provision 後可清空（migration 20260517950000）。
 *
 * Setup 失敗時應該 rollback、但 demo 簡化版用「上次撞錯就 manual fix」
 * 處理（commit 訊息註記）。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { validateChannelAccessToken } from './line-api-client'
import { getOrCreateSystemBotRole } from '@/lib/bot/system-bot-role'
import { encryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProvisionInput {
  workspaceId: string
  channelId: string
  channelAccessToken: string
  channelSecret: string
  botGreeting?: string | null
}

export interface ProvisionResult {
  ok: boolean
  webhookUrl?: string
  botUserId?: string
  botDisplayName?: string
  botEmployeeId?: string
  error?: string
}

function buildWebhookUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || process.env.LINE_WEBHOOK_BASE_URL || 'https://erp.venturo.tw'
  return `${base.replace(/\/$/, '')}/api/line/webhook`
}

/**
 * 跑完整 setup pipeline。失敗時回 ok=false + error message、不 throw。
 */
export async function provisionLineBot(input: ProvisionInput): Promise<ProvisionResult> {
  const supabase = getSupabaseAdminClient()

  // 1. 驗證 token
  const validation = await validateChannelAccessToken(input.channelAccessToken)
  if (!validation.ok || !validation.info) {
    return { ok: false, error: validation.error || 'token 驗證失敗' }
  }
  const botInfo = validation.info

  // 2. 找 workspace（拿 code 來組 employee_number）
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, code, name')
    .eq('id', input.workspaceId)
    .maybeSingle()

  if (wsError || !workspace) {
    return { ok: false, error: 'workspace 不存在' }
  }

  // 3. 找 / 建 BOT employee
  const botEmployeeNumber = `BOT-${workspace.code.toUpperCase()}-001`
  let botEmployeeId: string

  const { data: existingBot } = await supabase
    .from('employees')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('employee_number', botEmployeeNumber)
    .maybeSingle()

  if (existingBot?.id) {
    botEmployeeId = existingBot.id
  } else {
    const systemBotRoleId = await getOrCreateSystemBotRole(input.workspaceId)
    const { data: newBot, error: insertError } = await supabase
      .from('employees')
      .insert({
        workspace_id: input.workspaceId,
        employee_number: botEmployeeNumber,
        chinese_name: 'LINE Bot 系統',
        display_name: 'LINE Bot 系統',
        english_name: 'LINE Bot',
        employee_type: 'bot',
        role_id: systemBotRoleId,
        status: 'active',
        personal_info: {},
        job_info: { title: 'LINE Bot Integration' },
        salary_info: {},
      })
      .select('id')
      .single()

    if (insertError || !newBot) {
      logger.error('LINE bot setup: failed to create BOT employee', {
        workspaceCode: workspace.code,
        error: insertError,
      })
      return { ok: false, error: `建立 BOT employee 失敗：${insertError?.message || '未知錯誤'}` }
    }
    botEmployeeId = newBot.id
  }

  // 4. upsert workspace_line_settings（token/secret 加密存入、明文欄位清空）
  const supabaseAny = supabase as unknown as SupabaseClient
  const { error: settingsError } = await supabaseAny.from('workspace_line_settings').upsert(
    {
      workspace_id: input.workspaceId,
      channel_id: botInfo.userId,
      channel_access_token: null,
      channel_secret: null,
      channel_access_token_encrypted: encryptIntegrationSecret(input.channelAccessToken.trim()),
      channel_secret_encrypted: encryptIntegrationSecret(input.channelSecret.trim()),
      bot_greeting: input.botGreeting || null,
      bot_employee_id: botEmployeeId,
      is_active: true,
      webhook_verified_at: new Date().toISOString(),
      effective_from: formatDateTaipei(new Date()),
    },
    { onConflict: 'workspace_id' }
  )

  if (settingsError) {
    logger.error('LINE bot setup: failed to upsert settings', {
      workspaceCode: workspace.code,
      error: settingsError,
    })
    return { ok: false, error: `儲存設定失敗：${settingsError.message}` }
  }

  return {
    ok: true,
    webhookUrl: buildWebhookUrl(),
    botUserId: botInfo.userId,
    botDisplayName: botInfo.displayName,
    botEmployeeId,
  }
}
