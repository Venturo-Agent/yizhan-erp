/**
 * LINE Bot 對話 handler（state machine + LLM 組答）
 *
 * 卡片：[[03-LINE-Bot-第一階段]] § 6.1
 *
 * 流程（webhook router 負責 inbound 紀錄、本 module 接手回覆）：
 *
 *   processIncomingTextMessage(ctx, text, replyToken)
 *     1. 撈 customer profile (line_user_id → customer)
 *     2. 撈最近對話 history (預設 30 條)
 *     3. parse 意圖 + 抓日期 → 撈 KB tours (±14 天)
 *     4. 組 LLM messages (system + history + KB context + user)
 *     5. call OpenRouter LLM
 *        ↳ 沒 OPENROUTER_API_KEY = fallback 簡易規則回覆
 *     6. 偵測「確認下單」signal + 完整資訊 → 呼叫 botCreateOrder
 *     7. reply LINE
 *     8. 寫 outbound 紀錄
 *
 * 為什麼用 single-turn LLM（不開 tools loop）：
 *   - LINE replyToken 30s 過期、tools loop 容易超時
 *   - KB 在 prompt 前先撈、LLM 只負責「依 KB 組回答」、不要瞎編
 *   - 「確認下單」用 regex 抓、不依賴 LLM tool call（LLM 在這比較不穩）
 *
 * 子模組：
 *   - line-intent-parser.ts  — 意圖解析（日期 / 人數 / 確認下單）
 *   - line-llm-compose.ts    — LLM 組答 + fallback
 */

import { replyToLine } from '@/lib/line/reply-client'
import {
  botCreateOrder,
  botEnsureCustomer,
  botGetRecentMessages,
  botRecordMessage,
  botSearchTours,
} from '@/lib/line/erp-bridge'
import { isOpenRouterConfigured } from '@/lib/llm/openrouter-client'
import { logger } from '@/lib/utils/logger'
import { parseIntent } from '@/lib/line/line-intent-parser'
import { composeReply } from '@/lib/line/line-llm-compose'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { generateMemorySummary, MAX_FAILED_ATTEMPTS } from '@/lib/ai/memory-summarizer'
import type { BotContext, LineMessageRow, TourSummary } from '@/types/line.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// 速記卡觸發門檻：每對話累積 N 則新訊息、AI 自動重寫一張速記卡（William 2026-05-18 拍板）
const MEMORY_SUMMARY_THRESHOLD = 20

// re-export so existing callers don't break
export { parseIntent } from '@/lib/line/line-intent-parser'

const HANDLER = 'line-handler'

// ============================================================================
// public entry
// ============================================================================

export interface ProcessResult {
  /** bot 回覆的純文字（已送 LINE） */
  replyText: string
  /** 是否有走完整 LLM 流程（false = fallback / skipped） */
  llmUsed: boolean
  /** 如果有建單、回 order code */
  createdOrderCode?: string
  /** debug 訊息（dev 看 log 用） */
  debugReason?: string
}

/**
 * 處理一條 inbound text 訊息。
 *
 * 不 throw（webhook 上層用 catch、但 handler 自己應吃掉所有錯、最差也回個 fallback 訊息）。
 */
export async function processIncomingTextMessage(
  ctx: BotContext,
  userText: string,
  replyToken: string | null
): Promise<ProcessResult> {
  if (!userText?.trim()) {
    return { replyText: '', llmUsed: false, debugReason: 'empty user text' }
  }
  if (!ctx.botEmployeeId) {
    // bot 還沒被自助開通完成（沒系統員工）= 不能跑業務邏輯
    const msg = '系統設定尚未完成、請聯繫管理員啟用 LINE Bot 自助開通流程。'
    await sendReply(ctx, replyToken, msg)
    return {
      replyText: msg,
      llmUsed: false,
      debugReason: 'bot_employee_id missing',
    }
  }

  // 1. customer profile（同時 link line_user_id → customer）
  // freestyle 模式：customer 建不起來不擋路、繼續走、Bot 仍可亂回
  let customerId: string | null = null
  let customerName: string | null = null
  try {
    const customer = await botEnsureCustomer(ctx)
    customerId = customer.id
    customerName = customer.name
  } catch (err) {
    logger.warn(`${HANDLER}: ensure customer failed (freestyle 模式繼續往下)`, {
      workspaceId: ctx.workspaceId,
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 1b. inbox conversation id（給速記卡 lookup 用）
  // recordInboxMessage 已在 webhook router 跑過、conversation row 必存在
  const conversationId = await findInboxConversationId(ctx.workspaceId, ctx.lineUserId)

  // 2. 最近對話 history（William 2026-05-17 拍板改 200 條、含群組對話）
  // Supabase 存的不費錢、上下文越多 LLM 對長期客戶記性越好
  let history: LineMessageRow[] = []
  try {
    history = await botGetRecentMessages(ctx, 200)
  } catch (err) {
    logger.warn(`${HANDLER}: get recent messages failed (continue with empty)`, {
      workspaceId: ctx.workspaceId,
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // 3. 抓意圖 + 撈 KB tours
  const intent = parseIntent(userText)
  let tours: TourSummary[] = []
  if (intent.targetDate) {
    try {
      tours = await botSearchTours(ctx, {
        targetDate: intent.targetDate,
        daysBefore: 14,
        daysAfter: 14,
        limit: 8,
      })
    } catch (err) {
      logger.warn(`${HANDLER}: search tours failed (continue)`, {
        workspaceId: ctx.workspaceId,
        targetDate: intent.targetDate,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // 4. 偵測「確認下單」+ 嘗試建單
  let createdOrderCode: string | undefined
  if (intent.wantsToConfirmOrder && customerId) {
    const orderResult = await tryCreateOrderFromHistory({
      ctx,
      customerId,
      customerName: customerName ?? '',
      userText,
      history,
      candidateTours: tours,
    })
    if (orderResult.created) {
      createdOrderCode = orderResult.code
      const replyText = `✅ 已建立訂單：${orderResult.code}\n團名：${orderResult.tourName}\n聯絡人：${orderResult.contactPerson}\n金額：NT$ ${orderResult.totalAmount.toLocaleString('en-US')}\n\n業務會在 1 小時內聯繫您確認。`
      await sendReply(ctx, replyToken, replyText)
      await botRecordMessage(ctx, {
        direction: 'outbound',
        senderType: 'bot',
        content: replyText,
        messageType: 'text',
        relatedOrderId: orderResult.orderId,
      })
      return { replyText, llmUsed: false, createdOrderCode, debugReason: 'order created' }
    }
    // 建單失敗 → 走 LLM 回應（讓 bot 解釋缺什麼）
  }

  // 5. LLM 組答（fallback 處理）
  const replyText = await composeReply({
    ctx,
    userText,
    history,
    tours,
    customerName,
    conversationId,
  })

  // 6. send reply
  await sendReply(ctx, replyToken, replyText)

  // 7. 寫 outbound 紀錄
  await botRecordMessage(ctx, {
    direction: 'outbound',
    senderType: 'bot',
    content: replyText,
    messageType: 'text',
  })

  // 8. 速記卡觸發判斷（fire-and-forget、不阻塞 webhook 回應）
  // 每對話累積 20 則訊息、AI 自己重寫一張速記卡（William 2026-05-18 拍板）
  if (conversationId) {
    void maybeTriggerMemorySummary(ctx.workspaceId, conversationId)
  }

  return {
    replyText,
    llmUsed: isOpenRouterConfigured(),
  }
}

// ============================================================================
// inbox conversation lookup
// ============================================================================

async function findInboxConversationId(
  workspaceId: string,
  lineUserId: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data } = await supabase
      .from('inbox_conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('channel_type', 'line')
      .eq('external_user_id', lineUserId)
      .maybeSingle<{ id: string }>()
    return data?.id ?? null
  } catch (err) {
    logger.debug('findInboxConversationId failed (ignored)', {
      workspaceId,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ============================================================================
// memory summary trigger（rolling summary memory）
// ============================================================================

/**
 * 判斷該不該觸發摘要、是就 fire-and-forget 跑。
 *
 * 觸發條件：
 *   - 對話累積訊息數 - 上次摘要時的數字 >= 20
 *   - 速記卡失敗次數 < MAX_FAILED_ATTEMPTS（連續失敗暫停）
 *
 * 不 await、不阻塞 webhook 回應。失敗在 generateMemorySummary 內部處理（記 last_error）。
 */
async function maybeTriggerMemorySummary(
  workspaceId: string,
  conversationId: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 查當前對話訊息總數
    const { count: currentCount } = await supabase
      .from('inbox_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (!currentCount || currentCount < MEMORY_SUMMARY_THRESHOLD) {
      // 對話太短、還沒到第一次觸發點（20 則）、跳過
      return
    }

    // 查上次摘要的進度
    const memoryQuery = supabase
      .from('customer_memories')
      .select('last_summarized_message_count, failed_attempts')
      .eq('conversation_id', conversationId)
    const { data: memory } = await filterActive(memoryQuery)
      .maybeSingle<{ last_summarized_message_count: number; failed_attempts: number }>()

    const lastCount = memory?.last_summarized_message_count ?? 0
    const failed = memory?.failed_attempts ?? 0

    if (failed >= MAX_FAILED_ATTEMPTS) {
      logger.info(`${HANDLER}: memory summary paused (too many failures)`, {
        conversationId,
        failed,
      })
      return
    }

    if (currentCount - lastCount < MEMORY_SUMMARY_THRESHOLD) {
      return
    }

    logger.info(`${HANDLER}: trigger memory summary`, {
      conversationId,
      currentCount,
      lastCount,
      diff: currentCount - lastCount,
    })

    // fire-and-forget、不 await
    void generateMemorySummary({
      conversationId,
      workspaceId,
      currentMessageCount: currentCount,
    })
  } catch (err) {
    logger.debug('maybeTriggerMemorySummary failed (ignored)', {
      conversationId,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

// ============================================================================
// 建單嘗試（從對話 history + 當前訊息 推完整資訊）
// ============================================================================

interface OrderAttemptArgs {
  ctx: BotContext
  customerId: string
  customerName: string
  userText: string
  history: LineMessageRow[]
  candidateTours: TourSummary[]
}

type OrderAttemptResult =
  | {
      created: true
      code: string
      orderId: string
      tourName: string
      contactPerson: string
      totalAmount: number
    }
  | {
      created: false
      reason: string
    }

/**
 * 從歷史對話 + 當前訊息 拼出建單參數。
 *
 * MVP demo：
 *   - 團：取 candidateTours[0]（如果有）、或從 history 抓 [code] pattern
 *   - 人數：合併歷史 + 當前訊息的 parseIntent
 *   - 聯絡人：用客戶 name fallback、或當前訊息 nameHint
 *   - 電話：當前訊息或歷史抓
 *   - 金額：tour.selling_price_per_person * 總人數
 *
 * 任何欄位缺 → 不建單、回 reason、上層走 LLM 引導補齊
 */
async function tryCreateOrderFromHistory(args: OrderAttemptArgs): Promise<OrderAttemptResult> {
  const { ctx, customerId, customerName, userText, history, candidateTours } = args

  // 合併歷史 inbound 訊息成一個大文字、抓資訊
  const historyText = history
    .filter(m => m.direction === 'inbound')
    .map(m => m.content ?? '')
    .join('\n')

  const merged = `${historyText}\n${userText}`
  const intent = parseIntent(merged)

  // 1. 找團：優先 candidateTours[0]、否則從 history bot 回覆抓 [CODE]
  let tour = candidateTours[0]
  if (!tour) {
    const codeMatch = history
      .filter(m => m.direction === 'outbound')
      .map(m => m.content ?? '')
      .join('\n')
      .match(/\[([A-Z]{2,4}\d{6}[A-Z])\]/)
    if (codeMatch) {
      // 反查不到完整 row 也算 fail（demo 簡化、不做 fetch）
      return { created: false, reason: `找到舊團號 ${codeMatch[1]} 但 KB 沒回傳完整資訊` }
    }
    return { created: false, reason: 'no candidate tour' }
  }

  // 2. 人數
  const adults = intent.adults ?? 1
  const children = intent.children ?? 0
  const infants = intent.infants ?? 0
  const memberCount = adults + children + infants
  if (memberCount < 1) {
    return { created: false, reason: 'no participant count' }
  }

  // 3. 聯絡人 + 電話
  const contactPerson = intent.nameHint ?? customerName ?? 'LINE 客戶'
  const phone = intent.phone

  // 4. 金額（只算成人 + 兒童、嬰兒當免費）
  const ppp = tour.selling_price_per_person
  if (ppp == null || ppp <= 0) {
    return { created: false, reason: `tour ${tour.code} 沒設 selling_price_per_person` }
  }
  const totalAmount = (adults + children) * ppp
  if (totalAmount <= 0) {
    return { created: false, reason: 'computed totalAmount <= 0' }
  }

  // 5. 建單
  try {
    const order = await botCreateOrder(ctx, {
      tourId: tour.id,
      tourName: tour.name,
      customerId,
      contactPerson,
      contactPhone: phone,
      contactEmail: null,
      departureDate: tour.departure_date,
      adultCount: adults,
      memberCount,
      identityOptions: {
        adult: adults,
        child: children,
        infant: infants,
      },
      totalAmount,
      notes: `LINE Bot 建單。原始訊息：${userText.slice(0, 200)}`,
    })

    return {
      created: true,
      code: order.order_number || '',
      orderId: order.id,
      tourName: tour.name,
      contactPerson,
      totalAmount,
    }
  } catch (err) {
    logger.error(`${HANDLER}: botCreateOrder failed`, err, {
      workspaceId: ctx.workspaceId,
      tourId: tour.id,
    })
    return {
      created: false,
      reason: err instanceof Error ? err.message : 'create order error',
    }
  }
}

// ============================================================================
// reply helper
// ============================================================================

async function sendReply(ctx: BotContext, replyToken: string | null, text: string): Promise<void> {
  if (!text?.trim()) return
  if (replyToken) {
    // Reply API（webhook 即時 path，token 有效期 5 min）
    const res = await replyToLine({
      replyToken,
      messages: [{ type: 'text', text: text.slice(0, 4900) }], // LINE 5000 char limit
      channelAccessToken: ctx.channelAccessToken,
    })
    if (!res.ok) {
      logger.warn(`${HANDLER}: reply failed`, {
        workspaceId: ctx.workspaceId,
        status: res.status,
        error: res.error,
      })
    }
  } else {
    // PUSH API（debounce flush path，無 reply token）
    const { pushLineText } = await import('@/lib/line/push-client')
    const res = await pushLineText({
      channelAccessToken: ctx.channelAccessToken,
      toUserId: ctx.lineUserId,
      text: text.slice(0, 4900),
    })
    if (!res.ok) {
      logger.warn(`${HANDLER}: push failed`, {
        workspaceId: ctx.workspaceId,
        status: res.status,
        error: res.error,
      })
    }
  }
}
