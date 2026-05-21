/**
 * Facebook Messenger webhook
 *
 * GET: Meta 訂閱 webhook 時的 verify token 配對
 *   query: hub.mode='subscribe', hub.verify_token, hub.challenge
 *   → 若 verify_token 對得上任何 workspace 的、回 hub.challenge plain text 200
 *
 * POST: Meta 推送訊息 event
 *   body.object = 'page'
 *   body.entry[].id = FB Page ID
 *   body.entry[].messaging[] = 事件陣列
 *   header X-Hub-Signature-256 = HMAC-SHA256(app_secret, raw_body)
 *
 *   流程：
 *     1. 取 raw body、parse JSON
 *     2. for each entry: page_id 反查 workspace_facebook_settings
 *     3. 驗 X-Hub-Signature-256（app_secret 設了才驗）
 *     4. for each messaging event:
 *        - upsert inbox_conversations（PSID + workspace + channel='facebook'）
 *        - record inbound message
 *     5. 永遠回 200（Meta 對 4xx/5xx 會 retry）
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { verifyMetaSignature } from '@/lib/facebook/verify-signature'
import { sendTextMessage } from '@/lib/facebook/reply-client'
import { upsertConversation, recordInboundMessage, recordOutboundMessage } from '@/lib/inbox/inbox-service'
import { generateBotReply } from '@/lib/ai/ai-brain'
import { buildConversationContext } from '@/lib/ai/context-builder'
import { ensureContactProfile } from '@/lib/facebook/user-profile'
import { logger } from '@/lib/utils/logger'

const HANDLER_NAME = 'fb-webhook'

interface FacebookSettingsRow {
  workspace_id: string
  page_id: string
  page_access_token_encrypted: string
  app_secret_encrypted: string | null
  webhook_verify_token: string | null
  is_active: boolean
}

interface MessagingEvent {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    attachments?: Array<{ type: string; payload?: unknown }>
  }
  postback?: { mid?: string; title?: string; payload?: string }
  delivery?: unknown
  read?: unknown
}

interface FacebookEntry {
  id: string  // page_id
  time?: number
  messaging?: MessagingEvent[]
}

interface FacebookWebhookBody {
  object: string  // 'page'
  entry: FacebookEntry[]
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: webhook verification handshake
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !verifyToken || !challenge) {
    return NextResponse.json(
      { handler: HANDLER_NAME, info: 'Facebook Messenger webhook endpoint' },
      { status: 200 }
    )
  }

  // verify_token 比對：跨所有 workspace_facebook_settings、看有沒有 row 對得上
  const supabase = getSupabaseAdminClient()
  // .bind(supabase) 必要：generated types 沒含 workspace_facebook_settings 表、走 type cast
  // 但 supabase.from 是 method、cast 後直接呼叫會丟 this、Supabase internal 讀 this.rest 噴
  // TypeError。bind 保 this。
  const fbTable = supabase.from.bind(supabase) as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        limit: (n: number) => Promise<{
          data: { workspace_id: string }[] | null
          error: { message: string } | null
        }>
      }
    }
  }
  const { data, error } = await fbTable('workspace_facebook_settings')
    .select('workspace_id')
    .eq('webhook_verify_token', verifyToken)
    .limit(1)

  if (error) {
    logger.error(`${HANDLER_NAME}: verify lookup error`, { error })
    return new NextResponse('Server error', { status: 500 })
  }

  if (!data || data.length === 0) {
    logger.warn(`${HANDLER_NAME}: verify_token mismatch`, { verifyToken })
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 回 challenge plain text
  return new NextResponse(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: event delivery
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  let body: FacebookWebhookBody
  try {
    body = JSON.parse(rawBody) as FacebookWebhookBody
  } catch {
    logger.warn(`${HANDLER_NAME}: invalid JSON`)
    return NextResponse.json({ error: 'invalid JSON' }, { status: 200 })
  }

  if (body.object !== 'page') {
    // 不是 FB Page event、可能是 IG（會走另一個 webhook、或同 URL 被混合訂閱）
    logger.debug(`${HANDLER_NAME}: skip non-page object`, { object: body.object })
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  // 處理每個 entry（一個 entry = 一個 page、可能含多個 messaging events）
  await Promise.all(
    (body.entry || []).map(entry =>
      handleEntry({ entry, rawBody, signature }).catch(err => {
        logger.error(`${HANDLER_NAME}: entry handler failed`, err, { pageId: entry.id })
      })
    )
  )

  // 永遠回 200（避免 Meta retry storm）
  return NextResponse.json({ ok: true }, { status: 200 })
}

async function handleEntry(args: {
  entry: FacebookEntry
  rawBody: string
  signature: string | null
}): Promise<void> {
  const { entry, rawBody, signature } = args
  const pageId = entry.id

  const supabase = getSupabaseAdminClient()

  // 反查 workspace_facebook_settings（.bind 保 this、原因見 GET handler 上方註解）
  const fbTable = supabase.from.bind(supabase) as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => Promise<{
          data: FacebookSettingsRow | null
          error: { message: string } | null
        }>
      }
    }
  }

  const { data: settings, error: settingsError } = await fbTable('workspace_facebook_settings')
    .select('workspace_id, page_id, page_access_token_encrypted, app_secret_encrypted, webhook_verify_token, is_active')
    .eq('page_id', pageId)
    .maybeSingle()

  if (settingsError) {
    logger.error(`${HANDLER_NAME}: settings lookup error`, { settingsError, pageId })
    return
  }

  if (!settings) {
    logger.warn(`${HANDLER_NAME}: unknown page_id`, { pageId })
    return
  }

  // 驗 X-Hub-Signature-256（app_secret 設了才驗）
  let appSecret: string | null = null
  if (settings.app_secret_encrypted) {
    try {
      appSecret = decryptIntegrationSecret(settings.app_secret_encrypted)
    } catch (cryptoError) {
      logger.error(`${HANDLER_NAME}: failed to decrypt app_secret`, { cryptoError, pageId })
      // 沒法驗、視為失敗
      return
    }
  }
  const sigCheck = verifyMetaSignature(rawBody, signature, appSecret)
  if (!sigCheck.valid) {
    logger.warn(`${HANDLER_NAME}: signature verification failed`, {
      pageId,
      workspaceId: settings.workspace_id,
      reason: sigCheck.reason,
    })
    return
  }

  // 防 replay 攻擊：簽章通過後才檢查 messaging event timestamp 新鮮度（5 分鐘）
  const MAX_AGE_MS = 5 * 60 * 1000
  for (const ev of entry.messaging || []) {
    if (ev.timestamp && Math.abs(Date.now() - ev.timestamp) > MAX_AGE_MS) {
      logger.warn(`${HANDLER_NAME}: replay detected - event timestamp too old`, {
        pageId,
        workspaceId: settings.workspace_id,
        eventTimestamp: ev.timestamp,
        ageDiffMs: Math.abs(Date.now() - ev.timestamp),
      })
      // 整個 entry 丟棄（不處理任何 event）
      return
    }
  }

  // 解密 page_access_token（給 AI 回覆用、提前解密避免每個 event 重解）
  let pageAccessToken: string | null = null
  try {
    pageAccessToken = decryptIntegrationSecret(settings.page_access_token_encrypted)
  } catch (cryptoError) {
    logger.error(`${HANDLER_NAME}: decrypt page_access_token failed`, { cryptoError, pageId })
    // 解不開就只存 inbound、不回覆
  }

  // 處理 messaging events
  for (const ev of entry.messaging || []) {
    await handleMessagingEvent({
      event: ev,
      workspaceId: settings.workspace_id,
      isActive: settings.is_active,
      pageAccessToken,
    }).catch(err => {
      logger.error(`${HANDLER_NAME}: messaging event failed`, err, {
        workspaceId: settings.workspace_id,
      })
    })
  }
}

async function handleMessagingEvent(args: {
  event: MessagingEvent
  workspaceId: string
  isActive: boolean
  pageAccessToken: string | null
}): Promise<void> {
  const { event, workspaceId, isActive, pageAccessToken } = args
  const psid = event.sender?.id
  if (!psid) return

  // 跳過 echo（page 自己回覆會 echo 回來）
  if (event.message?.is_echo) return

  // upsert conversation
  const conversationId = await upsertConversation({
    workspaceId,
    channelType: 'facebook',
    externalUserId: psid,
  })

  if (!conversationId) {
    logger.warn(`${HANDLER_NAME}: upsertConversation returned null`, { workspaceId, psid })
    return
  }

  // fire-and-forget 拉 FB user profile（拿到真名 / 頭像、拿不到 fallback「FB 用戶 (PSID 後 4 碼)」）
  // 內部會檢查 conversation 是否已有真名、避免每次訊息重打 Graph API
  ensureContactProfile({
    conversationId,
    externalUserId: psid,
    pageAccessToken,
    channelLabel: 'FB',
  }).catch(err => {
    logger.debug(`${HANDLER_NAME}: ensureContactProfile failed (ignored)`, { err, psid })
  })

  // 解內容
  let messageType = 'text'
  let content: string | null = null
  let sourceId: string | null = null
  let mediaUrl: string | null = null

  if (event.message) {
    sourceId = event.message.mid ?? null
    if (event.message.text) {
      content = event.message.text
    } else if (event.message.attachments && event.message.attachments.length > 0) {
      const attachment = event.message.attachments[0]
      messageType = attachment.type || 'attachment'
      // 抽 attachment URL（FB Messenger 結構：attachment.payload.url）
      const payload = attachment.payload as { url?: string } | undefined
      mediaUrl = payload?.url ?? null
      content = `[${messageType}]`
    } else {
      content = '[unknown message]'
    }
  } else if (event.postback) {
    sourceId = event.postback.mid ?? null
    messageType = 'postback'
    content = event.postback.title ?? event.postback.payload ?? '[postback]'
  } else if (event.delivery || event.read) {
    return
  } else {
    content = '[unknown event]'
  }

  await recordInboundMessage({
    conversationId,
    workspaceId,
    sourceId,
    messageType,
    content,
    rawEvent: event as unknown,
    mediaUrl,
  })

  // ─── AI brain auto-reply（M8）───
  // 條件：is_active + 有 text content + 有 page_access_token + 不是 attachment-only
  if (!isActive) return
  if (!pageAccessToken) return
  if (!content || messageType !== 'text') return

  const extraContext = await buildConversationContext(conversationId, workspaceId)
  const aiResult = await generateBotReply({
    conversationId,
    workspaceId,
    channelType: 'facebook',
    latestUserMessage: content,
    extraSystemContext: extraContext || undefined,
  })

  if (!aiResult.ok || !aiResult.reply) {
    // 跳過自動回覆（no_api_key / bot_paused / error）— 訊息已存、agent 後台可接手
    logger.debug(`${HANDLER_NAME}: AI brain skipped`, {
      workspaceId,
      reason: aiResult.skippedReason || aiResult.error,
    })
    return
  }

  // 送回客戶
  const sendResult = await sendTextMessage({
    pageAccessToken,
    recipientId: psid,
    text: aiResult.reply,
    channel: 'facebook',
  })

  if (!sendResult.ok) {
    logger.warn(`${HANDLER_NAME}: send AI reply failed`, {
      workspaceId,
      psid,
      error: sendResult.error,
    })
    return
  }

  // 記 outbound
  await recordOutboundMessage({
    conversationId,
    workspaceId,
    sourceId: sendResult.messageId ?? null,
    senderType: 'ai_agent',
    messageType: 'text',
    content: aiResult.reply,
    rawEvent: { ai_reply: true, fb_message_id: sendResult.messageId },
  })
}
