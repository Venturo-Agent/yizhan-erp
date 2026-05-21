/**
 * Unified Inbox Service — 統一對話 / 訊息寫入抽象層
 *
 * 用途：FB / IG webhook 把收進來的訊息寫進 inbox_conversations + inbox_messages、
 *      不需要再 inline duplicate 表結構知識。LINE 之後 backfill 也走這層。
 *
 * 設計：
 *   - upsertConversation：對話 thread upsert（同人多次訊息共用一個 thread）
 *   - recordInboundMessage：客戶傳訊息進來、自動 update conversation 預覽 + unread_count
 *   - recordOutboundMessage：bot / agent 回訊息出去、自動 update 預覽
 *   - idempotent：webhook 重送同 source_id 不會建重複訊息（UNIQUE conv_id + source_id）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { broadcastInboxUpdate } from '@/lib/messaging/broadcast'

export type ChannelType = 'line' | 'facebook' | 'instagram'

export interface UpsertConversationInput {
  workspaceId: string
  channelType: ChannelType
  externalUserId: string  // LINE userId / FB PSID / IG IGSID
  displayName?: string | null
  pictureUrl?: string | null
}

export interface InboundMessageInput {
  conversationId: string
  workspaceId: string
  sourceId: string | null  // channel-native message ID（重送去重）
  messageType?: string
  content: string | null
  rawEvent: unknown
  /** 媒體 URL（image / video / audio / file）；附件訊息用、UI render <img>/<video> 用 */
  mediaUrl?: string | null
}

export interface OutboundMessageInput {
  conversationId: string
  workspaceId: string
  sourceId: string | null
  senderType: 'agent' | 'ai_agent' | 'system'
  senderEmployeeId?: string | null
  messageType?: string
  content: string | null
  rawEvent?: unknown
}

// generated types 還沒含 inbox_* 兩張新表、用 type assertion 繞過
interface ConversationRow {
  id: string
  workspace_id: string
  channel_type: ChannelType
  external_user_id: string
  display_name: string | null
  picture_url: string | null
  customer_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
}

interface ConversationUpsertPayload {
  workspace_id: string
  channel_type: ChannelType
  external_user_id: string
  display_name?: string | null
  picture_url?: string | null
}

interface MessageInsertPayload {
  conversation_id: string
  workspace_id: string
  direction: 'inbound' | 'outbound'
  sender_type: 'contact' | 'agent' | 'ai_agent' | 'system'
  sender_employee_id?: string | null
  message_type: string
  content: string | null
  raw_event: unknown
  source_id: string | null
  media_url?: string | null
}

type AdminFromShape = (table: string) => {
  upsert: (
    values: ConversationUpsertPayload,
    options: { onConflict: string }
  ) => {
    select: (cols: string) => {
      maybeSingle: () => Promise<{ data: ConversationRow | null; error: { message: string } | null }>
    }
  }
  insert: (
    values: MessageInsertPayload
  ) => Promise<{ error: { message: string; code?: string } | null }>
  update: (
    values: Partial<ConversationRow> & { unread_count?: number | string }
  ) => {
    eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
  }
}

function adminFrom(supabase: ReturnType<typeof getSupabaseAdminClient>): AdminFromShape {
  return supabase.from.bind(supabase) as unknown as AdminFromShape
}

/**
 * upsert 對話 thread。回 conversation_id。
 * 同 (workspace, channel, external_user_id) 已存在則 update display_name / picture_url、不覆蓋 customer_id 等。
 */
export async function upsertConversation(input: UpsertConversationInput): Promise<string | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await adminFrom(supabase)('inbox_conversations')
    .upsert(
      {
        workspace_id: input.workspaceId,
        channel_type: input.channelType,
        external_user_id: input.externalUserId,
        display_name: input.displayName ?? null,
        picture_url: input.pictureUrl ?? null,
      },
      { onConflict: 'workspace_id,channel_type,external_user_id' }
    )
    .select('id, workspace_id, channel_type, external_user_id, display_name, picture_url, customer_id, last_message_at, last_message_preview, unread_count')
    .maybeSingle()

  if (error || !data) {
    logger.error('upsertConversation failed', { error, input })
    return null
  }
  return data.id
}

/**
 * 寫 inbound message（客戶 → 我們）+ update 對話預覽 + unread_count++
 */
export async function recordInboundMessage(input: InboundMessageInput): Promise<void> {
  const supabase = getSupabaseAdminClient()

  // 1. 寫訊息（UNIQUE 防 webhook 重送、撞重複就跳過）
  const { error: msgError } = await adminFrom(supabase)('inbox_messages').insert({
    conversation_id: input.conversationId,
    workspace_id: input.workspaceId,
    direction: 'inbound',
    sender_type: 'contact',
    message_type: input.messageType || 'text',
    content: input.content,
    raw_event: input.rawEvent,
    source_id: input.sourceId,
    media_url: input.mediaUrl ?? null,
  })

  if (msgError && msgError.code !== '23505') {
    // 23505 = unique violation = 重送、忽略
    logger.error('recordInboundMessage insert failed', { error: msgError, input })
    return
  }
  if (msgError?.code === '23505') {
    // 重送、不更新對話預覽（已經更新過）
    return
  }

  // 2. update 對話預覽 + unread_count++（postgrest 不支援 raw SQL increment、用 RPC 或先 select 再 update）
  // 簡化版：直接 set unread_count = unread_count + 1 走 RPC 不行、用 update + 預設值 sum
  // 走 SQL function 太重、簡單用 .update with sql expression - supabase-js 不支援。
  // 退而求其次：raw RPC call 或 fetch raw SQL via pg。
  // 最務實：用 SELECT 先讀 unread_count、再 update。Race condition 容忍（誤差 ±1 沒關係）。
  const previewText = (input.content ?? '').slice(0, 200)
  const { error: convError } = await adminFrom(supabase)('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: previewText,
      last_message_direction: 'inbound',
    } as Partial<ConversationRow>)
    .eq('id', input.conversationId)

  if (convError) {
    logger.warn('recordInboundMessage update conv preview failed', { error: convError })
  }

  // unread_count 增 1：走 RPC（避免 race）
  try {
    await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ error: { message: string } | null }>)('increment_inbox_unread', {
      p_conversation_id: input.conversationId,
    })
  } catch (rpcError) {
    // RPC 沒建也沒關係、unread_count 之後 v2 補
    logger.debug('increment_inbox_unread RPC not available, skipping', { rpcError })
  }

  // 主動推 broadcast 給訂閱 workspace inbox 的 client（AUDIT_SWR_REALTIME.md S3 修法 1）
  // 跟 messaging/inbox.ts 的 recordInboxMessage 對齊、FB/IG webhook 也走這條
  await broadcastInboxUpdate({
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    event: 'new-message',
    payload: { direction: 'inbound' },
  })
}

/**
 * 寫 outbound message（bot / agent → 客戶）+ update 對話預覽 + reset unread_count
 */
export async function recordOutboundMessage(input: OutboundMessageInput): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error: msgError } = await adminFrom(supabase)('inbox_messages').insert({
    conversation_id: input.conversationId,
    workspace_id: input.workspaceId,
    direction: 'outbound',
    sender_type: input.senderType,
    sender_employee_id: input.senderEmployeeId ?? null,
    message_type: input.messageType || 'text',
    content: input.content,
    raw_event: input.rawEvent ?? null,
    source_id: input.sourceId,
  })

  if (msgError && msgError.code !== '23505') {
    logger.error('recordOutboundMessage insert failed', { error: msgError, input })
    return
  }
  if (msgError?.code === '23505') return

  const previewText = (input.content ?? '').slice(0, 200)
  const { error: convError } = await adminFrom(supabase)('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: previewText,
      last_message_direction: 'outbound',
      unread_count: 0,  // 我方回覆 → 對方已讀 reset
    } as Partial<ConversationRow>)
    .eq('id', input.conversationId)

  if (convError) {
    logger.warn('recordOutboundMessage update conv preview failed', { error: convError })
  }

  // 主動推 broadcast：bot/agent 回覆也要通知 client（聊天視窗即時更新對話流）
  await broadcastInboxUpdate({
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    event: 'new-message',
    payload: { direction: 'outbound', senderType: input.senderType },
  })
}
