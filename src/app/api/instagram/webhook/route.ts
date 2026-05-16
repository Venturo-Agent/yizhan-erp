/**
 * Instagram DM webhook
 *
 * GET: verify_token 配對（跟 FB 同模式、但比對 workspace_instagram_settings）
 *
 * POST: Meta 推送 IG DM event
 *   body.object = 'instagram'
 *   body.entry[].id = IG Business Account ID
 *   body.entry[].messaging[] = 事件（DM message）
 *
 *   Note: IG DM payload 跟 FB Messenger 95% 一致（共用 Meta Graph API）、
 *         差別在 sender.id 是 IGSID 不是 PSID。
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
import { logger } from '@/lib/utils/logger'

const HANDLER_NAME = 'ig-webhook'

interface InstagramSettingsRow {
  workspace_id: string
  ig_business_account_id: string
  page_access_token_encrypted: string
  app_secret_encrypted: string | null
  webhook_verify_token: string | null
  is_active: boolean
}

interface MessagingEvent {
  sender?: { id?: string }  // IGSID
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
    attachments?: Array<{ type: string; payload?: unknown }>
  }
  postback?: { mid?: string; title?: string; payload?: string }
}

interface InstagramEntry {
  id: string  // ig_business_account_id
  time?: number
  messaging?: MessagingEvent[]
}

interface InstagramWebhookBody {
  object: string  // 'instagram'
  entry: InstagramEntry[]
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: verify
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !verifyToken || !challenge) {
    return NextResponse.json(
      { handler: HANDLER_NAME, info: 'Instagram DM webhook endpoint' },
      { status: 200 }
    )
  }

  const supabase = getSupabaseAdminClient()
  const igTable = supabase.from as unknown as (
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
  const { data, error } = await igTable('workspace_instagram_settings')
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

  let body: InstagramWebhookBody
  try {
    body = JSON.parse(rawBody) as InstagramWebhookBody
  } catch {
    logger.warn(`${HANDLER_NAME}: invalid JSON`)
    return NextResponse.json({ error: 'invalid JSON' }, { status: 200 })
  }

  if (body.object !== 'instagram') {
    logger.debug(`${HANDLER_NAME}: skip non-instagram object`, { object: body.object })
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  await Promise.all(
    (body.entry || []).map(entry =>
      handleEntry({ entry, rawBody, signature }).catch(err => {
        logger.error(`${HANDLER_NAME}: entry handler failed`, err, { igId: entry.id })
      })
    )
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function handleEntry(args: {
  entry: InstagramEntry
  rawBody: string
  signature: string | null
}): Promise<void> {
  const { entry, rawBody, signature } = args
  const igId = entry.id

  const supabase = getSupabaseAdminClient()
  const igTable = supabase.from as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => Promise<{
          data: InstagramSettingsRow | null
          error: { message: string } | null
        }>
      }
    }
  }

  const { data: settings, error: settingsError } = await igTable('workspace_instagram_settings')
    .select('workspace_id, ig_business_account_id, page_access_token_encrypted, app_secret_encrypted, webhook_verify_token, is_active')
    .eq('ig_business_account_id', igId)
    .maybeSingle()

  if (settingsError) {
    logger.error(`${HANDLER_NAME}: settings lookup error`, { settingsError, igId })
    return
  }
  if (!settings) {
    logger.warn(`${HANDLER_NAME}: unknown ig_business_account_id`, { igId })
    return
  }

  let appSecret: string | null = null
  if (settings.app_secret_encrypted) {
    try {
      appSecret = decryptIntegrationSecret(settings.app_secret_encrypted)
    } catch (cryptoError) {
      logger.error(`${HANDLER_NAME}: failed to decrypt app_secret`, { cryptoError, igId })
      return
    }
  }
  const sigCheck = verifyMetaSignature(rawBody, signature, appSecret)
  if (!sigCheck.valid) {
    logger.warn(`${HANDLER_NAME}: signature verification failed`, {
      igId,
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
        igId,
        workspaceId: settings.workspace_id,
        eventTimestamp: ev.timestamp,
        ageDiffMs: Math.abs(Date.now() - ev.timestamp),
      })
      // 整個 entry 丟棄（不處理任何 event）
      return
    }
  }

  // 提前解密 page_access_token 給 AI 回覆用
  let pageAccessToken: string | null = null
  try {
    pageAccessToken = decryptIntegrationSecret(settings.page_access_token_encrypted)
  } catch (cryptoError) {
    logger.error(`${HANDLER_NAME}: decrypt page_access_token failed`, { cryptoError, igId })
  }

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
  const igsid = event.sender?.id
  if (!igsid) return
  if (event.message?.is_echo) return

  const conversationId = await upsertConversation({
    workspaceId,
    channelType: 'instagram',
    externalUserId: igsid,
  })

  if (!conversationId) {
    logger.warn(`${HANDLER_NAME}: upsertConversation returned null`, { workspaceId, igsid })
    return
  }

  let messageType = 'text'
  let content: string | null = null
  let sourceId: string | null = null

  if (event.message) {
    sourceId = event.message.mid ?? null
    if (event.message.text) {
      content = event.message.text
    } else if (event.message.attachments && event.message.attachments.length > 0) {
      messageType = event.message.attachments[0].type || 'attachment'
      content = `[${messageType}]`
    } else {
      content = '[unknown message]'
    }
  } else if (event.postback) {
    sourceId = event.postback.mid ?? null
    messageType = 'postback'
    content = event.postback.title ?? event.postback.payload ?? '[postback]'
  } else {
    return
  }

  await recordInboundMessage({
    conversationId,
    workspaceId,
    sourceId,
    messageType,
    content,
    rawEvent: event as unknown,
  })

  // ─── AI brain auto-reply（M8）───
  if (!isActive) return
  if (!pageAccessToken) return
  if (!content || messageType !== 'text') return

  const extraContext = await buildConversationContext(conversationId, workspaceId)
  const aiResult = await generateBotReply({
    conversationId,
    workspaceId,
    channelType: 'instagram',
    latestUserMessage: content,
    extraSystemContext: extraContext || undefined,
  })

  if (!aiResult.ok || !aiResult.reply) {
    logger.debug(`${HANDLER_NAME}: AI brain skipped`, {
      workspaceId,
      reason: aiResult.skippedReason || aiResult.error,
    })
    return
  }

  const sendResult = await sendTextMessage({
    pageAccessToken,
    recipientId: igsid,
    text: aiResult.reply,
    channel: 'instagram',
  })

  if (!sendResult.ok) {
    logger.warn(`${HANDLER_NAME}: send AI reply failed`, {
      workspaceId,
      igsid,
      error: sendResult.error,
    })
    return
  }

  await recordOutboundMessage({
    conversationId,
    workspaceId,
    sourceId: sendResult.messageId ?? null,
    senderType: 'ai_agent',
    messageType: 'text',
    content: aiResult.reply,
    rawEvent: { ai_reply: true, ig_message_id: sendResult.messageId },
  })
}
