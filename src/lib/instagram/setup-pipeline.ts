/**
 * Instagram DM Setup Pipeline — 自助開通自動化
 *
 * 跟 FB pipeline 結構一致、差別：
 *   - 用 IG Business Account ID 而非 FB Page ID 反查 workspace
 *   - 加密同樣的 Page Access Token（IG 透過 FB Page 操作）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { encryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { validateInstagramBusinessAccount } from './instagram-api-client'
import { getOrCreateSystemBotRole } from '@/lib/bot/system-bot-role'
import { randomBytes } from 'crypto'

// generated types 還沒含 workspace_instagram_settings、apply migration + regen 後拿掉
interface InstagramSettingsUpsert {
  workspace_id: string
  ig_business_account_id: string
  ig_username: string | null
  linked_fb_page_id: string | null
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
  igBusinessAccountId: string
  appSecret?: string | null
  botGreeting?: string | null
}

export interface ProvisionResult {
  ok: boolean
  webhookUrl?: string
  webhookVerifyToken?: string
  igBusinessAccountId?: string
  igUsername?: string
  botEmployeeId?: string
  error?: string
}

function buildWebhookUrl(): string {
  const base =
    process.env.INSTAGRAM_WEBHOOK_BASE_URL ||
    process.env.FACEBOOK_WEBHOOK_BASE_URL ||
    'https://erp.venturo.tw'
  return `${base.replace(/\/$/, '')}/api/instagram/webhook`
}

function generateVerifyToken(): string {
  return randomBytes(24).toString('hex')
}

export async function provisionInstagramBot(input: ProvisionInput): Promise<ProvisionResult> {
  const supabase = getSupabaseAdminClient()

  // 1. 驗證
  const validation = await validateInstagramBusinessAccount(
    input.pageAccessToken,
    input.igBusinessAccountId
  )
  if (!validation.ok || !validation.info) {
    return { ok: false, error: validation.error || 'IG Business 驗證失敗' }
  }
  const igInfo = validation.info

  // 2. workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, code, name')
    .eq('id', input.workspaceId)
    .maybeSingle()

  if (wsError || !workspace) return { ok: false, error: 'workspace 不存在' }

  // 3. BOT employee
  const botEmployeeNumber = `IG-BOT-${workspace.code.toUpperCase()}-001`
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
        chinese_name: 'IG DM 系統',
        display_name: 'IG DM 系統',
        english_name: 'Instagram DM Bot',
        employee_type: 'bot',
        role_id: systemBotRoleId,
        status: 'active',
        personal_info: {},
        job_info: { title: 'Instagram DM Integration' },
        salary_info: {},
      })
      .select('id')
      .single()

    if (insertError || !newBot) {
      logger.error('IG bot setup: failed to create BOT employee', {
        workspaceCode: workspace.code,
        error: insertError,
      })
      return { ok: false, error: `建立 BOT employee 失敗：${insertError?.message || '未知錯誤'}` }
    }
    botEmployeeId = newBot.id
  }

  // 4. 加密
  let pageAccessTokenEncrypted: string
  let appSecretEncrypted: string | null = null
  try {
    pageAccessTokenEncrypted = encryptIntegrationSecret(input.pageAccessToken.trim())
    if (input.appSecret && input.appSecret.trim().length > 0) {
      appSecretEncrypted = encryptIntegrationSecret(input.appSecret.trim())
    }
  } catch (cryptoError) {
    logger.error('IG bot setup: encryption failed', { error: cryptoError })
    return {
      ok: false,
      error:
        cryptoError instanceof Error
          ? `加密失敗：${cryptoError.message}（請確認 VENTURO_INTEGRATION_ENCRYPTION_KEY env 已設）`
          : '加密失敗',
    }
  }
  const verifyToken = generateVerifyToken()

  // 5. upsert
  const upsertPayload: InstagramSettingsUpsert = {
    workspace_id: input.workspaceId,
    ig_business_account_id: igInfo.igBusinessAccountId,
    ig_username: igInfo.igUsername,
    linked_fb_page_id: igInfo.linkedFbPageId ?? null,
    page_access_token_encrypted: pageAccessTokenEncrypted,
    app_secret_encrypted: appSecretEncrypted,
    webhook_verify_token: verifyToken,
    bot_greeting: input.botGreeting || null,
    bot_employee_id: botEmployeeId,
    is_active: true,
    webhook_verified_at: new Date().toISOString(),
    effective_from: formatDateTaipei(new Date()),
  }
  const igTable = (supabase.from as unknown as (table: string) => {
    upsert: (
      values: InstagramSettingsUpsert,
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>
  })('workspace_instagram_settings')
  const { error: settingsError } = await igTable.upsert(upsertPayload, {
    onConflict: 'workspace_id',
  })

  if (settingsError) {
    logger.error('IG bot setup: failed to upsert settings', {
      workspaceCode: workspace.code,
      error: settingsError,
    })
    return { ok: false, error: `儲存設定失敗：${settingsError.message}` }
  }

  return {
    ok: true,
    webhookUrl: buildWebhookUrl(),
    webhookVerifyToken: verifyToken,
    igBusinessAccountId: igInfo.igBusinessAccountId,
    igUsername: igInfo.igUsername,
    botEmployeeId,
  }
}
