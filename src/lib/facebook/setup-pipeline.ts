/**
 * Facebook Messenger Setup Pipeline — 自助開通自動化
 *
 * Setup Wizard 最後一步觸發、做 5 件事：
 *   1. 驗證 page_access_token（call Meta Graph API GET /me）
 *   2. 建 / 找 BOT employee（employee_number = `FB-BOT-{WORKSPACE_CODE}-001`）
 *      - 沿用平台共用「系統機器人」role（workspace_id NULL）
 *      - 5 個 capability 已 seed: orders.r/w, customers.r/w, tours.r
 *   3. 生成 webhook_verify_token（隨機 32 chars、給 Meta GET 訂閱用）
 *   4. 加密 page_access_token + app_secret、upsert workspace_facebook_settings
 *   5. 回 webhook URL 給 UI 顯示、客戶複製貼回 Meta App webhook 訂閱
 *
 * 加密紀律：token 過 encryptIntegrationSecret() 才進 DB、DB 看到永遠 ciphertext。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { encryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { validatePageAccessToken } from './facebook-api-client'
import { getOrCreateSystemBotRole } from '@/lib/bot/system-bot-role'
import { randomBytes } from 'crypto'

// generated types 還沒含 workspace_facebook_settings（migration 5/13 才建）
// 等下次 supabase gen types 跑完可拿掉、改回標準 supabase.from 調用
interface FacebookSettingsUpsert {
  workspace_id: string
  page_id: string
  page_name: string | null
  page_access_token_encrypted: string
  app_secret_encrypted: string | null
  webhook_verify_token: string
  bot_greeting: string | null
  bot_employee_id: string
  is_active: boolean
  webhook_verified_at: string
  effective_from: string
}

export interface ProvisionInput {
  workspaceId: string
  pageAccessToken: string
  appSecret?: string | null
  botGreeting?: string | null
}

export interface ProvisionResult {
  ok: boolean
  webhookUrl?: string
  webhookVerifyToken?: string
  pageId?: string
  pageName?: string
  botEmployeeId?: string
  error?: string
}

function buildWebhookUrl(): string {
  const base =
    process.env.FACEBOOK_WEBHOOK_BASE_URL ||
    process.env.LINE_WEBHOOK_BASE_URL ||
    'https://erp.venturo.tw'
  return `${base.replace(/\/$/, '')}/api/facebook/webhook`
}

function generateVerifyToken(): string {
  return randomBytes(24).toString('hex')
}

/**
 * 跑完整 setup pipeline。失敗時回 ok=false + error message、不 throw。
 */
export async function provisionFacebookBot(input: ProvisionInput): Promise<ProvisionResult> {
  const supabase = getSupabaseAdminClient()

  // 1. 驗證 Page Access Token + 拿 Page 資訊
  const validation = await validatePageAccessToken(input.pageAccessToken)
  if (!validation.ok || !validation.info) {
    return { ok: false, error: validation.error || 'Page Access Token 驗證失敗' }
  }
  const pageInfo = validation.info

  // 2. 找 workspace（拿 code 組 employee_number）
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, code, name')
    .eq('id', input.workspaceId)
    .maybeSingle()

  if (wsError || !workspace) {
    return { ok: false, error: 'workspace 不存在' }
  }

  // 3. 找 / 建 BOT employee
  const botEmployeeNumber = `FB-BOT-${workspace.code.toUpperCase()}-001`
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
        chinese_name: 'FB Messenger 系統',
        display_name: 'FB Messenger 系統',
        english_name: 'Facebook Messenger Bot',
        employee_type: 'bot',
        role_id: systemBotRoleId,
        status: 'active',
        personal_info: {},
        job_info: { title: 'Facebook Messenger Integration' },
        salary_info: {},
      })
      .select('id')
      .single()

    if (insertError || !newBot) {
      logger.error('FB bot setup: failed to create BOT employee', {
        workspaceCode: workspace.code,
        error: insertError,
      })
      return { ok: false, error: `建立 BOT employee 失敗：${insertError?.message || '未知錯誤'}` }
    }
    botEmployeeId = newBot.id
  }

  // 4. 加密 token + 生成 webhook verify token
  let pageAccessTokenEncrypted: string
  let appSecretEncrypted: string | null = null
  try {
    pageAccessTokenEncrypted = encryptIntegrationSecret(input.pageAccessToken.trim())
    if (input.appSecret && input.appSecret.trim().length > 0) {
      appSecretEncrypted = encryptIntegrationSecret(input.appSecret.trim())
    }
  } catch (cryptoError) {
    logger.error('FB bot setup: encryption failed', { error: cryptoError })
    return {
      ok: false,
      error:
        cryptoError instanceof Error
          ? `加密失敗：${cryptoError.message}（請確認 VENTURO_INTEGRATION_ENCRYPTION_KEY env 已設）`
          : '加密失敗',
    }
  }
  const verifyToken = generateVerifyToken()

  // 5. upsert workspace_facebook_settings
  // generated types 還沒含這張表、用 type assertion 繞過、apply migration + regen 後改回標準調用
  const upsertPayload: FacebookSettingsUpsert = {
    workspace_id: input.workspaceId,
    page_id: pageInfo.pageId,
    page_name: pageInfo.pageName,
    page_access_token_encrypted: pageAccessTokenEncrypted,
    app_secret_encrypted: appSecretEncrypted,
    webhook_verify_token: verifyToken,
    bot_greeting: input.botGreeting || null,
    bot_employee_id: botEmployeeId,
    is_active: true,
    webhook_verified_at: new Date().toISOString(),
    effective_from: formatDateTaipei(new Date()),
  }
  const fbTable = (
    supabase.from.bind(supabase) as unknown as (table: string) => {
      upsert: (
        values: FacebookSettingsUpsert,
        options: { onConflict: string }
      ) => Promise<{ error: { message: string } | null }>
    }
  )('workspace_facebook_settings')
  const { error: settingsError } = await fbTable.upsert(upsertPayload, {
    onConflict: 'workspace_id',
  })

  if (settingsError) {
    logger.error('FB bot setup: failed to upsert settings', {
      workspaceCode: workspace.code,
      error: settingsError,
    })
    return { ok: false, error: `儲存設定失敗：${settingsError.message}` }
  }

  return {
    ok: true,
    webhookUrl: buildWebhookUrl(),
    webhookVerifyToken: verifyToken,
    pageId: pageInfo.pageId,
    pageName: pageInfo.pageName,
    botEmployeeId,
  }
}
