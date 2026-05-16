/**
 * POST /api/line/webhook
 *
 * Multi-tenant LINE webhook router（卡片 [[03-LINE-Bot-第一階段]] 第 4.2 節 C 方案）
 *
 * 流程：
 *   1. 收 raw body（簽章必須對 raw body）
 *   2. parse JSON、取 body.destination = LINE OA bot user ID
 *   3. 用 destination 反查 workspace_line_settings → workspace_id + channel_secret + token
 *   4. 用該 workspace 的 channel_secret 驗 X-Line-Signature
 *   5. for each event：
 *      - 寫 line_conversation_messages（inbound）
 *      - 暫時 echo「收到您的訊息：xxx」（用 Reply API）
 *      - 寫 outbound 紀錄
 *   6. 200 OK
 *
 * 重要：
 *   - 永遠回 200 給 LINE（除了真的內部錯）。LINE 對 4xx/5xx 會 retry、放大問題
 *   - 找不到 workspace = 401（簽章 / 設定問題）
 *   - 簽章錯 = 401
 *   - DB 失敗 = 200（不阻塞 LINE 重送、走 audit log 追）
 *
 * Phase 2 (T1.3) 接手：把 echo 換成 state machine（卡片 6.1 節）。
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import { verifyLineSignature } from '@/lib/line/verify-signature'
import { processIncomingTextMessage } from '@/lib/line/handler'
import { fetchLineProfile } from '@/lib/line/profile-client'
import { recordInboxMessage } from '@/lib/messaging/inbox'
import { logger } from '@/lib/utils/logger'
import type { BotContext } from '@/types/line.types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface LineEventSource {
  type: string
  userId?: string
  groupId?: string
  roomId?: string
}

interface LineEventMessage {
  id: string
  type: string
  text?: string
}

interface LineEvent {
  type: string
  timestamp?: number
  source?: LineEventSource
  replyToken?: string
  message?: LineEventMessage
  postback?: { data: string }
}

interface LineWebhookBody {
  destination: string
  events: LineEvent[]
}

interface WorkspaceLineSettingsRow {
  workspace_id: string
  channel_secret: string
  channel_access_token: string
  is_active: boolean
  bot_employee_id: string | null
}

const HANDLER_NAME = 'line-webhook'

export async function POST(req: NextRequest) {
  // 1. 取 raw body（必須是 raw 字串、簽章對 raw body 算 HMAC）
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  // 2. parse JSON
  let body: LineWebhookBody
  try {
    body = JSON.parse(rawBody) as LineWebhookBody
  } catch {
    logger.warn(`${HANDLER_NAME}: invalid JSON body`)
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const destination = body.destination
  if (!destination) {
    logger.warn(`${HANDLER_NAME}: missing destination`)
    return NextResponse.json({ error: 'missing destination' }, { status: 400 })
  }

  // 3. 反查 workspace_line_settings
  const supabase = getSupabaseAdminClient()
  const { data: settings, error: settingsError } = await supabase
    .from('workspace_line_settings')
    .select('workspace_id, channel_secret, channel_access_token, is_active, bot_employee_id')
    .eq('channel_id', destination)
    .maybeSingle<WorkspaceLineSettingsRow>()

  if (settingsError) {
    logger.error(`${HANDLER_NAME}: failed to lookup workspace_line_settings`, settingsError, {
      destination,
    })
    // DB 出錯回 503、LINE 會 retry
    return NextResponse.json({ error: 'lookup failed' }, { status: 503 })
  }

  if (!settings) {
    logger.warn(`${HANDLER_NAME}: no workspace matched destination`, { destination })
    // 沒設過這個 channel = 不是我們的 webhook target
    return NextResponse.json({ error: 'unknown destination' }, { status: 401 })
  }

  // 4. 驗簽章（用該 workspace 的 channel_secret）
  const sigCheck = verifyLineSignature(rawBody, signature, settings.channel_secret)
  if (!sigCheck.valid) {
    logger.warn(`${HANDLER_NAME}: signature verification failed`, {
      destination,
      workspaceId: settings.workspace_id,
      reason: sigCheck.reason,
    })
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // 4.5 防 replay 攻擊：簽章通過後才檢查 timestamp 新鮮度（5 分鐘）
  // 攻擊者可能把舊的合法 payload 重送，timestamp 檢查讓過期的 payload 失效
  const MAX_AGE_MS = 5 * 60 * 1000
  const events = body.events ?? []
  for (const event of events) {
    if (event.timestamp && Math.abs(Date.now() - event.timestamp) > MAX_AGE_MS) {
      logger.warn(`${HANDLER_NAME}: replay detected - event timestamp too old`, {
        destination,
        workspaceId: settings.workspace_id,
        eventTimestamp: event.timestamp,
        ageDiffMs: Math.abs(Date.now() - event.timestamp),
      })
      return NextResponse.json({ error: 'Replay detected' }, { status: 401 })
    }
  }

  // 5. 處理 events（不 await 任何單一 event 失敗、收集起來繼續處理其他）
  await Promise.all(
    body.events.map(event =>
      handleEvent({
        event,
        workspaceId: settings.workspace_id,
        channelAccessToken: settings.channel_access_token,
        isActive: settings.is_active,
        botEmployeeId: settings.bot_employee_id,
      }).catch(err => {
        logger.error(`${HANDLER_NAME}: event handler failed`, err, {
          workspaceId: settings.workspace_id,
          eventType: event.type,
        })
      })
    )
  )

  // 6. 永遠回 200（避免 LINE retry storm）
  return NextResponse.json({ ok: true }, { status: 200 })
}

interface HandleEventArgs {
  event: LineEvent
  workspaceId: string
  channelAccessToken: string
  isActive: boolean
  botEmployeeId: string | null
}

async function handleEvent(args: HandleEventArgs): Promise<void> {
  const { event, workspaceId, channelAccessToken, isActive, botEmployeeId } = args

  const lineUserId = event.source?.userId
  if (!lineUserId) {
    // group / room event 暫時略過、demo 只處理 1:1
    return
  }

  const supabase = getSupabaseAdminClient()

  // 5a. 寫 inbound 紀錄（無論 active 與否、紀錄要留）
  const inboundContent =
    event.type === 'message' && event.message?.type === 'text'
      ? (event.message.text ?? '')
      : event.type === 'postback'
        ? (event.postback?.data ?? '')
        : `[${event.type}/${event.message?.type ?? 'unknown'}]`

  const inboundType =
    event.type === 'postback' ? 'postback' : (event.message?.type ?? event.type)

  const { error: insertErr } = await supabase.from('line_conversation_messages').insert({
    workspace_id: workspaceId,
    line_user_id: lineUserId,
    direction: 'inbound',
    sender: 'customer',
    message_type: inboundType,
    content: inboundContent,
    raw_event: event as unknown as Json,
    reply_token: event.replyToken ?? null,
  })

  if (insertErr) {
    logger.error(`${HANDLER_NAME}: failed to write inbound message`, insertErr, {
      workspaceId,
    })
  }

  // 5/14 雙寫過渡：同時寫進 unified inbox（inbox_conversations + inbox_messages）
  // 過渡期 backfill apply 後可拔上面舊寫入路徑、code 改走純 inbox_*
  await recordInboxMessage(supabase, {
    workspaceId,
    channelType: 'line',
    externalUserId: lineUserId,
    direction: 'inbound',
    senderType: 'contact',
    messageType: inboundType,
    content: inboundContent,
    sourceId: event.message?.id ?? null,
    rawEvent: event,
  })

  // 5a-2. upsert line_user_profiles（display name / picture url、之後 UI 顯示真名 + 頭像）
  // 第一次見到的 line user 才 fetch profile、避免每則訊息都打 LINE API
  // line_user_profiles / line_conversation_overrides 尚未納入生成類型，用 unknown 中轉
  const supabaseAny = supabase as unknown as SupabaseClient
  const { data: existingProfile } = await supabaseAny
    .from('line_user_profiles')
    .select('id, display_name')
    .eq('workspace_id', workspaceId)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (!existingProfile?.display_name) {
    // 新人 / 沒 profile、抓
    const profile = await fetchLineProfile({ lineUserId, channelAccessToken })
    if (profile) {
      await supabaseAny.from('line_user_profiles').upsert(
        {
          workspace_id: workspaceId,
          line_user_id: lineUserId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl ?? null,
          status_message: profile.statusMessage ?? null,
          language: profile.language ?? null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,line_user_id' }
      )
    }
  } else {
    // 既有 profile、只更新 last_seen_at
    await supabaseAny
      .from('line_user_profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('line_user_id', lineUserId)
  }

  // 5b. 沒啟用就不回覆（仍記錄 inbound、之後 admin 後台可看）
  if (!isActive) {
    return
  }

  if (!event.replyToken) {
    return
  }

  // 5c. 只處理 text 訊息走 state machine、其他 type（sticker / image / postback）暫時不回
  if (event.type !== 'message' || event.message?.type !== 'text') {
    return
  }

  // 5d. 檢查 agent 有沒有暫停這個對話的 bot 自動回覆（真人接管模式）
  const { data: override } = await supabaseAny
    .from('line_conversation_overrides')
    .select('bot_paused, paused_until')
    .eq('workspace_id', workspaceId)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (override?.bot_paused) {
    // 沒過期就靜默：bot 不回、紀錄已寫、agent 自己處理
    if (!override.paused_until || new Date(override.paused_until) > new Date()) {
      return
    }
  }

  const userText = event.message.text ?? ''
  const ctx: BotContext = {
    workspaceId,
    botEmployeeId,
    lineUserId,
    channelAccessToken,
    lineDisplayName: null,
  }

  // T1.3 state machine 接手（內部已處理 reply + outbound 紀錄 + 建單）
  await processIncomingTextMessage(ctx, userText, event.replyToken)
}

/**
 * GET /api/line/webhook
 * LINE 「Verify」按鈕會打 POST、不是 GET、但提供 GET 回應方便人類 browser 檢查
 */
export function GET() {
  return NextResponse.json(
    {
      handler: HANDLER_NAME,
      info: 'LINE webhook endpoint. Send POST with valid X-Line-Signature header.',
    },
    { status: 200 }
  )
}
