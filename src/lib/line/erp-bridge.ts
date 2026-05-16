/**
 * LINE Bot ↔ ERP bridge
 *
 * 卡片：[[03-LINE-Bot-第一階段]] § 4.4（admin client + 程式碼層守門 + audit log）
 *
 * 設計原則：
 *   - 一律用 admin client (繞 RLS)、bot 沒 cookie / session
 *   - workspace_id 強制用 ctx 帶進來、不信任任何 input.workspaceId
 *   - audit_logs.actor_id = bot_employee_id（追責）
 *   - bot 不碰 finance.* / 不改 payment_status（卡片 § 七）
 *   - 金額守門：MAX 1M、MIN 100
 *   - 沒 bot_employee_id（自助開通沒跑完）= 不能寫任何東西
 *
 * 子模組：
 *   - erp-bridge-internal.ts  — 共用 constants / assert / audit / clamp
 *   - erp-bridge-customer.ts  — botEnsureCustomer
 *   - erp-bridge-tour.ts      — botSearchTours / botGetTourDetails / botCreateOrder
 *
 * 對話訊息 read / write（botRecordMessage / botGetRecentMessages）在本檔、
 * 因為依賴 inbox 雙寫邏輯、體積適中、不拆。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { recordInboxMessage } from '@/lib/messaging/inbox'
import type {
  BotContext,
  LineMessageDirection,
  LineMessageRow,
  LineMessageSender,
} from '@/types/line.types'
import {
  assertCanRead,
  clamp,
  DEFAULT_RECENT_MESSAGES,
  HANDLER,
  SAFETY,
} from '@/lib/line/erp-bridge-internal'

// re-export 子模組 public API 維持對外 SSOT
export { botEnsureCustomer } from '@/lib/line/erp-bridge-customer'
export { botSearchTours, botGetTourDetails, botCreateOrder } from '@/lib/line/erp-bridge-tour'

// ============================================================================
// 對話訊息 read / write
// ============================================================================

interface RecordMessageInput {
  direction: LineMessageDirection
  senderType: LineMessageSender
  content: string
  messageType?: string // 'text' | 'sticker' | 'postback' ...
  replyToken?: string | null
  relatedOrderId?: string | null
  /** 若 sender=employee、紀錄是哪個員工發的（FK 暫不存、預留） */
  senderEmployeeId?: string | null
  /** raw event JSON（inbound 才有用） */
  rawEvent?: unknown
}

/**
 * 寫一筆對話訊息（webhook router 已寫 inbound、本 function 給 bot 回覆 / 真人接管用）
 */
export async function botRecordMessage(
  ctx: BotContext,
  input: RecordMessageInput
): Promise<void> {
  assertCanRead(ctx, 'botRecordMessage')

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase.from('line_conversation_messages').insert({
    workspace_id: ctx.workspaceId,
    line_user_id: ctx.lineUserId,
    direction: input.direction,
    sender: input.senderType,
    message_type: input.messageType ?? 'text',
    content: input.content,
    reply_token: input.replyToken ?? null,
    related_order_id: input.relatedOrderId ?? null,
    raw_event: (input.rawEvent ?? null) as never,
  })

  if (error) {
    logger.error(`${HANDLER}: record message failed`, error, {
      workspaceId: ctx.workspaceId,
      direction: input.direction,
    })
    // 不 throw、訊息記不到不該整個流程炸
  }

  // 5/14 雙寫過渡：同時寫進 unified inbox（inbox_conversations + inbox_messages）
  // sender map：bot/ai → ai_agent / agent → agent / customer → contact
  const senderTypeMap: Record<string, 'contact' | 'agent' | 'ai_agent' | 'system'> = {
    customer: 'contact',
    agent: 'agent',
    bot: 'ai_agent',
    ai: 'ai_agent',
    ai_agent: 'ai_agent',
    system: 'system',
  }
  const inboxSenderType = senderTypeMap[input.senderType] ?? 'system'
  await recordInboxMessage(supabase, {
    workspaceId: ctx.workspaceId,
    channelType: 'line',
    externalUserId: ctx.lineUserId,
    direction: input.direction,
    senderType: inboxSenderType,
    messageType: input.messageType ?? 'text',
    content: input.content,
    rawEvent: input.rawEvent,
  })
}

/**
 * 拿最近 N 條對話（給 LLM 當 context）
 *
 * - 預設 30 條、上限 100
 * - 回時序由舊到新（方便直接組 messages[]）
 */
export async function botGetRecentMessages(
  ctx: BotContext,
  limit: number = DEFAULT_RECENT_MESSAGES
): Promise<LineMessageRow[]> {
  assertCanRead(ctx, 'botGetRecentMessages')

  const safeLimit = clamp(limit, 1, SAFETY.RECENT_MESSAGES_HARD_LIMIT)
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('line_conversation_messages')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .eq('line_user_id', ctx.lineUserId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    logger.error(`${HANDLER}: get recent messages failed`, error, {
      workspaceId: ctx.workspaceId,
    })
    throw error
  }

  // 由舊到新（方便直接餵 LLM）
  return ((data ?? []) as LineMessageRow[]).slice().reverse()
}
