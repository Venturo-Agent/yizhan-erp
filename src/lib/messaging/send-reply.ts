/**
 * Unified send-reply service
 *
 * 給 agent 從 /messaging UI 手動回客戶用。channel-aware：根據 conversation 的
 * channel_type 路由到對應的 send API（LINE Push / FB Send / IG Send）、
 * 解密 token、發送、寫 outbound 訊息。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { sendTextMessage } from '@/lib/facebook/reply-client'
import { pushLineText } from '@/lib/line/push-client'
import { recordOutboundMessage } from '@/lib/inbox/inbox-service'
import { logger } from '@/lib/utils/logger'
import type { ChannelType } from '@/lib/inbox/inbox-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgentSendInput {
  conversationId: string
  workspaceId: string
  text: string
  /** 發送方 employee 的 id（記錄 sender_employee_id 用） */
  senderEmployeeId: string
}

export interface AgentSendResult {
  ok: boolean
  messageId?: string
  error?: string
}

interface ConversationLookupRow {
  id: string
  workspace_id: string
  channel_type: ChannelType
  external_user_id: string
}

interface LineSettingsRow {
  channel_access_token: string
  is_active: boolean
}

interface FbSettingsRow {
  page_access_token_encrypted: string
}

interface IgSettingsRow {
  page_access_token_encrypted: string
}

export async function sendAgentReply(input: AgentSendInput): Promise<AgentSendResult> {
  // LINE synthetic id: line:<line_user_id>
  if (input.conversationId.startsWith('line:')) {
    const lineUserId = input.conversationId.slice('line:'.length)
    const synthetic: ConversationLookupRow = {
      id: input.conversationId,
      workspace_id: input.workspaceId,
      channel_type: 'line',
      external_user_id: lineUserId,
    }
    return sendViaLine(synthetic, input)
  }

  const supabase = getSupabaseAdminClient()

  // 反查 inbox_conversations（FB / IG）
  const convTable = supabase.from as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        eq: (col: string, value: string) => {
          maybeSingle: () => Promise<{
            data: ConversationLookupRow | null
            error: { message: string } | null
          }>
        }
      }
    }
  }

  const { data: conv, error: convError } = await convTable('inbox_conversations')
    .select('id, workspace_id, channel_type, external_user_id')
    .eq('id', input.conversationId)
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  if (convError) {
    return { ok: false, error: `conversation 查詢失敗：${convError.message}` }
  }
  if (!conv) {
    return { ok: false, error: '找不到對話（或不在此 workspace）' }
  }

  if (conv.channel_type === 'facebook') {
    return sendViaFacebook(conv, input, 'facebook')
  }
  if (conv.channel_type === 'instagram') {
    return sendViaFacebook(conv, input, 'instagram')
  }
  return { ok: false, error: `未支援的 channel_type: ${conv.channel_type}` }
}

async function sendViaLine(
  conv: ConversationLookupRow,
  input: AgentSendInput
): Promise<AgentSendResult> {
  const supabase = getSupabaseAdminClient()
  const { data: settings, error } = await supabase
    .from('workspace_line_settings')
    .select('channel_access_token, is_active')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle<LineSettingsRow>()

  if (error || !settings) {
    return { ok: false, error: 'LINE 設定不存在或載入失敗' }
  }

  const result = await pushLineText({
    channelAccessToken: settings.channel_access_token,
    toUserId: conv.external_user_id,
    text: input.text,
  })

  if (!result.ok) {
    return { ok: false, error: result.error || 'LINE push 失敗' }
  }

  // LINE outbound 寫到 line_conversation_messages（LINE 自己的舊表、保留現有 flow）
  // 不寫 inbox_messages 因為 LINE 沒有對應的 inbox_conversations row
  const lineMsg = supabase as unknown as SupabaseClient
  await lineMsg.from('line_conversation_messages').insert({
    workspace_id: input.workspaceId,
    line_user_id: conv.external_user_id,
    direction: 'outbound',
    sender: 'agent',
    message_type: 'text',
    content: input.text,
    raw_event: { sent_via: 'line_push', agent_employee_id: input.senderEmployeeId },
  })

  return { ok: true }
}

async function sendViaFacebook(
  conv: ConversationLookupRow,
  input: AgentSendInput,
  channel: 'facebook' | 'instagram'
): Promise<AgentSendResult> {
  const supabase = getSupabaseAdminClient()
  const tableName =
    channel === 'facebook' ? 'workspace_facebook_settings' : 'workspace_instagram_settings'

  const settingsTable = supabase.from as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => Promise<{
          data: FbSettingsRow | IgSettingsRow | null
          error: { message: string } | null
        }>
      }
    }
  }

  const { data: settings, error } = await settingsTable(tableName)
    .select('page_access_token_encrypted')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  if (error || !settings) {
    return { ok: false, error: `${channel} 設定不存在或載入失敗` }
  }

  let token: string
  try {
    token = decryptIntegrationSecret(settings.page_access_token_encrypted)
  } catch (cryptoError) {
    logger.error('sendAgentReply: decrypt page_access_token failed', { cryptoError, channel })
    return { ok: false, error: '解密 token 失敗（VENTURO_INTEGRATION_ENCRYPTION_KEY 設定問題）' }
  }

  const result = await sendTextMessage({
    pageAccessToken: token,
    recipientId: conv.external_user_id,
    text: input.text,
    channel,
  })

  if (!result.ok) {
    return { ok: false, error: result.error || `${channel} send 失敗` }
  }

  await recordOutboundMessage({
    conversationId: conv.id,
    workspaceId: input.workspaceId,
    sourceId: result.messageId ?? null,
    senderType: 'agent',
    senderEmployeeId: input.senderEmployeeId,
    messageType: 'text',
    content: input.text,
    rawEvent: { sent_via: `${channel}_send`, message_id: result.messageId },
  })

  return { ok: true, messageId: result.messageId }
}
