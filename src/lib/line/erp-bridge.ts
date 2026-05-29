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

import type { SupabaseClient } from '@supabase/supabase-js'
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
 *
 * P2 寫入收斂（2026-05-29）：唯一寫入路徑 = unified inbox（inbox_conversations + inbox_messages）。
 * 不再雙寫 line_conversation_messages（紅線 E：同表寫入只一處）。related_order_id 直接帶進 inbox_messages。
 */
export async function botRecordMessage(ctx: BotContext, input: RecordMessageInput): Promise<void> {
  assertCanRead(ctx, 'botRecordMessage')

  const supabase = getSupabaseAdminClient()

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
    relatedOrderId: input.relatedOrderId ?? null,
  })
}

/** botGetRecentMessages 從 inbox_messages 撈出來、映射回 LineMessageRow 形狀前的中間 row */
interface InboxMessageHistoryRow {
  id: number
  workspace_id: string
  direction: string
  sender_type: string
  message_type: string
  content: string | null
  raw_event: LineMessageRow['raw_event']
  related_order_id: string | null
  created_at: string
}

/**
 * 拿最近 N 條對話（給 LLM 當 context）
 *
 * - 預設 30 條、上限 100
 * - 回時序由舊到新（方便直接組 messages[]）
 *
 * P2 寫入收斂（2026-05-29）：來源從 line_conversation_messages 切到 unified inbox（inbox_messages）。
 * botRecordMessage 停寫舊表後、bot 的 LLM history 必須讀同一張新表、否則 bot 看不到自己剛說的話、脈絡斷。
 * 回傳維持 LineMessageRow 形狀（消費端 line-llm-compose / tryCreateOrderFromHistory 只用 direction + content）。
 */
export async function botGetRecentMessages(
  ctx: BotContext,
  limit: number = DEFAULT_RECENT_MESSAGES
): Promise<LineMessageRow[]> {
  assertCanRead(ctx, 'botGetRecentMessages')

  const safeLimit = clamp(limit, 1, SAFETY.RECENT_MESSAGES_HARD_LIMIT)
  // inbox_* 尚未進 generated types、用未綁 Database 的 client 查（與 messaging/inbox.ts、send-reply.ts 一致）
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

  // 1. 反查 unified inbox conversation（workspace + channel=line + external_user_id）
  const { data: conv, error: convErr } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .eq('channel_type', 'line')
    .eq('external_user_id', ctx.lineUserId)
    .maybeSingle<{ id: string }>()

  if (convErr) {
    logger.error(`${HANDLER}: lookup inbox conversation failed`, convErr, {
      workspaceId: ctx.workspaceId,
    })
    throw convErr
  }
  if (!conv) {
    // 首次互動、還沒有對話 thread → 空 history
    return []
  }

  // 2. 撈最近 N 條訊息
  const { data, error } = await supabase
    .from('inbox_messages')
    .select(
      'id, workspace_id, direction, sender_type, message_type, content, raw_event, related_order_id, created_at'
    )
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    logger.error(`${HANDLER}: get recent messages failed`, error, {
      workspaceId: ctx.workspaceId,
    })
    throw error
  }

  // 3. 映射回 LineMessageRow 形狀。sender_type → sender：contact→customer / ai_agent→bot / agent→agent / system→system
  const senderMap: Record<string, string> = {
    contact: 'customer',
    ai_agent: 'bot',
    agent: 'agent',
    system: 'system',
  }
  const rows = (data ?? []) as InboxMessageHistoryRow[]
  const mapped: LineMessageRow[] = rows.map(m => ({
    id: m.id,
    workspace_id: m.workspace_id,
    line_user_id: ctx.lineUserId,
    direction: m.direction,
    sender: senderMap[m.sender_type] ?? 'bot',
    message_type: m.message_type,
    content: m.content,
    raw_event: m.raw_event,
    related_order_id: m.related_order_id,
    reply_token: null,
    created_at: m.created_at,
  }))

  // 由舊到新（方便直接餵 LLM）
  return mapped.slice().reverse()
}
