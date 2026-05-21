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

export const maxDuration = 60 // Vercel Hobby 最高 60s；背景 task 10s + LLM 最多 45s

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import { verifyLineSignature } from '@/lib/line/verify-signature'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { processIncomingTextMessage } from '@/lib/line/handler'
import { fetchLineProfile, fetchLineGroupMemberProfile, fetchLineRoomMemberProfile, fetchLineGroupSummary, fetchLineGroupMemberIds } from '@/lib/line/profile-client'
import { recordInboxMessage } from '@/lib/messaging/inbox'
import { downloadAndStoreLineMedia } from '@/lib/line/media-client'
import { upsertDebounceAccumulate } from '@/lib/line/debounce'
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
  channel_secret: string | null
  channel_access_token: string | null
  channel_secret_encrypted: string | null
  channel_access_token_encrypted: string | null
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
    .select('workspace_id, channel_secret, channel_access_token, channel_secret_encrypted, channel_access_token_encrypted, is_active, bot_employee_id')
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

  // 3.5. 解密 token/secret（優先加密欄，fallback 明文緩衝期欄）
  let channelSecret: string
  let channelAccessToken: string
  try {
    channelSecret = settings.channel_secret_encrypted
      ? decryptIntegrationSecret(settings.channel_secret_encrypted)
      : (settings.channel_secret ?? '')
    channelAccessToken = settings.channel_access_token_encrypted
      ? decryptIntegrationSecret(settings.channel_access_token_encrypted)
      : (settings.channel_access_token ?? '')
  } catch (cryptoErr) {
    logger.error(`${HANDLER_NAME}: decrypt credentials failed`, cryptoErr, { destination })
    return NextResponse.json({ error: 'decrypt failed' }, { status: 503 })
  }

  if (!channelSecret || !channelAccessToken) {
    logger.warn(`${HANDLER_NAME}: credentials missing for workspace`, { destination })
    return NextResponse.json({ error: 'credentials not configured' }, { status: 503 })
  }

  // 4. 驗簽章（用該 workspace 的 channel_secret）
  const sigCheck = verifyLineSignature(rawBody, signature, channelSecret)
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
        channelAccessToken,
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

  const source = event.source
  if (!source) return

  // 群組 / 多人聊天室：只記錄、不回應（William 2026-05-17 拍板、之後做復盤功能）
  if (source.type === 'group' || source.type === 'room') {
    await recordGroupOrRoomMessage(workspaceId, source, event, channelAccessToken)
    return
  }

  const lineUserId = source.userId
  if (!lineUserId) {
    // 連 userId 都沒（罕見 edge case）、靜默略過
    return
  }

  const supabase = getSupabaseAdminClient()

  // 5a. 寫 inbound 紀錄（無論 active 與否、紀錄要留）
  // 非文字訊息給 UI 看得懂的友善描述（圖片下載 / 預覽未來實作、現在先標明類型）
  const inboundContent =
    event.type === 'message' && event.message?.type === 'text'
      ? (event.message.text ?? '')
      : event.type === 'postback'
        ? (event.postback?.data ?? '')
        : describeNonTextMessage(event)

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

  // 圖片 / 媒體：下載後上傳到 line-media bucket
  let mediaUrl: string | null = null
  if (event.type === 'message' && event.message?.id) {
    const mediaTypes = ['image', 'video', 'audio', 'file']
    if (mediaTypes.includes(event.message.type)) {
      const result = await downloadAndStoreLineMedia(supabase, {
        messageId: event.message.id,
        channelAccessToken,
        workspaceId,
        lineUserId,
      })
      mediaUrl = result.url
    }
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
    mediaUrl,
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

      // 同步寫 inbox_conversations.display_name / picture_url
      // （recordInboxMessage 先跑了、conv row 已存在、只是 name/avatar 是 null、
      //  這邊把 LINE profile 抓到的補上、對話管理 UI 立刻看得到名字 + 頭像）
      await supabaseAny
        .from('inbox_conversations')
        .update({
          display_name: profile.displayName,
          picture_url: profile.pictureUrl ?? null,
        })
        .eq('workspace_id', workspaceId)
        .eq('channel_type', 'line')
        .eq('external_user_id', lineUserId)
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

  // 5b-2. Postback 事件：查 line_postback_templates 自動回覆（不需 replyToken）
  if (event.type === 'postback' && event.postback?.data) {
    await handlePostbackAutoReply({
      supabaseAny,
      workspaceId,
      lineUserId,
      postbackData: event.postback.data,
      channelAccessToken,
    })
    return
  }

  if (!event.replyToken) {
    return
  }

  // 5c. 只處理 text 訊息走 state machine、其他 type（sticker / image）暫時不回
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

  // 5e. Debounce：累積訊息，靜默 10s 後用 Reply API 回（免費，不用 Push API）
  await upsertDebounceAccumulate(supabase, {
    workspaceId,
    lineUserId,
    userText,
    replyToken: event.replyToken ?? null,
  })

  // 背景任務：webhook 回 200 後繼續跑（不佔 webhook response 時間）
  // 等 12 秒後原子搶：UPDATE ... WHERE sent_at IS NULL AND last_message_at < now-10s
  // 若有更新的訊息在 10s 內到達，last_message_at 較新，搶不到 → 讓那條的背景任務去搶
  //
  // 為什麼用 void IIFE 而非 Next.js after()：
  //   after() 在 Vercel 是平台級保留機制、self-hosted Coolify Docker 沒對應實作、
  //   訊息會卡 debounce 表沒人沖（5/19 凌晨~晚上 7:30 跨平台搬遷後實際發生）。
  //   void IIFE 是純 Node.js、event loop 有 setTimeout 就不釋放、Coolify 也跑得完。
  void (async () => {
    try {
      await new Promise((r) => setTimeout(r, 10_000))

      const supabaseInner = getSupabaseAdminClient() as unknown as SupabaseClient

      // SELECT 先確認 row 可以搶（不立刻設 sent_at）
      const { data: rows } = await supabaseInner
        .from('line_bot_reply_debounce')
        .select('accumulated_text, reply_token')
        .eq('workspace_id', workspaceId)
        .eq('line_user_id', lineUserId)
        .is('sent_at', null)
        .lt('last_message_at', new Date(Date.now() - 10_000).toISOString())
        .limit(1)

      const row = rows?.[0]
      if (!row?.accumulated_text) return

      // 先跑 LLM + 送訊息，成功後才標 sent_at
      // 若 process 在這裡被砍掉 → sent_at 仍是 null → flush cron 可以補送（用 Push API 兜底）
      await processIncomingTextMessage(ctx, row.accumulated_text, row.reply_token ?? null)
      await supabaseInner
        .from('line_bot_reply_debounce')
        .update({ sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('line_user_id', lineUserId)
        .is('sent_at', null)
    } catch (err) {
      logger.error(`${HANDLER_NAME}: background debounce task failed`, err)
    }
  })()
}

/**
 * 處理群組 / 多人聊天室訊息：只記錄、不回應。
 *
 * 設計（William 2026-05-17 拍板「一次到位」）：
 *   - external_user_id 用 prefix：`group:<groupId>` / `room:<roomId>`
 *   - display_name 預設「LINE 群組」、有發訊者就 try fetchLineProfile 抓真名 + 頭像（cache 在 line_user_profiles）
 *   - 訊息 content 內 prefix `[真名]` 而不是末 6 碼（profile cache miss 才 fallback 末 6 碼）
 *   - 不走 processIncomingTextMessage、不 sendReply
 */
async function recordGroupOrRoomMessage(
  workspaceId: string,
  source: LineEventSource,
  event: LineEvent,
  channelAccessToken: string
): Promise<void> {
  const isGroup = source.type === 'group'
  const containerId = isGroup ? source.groupId : source.roomId
  if (!containerId) return

  const externalUserId = `${isGroup ? 'group' : 'room'}:${containerId}`

  // 抓發訊者 profile（cache + on-demand）：群組真名顯示
  // 限制：普通 OA 只能拿「加 OA 為好友」的成員 profile、其他成員 fetchLineProfile 會 404
  const senderUserId = source.userId ?? null
  let senderName = '匿名'

  if (senderUserId) {
    const supabaseTemp = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data: existingProfile } = await supabaseTemp
      .from('line_user_profiles')
      .select('display_name')
      .eq('workspace_id', workspaceId)
      .eq('line_user_id', senderUserId)
      .maybeSingle<{ display_name: string | null }>()

    if (existingProfile?.display_name) {
      senderName = existingProfile.display_name
    } else {
      // 用 getGroupMemberProfile / getRoomMemberProfile（不限好友、所有 OA 都能用）
      // 跟 fetchLineProfile (個人 profile 限好友) 不同
      const profile = isGroup
        ? await fetchLineGroupMemberProfile({
            groupId: containerId,
            lineUserId: senderUserId,
            channelAccessToken,
          })
        : await fetchLineRoomMemberProfile({
            roomId: containerId,
            lineUserId: senderUserId,
            channelAccessToken,
          })
      if (profile) {
        senderName = profile.displayName
        await supabaseTemp.from('line_user_profiles').upsert(
          {
            workspace_id: workspaceId,
            line_user_id: senderUserId,
            display_name: profile.displayName,
            picture_url: profile.pictureUrl ?? null,
            language: profile.language ?? null,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id,line_user_id' }
        )
      } else {
        // API 真的失敗（極少見、可能 bot 已離群）、用「成員-末4碼」
        senderName = `成員-${senderUserId.slice(-4)}`
      }
    }
  }

  // 先查是否已有對話（有就不帶 displayName、避免蓋掉 agent 自訂名）
  const supabaseForConvCheck = getSupabaseAdminClient() as unknown as SupabaseClient
  const { data: existingGroupConv } = await supabaseForConvCheck
    .from('inbox_conversations')
    .select('id, display_name, picture_url')
    .eq('workspace_id', workspaceId)
    .eq('channel_type', 'line')
    .eq('external_user_id', externalUserId)
    .maybeSingle<{ id: string; display_name: string | null; picture_url: string | null }>()

  // 是否要設 display_name：沒對話、或之前是預設格式（「群組 #xxxx」、「LINE 群組」）
  // 重點：之前是「群組 #末4碼」格式的、也算「沒設過真名」、應該升級成 API 抓到的真名
  const existingName = existingGroupConv?.display_name
  const isDefaultName = !existingName || /^群組 #[0-9a-f]{4}$/i.test(existingName) || existingName === 'LINE 群組'
  const shouldSetDisplayName = isDefaultName

  // 群組名 Phase 2（2026-05-18 William 拍板）：
  // 一般 OA 即可呼叫 getGroupSummary（實測角落旅遊 OA 可用、不需 Verified）。
  // 只在「該設新名字」時 fetch、避免每則訊息都打 LINE API。
  // room（多人臨時聊天室）沒對應 API、走 fallback。
  const defaultDisplayName = isGroup
    ? `群組 #${containerId.slice(-4)}`
    : `多人聊天 #${containerId.slice(-4)}`

  let resolvedDisplayName = defaultDisplayName
  let resolvedPictureUrl: string | null = null
  if (shouldSetDisplayName && isGroup) {
    const summary = await fetchLineGroupSummary({
      groupId: containerId,
      channelAccessToken,
    })
    if (summary?.groupName) {
      resolvedDisplayName = summary.groupName
      resolvedPictureUrl = summary.pictureUrl ?? null
    }

    // 同時 backfill 全員 profile（連沒講過話的、未來看訊息能直接看到名字）
    // 不擋主流程、async fire-and-forget
    void backfillGroupMembers({
      workspaceId,
      groupId: containerId,
      channelAccessToken,
    })
  }

  const rawContent =
    event.type === 'message' && event.message?.type === 'text'
      ? (event.message.text ?? '')
      : event.type === 'postback'
        ? (event.postback?.data ?? '')
        : describeNonTextMessage(event)

  // 訊息 content 內 prefix 真名（不是末 6 碼）
  const taggedContent = `[${senderName}] ${rawContent}`

  const inboundType =
    event.type === 'postback' ? 'postback' : (event.message?.type ?? event.type)

  const supabase = getSupabaseAdminClient()

  await recordInboxMessage(supabase, {
    workspaceId,
    channelType: 'line',
    externalUserId,
    direction: 'inbound',
    senderType: 'contact',
    messageType: inboundType,
    content: taggedContent,
    sourceId: event.message?.id ?? null,
    rawEvent: event,
    ...(shouldSetDisplayName && { displayName: resolvedDisplayName }),
    ...(shouldSetDisplayName && { pictureUrl: resolvedPictureUrl }),
  })

  // 群組秘書：偵測待辦任務關鍵字 → 自動建 todo
  if (event.type === 'message' && event.message?.type === 'text' && rawContent) {
    await maybeCreateGroupTodo({
      supabase: getSupabaseAdminClient() as unknown as SupabaseClient,
      workspaceId,
      rawText: rawContent,
      senderName,
    })
  }
}

/**
 * 群組第一次進來、把全員 profile 一次抓回來 cache 進 line_user_profiles。
 *
 * 為什麼：
 *   原本只有「發訊者」才會被抓 profile、cache 起來。沒講過話的成員、後台
 *   看不到名字。這個 helper 在 bot 第一次見到群組時、用 members/ids + 逐個
 *   getGroupMemberProfile 把全員名字 + 頭像補齊。
 *
 * 設計：
 *   - fire-and-forget 跑、不阻塞 webhook
 *   - 只抓 line_user_profiles 沒 cache 過的成員、避免重打 API
 *   - 失敗不擋（API 偶爾 429 也吞掉）
 *
 * 觸發點：recordGroupOrRoomMessage 內、shouldSetDisplayName=true 時呼叫
 *   （= 第一次見群組 / 之前是預設名）。
 */
async function backfillGroupMembers(args: {
  workspaceId: string
  groupId: string
  channelAccessToken: string
}): Promise<void> {
  const { workspaceId, groupId, channelAccessToken } = args
  try {
    const memberIds = await fetchLineGroupMemberIds({ groupId, channelAccessToken })
    if (!memberIds || memberIds.length === 0) return

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 篩出還沒 cache 過名字的（已有就跳、不重打 API）
    const { data: existing } = await supabase
      .from('line_user_profiles')
      .select('line_user_id, display_name')
      .eq('workspace_id', workspaceId)
      .in('line_user_id', memberIds)

    const cachedSet = new Set(
      ((existing ?? []) as { line_user_id: string; display_name: string | null }[])
        .filter(p => p.display_name)
        .map(p => p.line_user_id)
    )
    const missing = memberIds.filter(id => !cachedSet.has(id))

    logger.info(`${HANDLER_NAME}: backfill group members`, {
      groupId,
      total: memberIds.length,
      cached: cachedSet.size,
      toFetch: missing.length,
    })

    // 逐個抓（small group 100ms each 也才幾秒、不擋 webhook 因為 fire-and-forget）
    for (const userId of missing) {
      const profile = await fetchLineGroupMemberProfile({
        groupId,
        lineUserId: userId,
        channelAccessToken,
      })
      if (!profile) continue
      await supabase.from('line_user_profiles').upsert(
        {
          workspace_id: workspaceId,
          line_user_id: userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl ?? null,
          language: profile.language ?? null,
          last_seen_at: null, // 沒講過話、不該動 last_seen_at
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,line_user_id' }
      )
    }
  } catch (err) {
    logger.debug(`${HANDLER_NAME}: backfillGroupMembers failed (ignored)`, {
      groupId,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

const SECRETARY_PREFIXES = [
  '待辦：', '待辦:', '待辦 ',
  '任務：', '任務:', '任務 ',
  '#待辦', '#任務', '#todo',
  'todo:', 'TODO:', 'Todo:',
  '@秘書 ', '@secretary ',
]

async function maybeCreateGroupTodo(args: {
  supabase: SupabaseClient
  workspaceId: string
  rawText: string
  senderName: string
}): Promise<void> {
  const { supabase, workspaceId, rawText, senderName } = args
  const trimmed = rawText.trim()

  let taskTitle: string | null = null
  for (const prefix of SECRETARY_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      taskTitle = trimmed.slice(prefix.length).trim()
      break
    }
  }

  if (!taskTitle) return

  // 取第一個 todo column（sort_order 最小的）
  const { data: col } = await supabase
    .from('todo_columns')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>()

  const { error } = await supabase.from('todos').insert({
    workspace_id: workspaceId,
    title: taskTitle.slice(0, 200),
    description: `由群組秘書自動建立 — 發訊者：${senderName}`,
    status: 'pending',
    priority: 2,
    column_id: col?.id ?? null,
  })

  if (error) {
    logger.warn(`${HANDLER_NAME}: group secretary todo insert failed`, {
      workspaceId,
      error: error.message,
    })
  } else {
    logger.info(`${HANDLER_NAME}: group secretary created todo`, {
      workspaceId,
      title: taskTitle.slice(0, 50),
    })
  }
}

/**
 * 把非文字 LINE event 轉成 UI 看得懂的友善描述。
 * 圖片 / 影片 / 貼圖等的實際內容下載（getMessageContent API）未來做、目前先標類型。
 */
function describeNonTextMessage(event: LineEvent): string {
  if (event.type === 'message') {
    const t = event.message?.type
    switch (t) {
      case 'image': return '📷 [客戶傳了一張圖片、暫未實作預覽]'
      case 'video': return '🎬 [客戶傳了一段影片]'
      case 'audio': return '🔊 [客戶傳了一段語音]'
      case 'file': return '📎 [客戶傳了一個檔案]'
      case 'sticker': return '😀 [客戶傳了一個貼圖]'
      case 'location': return '📍 [客戶傳了位置資訊]'
      default: return `[訊息類型：${t ?? '未知'}]`
    }
  }
  if (event.type === 'follow') return '👋 [客戶加為好友]'
  if (event.type === 'unfollow') return '👋 [客戶封鎖了 OA]'
  if (event.type === 'join') return '🤖 [Bot 加進群組]'
  if (event.type === 'leave') return '🤖 [Bot 離開群組]'
  if (event.type === 'memberJoined') return '👥 [新成員加入群組]'
  if (event.type === 'memberLeft') return '👥 [成員離開群組]'
  return `[事件：${event.type}]`
}

interface PostbackAutoReplyArgs {
  supabaseAny: SupabaseClient
  workspaceId: string
  lineUserId: string
  postbackData: string
  channelAccessToken: string
}

async function handlePostbackAutoReply(args: PostbackAutoReplyArgs): Promise<void> {
  const { supabaseAny, workspaceId, lineUserId, postbackData, channelAccessToken } = args

  const { data: template } = await supabaseAny
    .from('line_postback_templates')
    .select('id, response_text')
    .eq('workspace_id', workspaceId)
    .eq('postback_data', postbackData)
    .eq('is_active', true)
    .maybeSingle<{ id: string; response_text: string }>()

  if (!template?.response_text) return

  const { pushLineText } = await import('@/lib/line/push-client')
  const result = await pushLineText({
    channelAccessToken,
    toUserId: lineUserId,
    text: template.response_text,
  })

  if (!result.ok) {
    logger.warn(`${HANDLER_NAME}: postback auto-reply push failed`, {
      workspaceId,
      lineUserId,
      postbackData,
      error: result.error,
    })
    return
  }

  // 寫 outbound 到舊表
  await supabaseAny.from('line_conversation_messages').insert({
    workspace_id: workspaceId,
    line_user_id: lineUserId,
    direction: 'outbound',
    sender: 'bot',
    message_type: 'text',
    content: template.response_text,
    raw_event: { sent_via: 'postback_template', postback_data: postbackData, template_id: template.id },
  })

  // 寫 outbound 到 inbox_messages
  const { recordOutboundMessage, upsertConversation } = await import('@/lib/inbox/inbox-service')
  const convId = await upsertConversation({
    workspaceId,
    channelType: 'line',
    externalUserId: lineUserId,
  })
  if (convId) {
    await recordOutboundMessage({
      conversationId: convId,
      workspaceId,
      sourceId: null,
      senderType: 'system',
      senderEmployeeId: null,
      messageType: 'text',
      content: template.response_text,
      rawEvent: { sent_via: 'postback_template', postback_data: postbackData },
    })
  }
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
