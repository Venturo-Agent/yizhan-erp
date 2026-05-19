/**
 * Unified inbox helper
 *
 * 把訊息寫進 inbox_conversations + inbox_messages（polymorphic across LINE/FB/IG）。
 *
 * 5/14 整合：原本 LINE 寫 line_conversation_messages、FB/IG 寫 inbox_*。整合後 LINE 也走 inbox_*、
 * 達成「全 channel 一張表、UI 一個 query」的設計（5/13 unified_inbox migration）。
 *
 * 使用：
 *   - LINE webhook（src/app/api/line/webhook/route.ts）寫 inbound
 *   - LINE bot reply（src/lib/line/erp-bridge.ts）寫 outbound
 *   - FB / IG webhook 之後接（同一份 helper）
 *
 * 過渡期：caller 同時也寫舊 line_conversation_messages（雙寫、向後相容）、
 * backfill migration apply 後可拔舊寫入路徑。
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const HANDLER = 'inbox-helper'

export type ChannelType = 'line' | 'facebook' | 'instagram'
export type Direction = 'inbound' | 'outbound'
export type SenderType = 'contact' | 'agent' | 'ai_agent' | 'system'

export interface RecordInboxMessageInput {
  workspaceId: string
  channelType: ChannelType
  /** LINE userId / FB PSID / IG IGSID */
  externalUserId: string
  direction: Direction
  senderType: SenderType
  /** agent 接管時的員工 id；非人類 sender 留 null */
  senderEmployeeId?: string | null
  messageType?: string
  content: string | null
  /** channel 原生 message ID（LINE message.id / FB message.mid / IG message.mid）、UNIQUE 防重送 */
  sourceId?: string | null
  rawEvent?: unknown
  /** profile 資訊（first sight 寫進 inbox_conversations）*/
  displayName?: string | null
  pictureUrl?: string | null
  /** LINE 圖片 / 影片下載後上傳到 line-media bucket 的 URL */
  mediaUrl?: string | null
}

interface InboxConversationRow {
  id: string
}

/**
 * 寫一筆訊息進 unified inbox（會 upsert conversation + insert message + update last_*）
 *
 * 不 throw、寫失敗只 log（避免 webhook 整個炸）
 */
export async function recordInboxMessage(
  supabase: SupabaseClient,
  input: RecordInboxMessageInput
): Promise<void> {
  const {
    workspaceId,
    channelType,
    externalUserId,
    direction,
    senderType,
    senderEmployeeId = null,
    messageType = 'text',
    content,
    sourceId = null,
    rawEvent,
    displayName,
    pictureUrl,
    mediaUrl,
  } = input

  const previewSource = content ?? ''
  const preview = previewSource.length > 200 ? previewSource.slice(0, 200) : previewSource

  // 1. UPSERT conversation（first message 建 / 已有 update last_*）
  // workspace_id + channel_type + external_user_id 唯一
  const { data: conv, error: convErr } = await supabase
    .from('inbox_conversations')
    .upsert(
      {
        workspace_id: workspaceId,
        channel_type: channelType,
        external_user_id: externalUserId,
        ...(displayName !== undefined && { display_name: displayName }),
        ...(pictureUrl !== undefined && { picture_url: pictureUrl }),
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        last_message_direction: direction,
      },
      { onConflict: 'workspace_id,channel_type,external_user_id' }
    )
    .select('id')
    .single<InboxConversationRow>()

  if (convErr || !conv) {
    logger.error(`${HANDLER}: upsert inbox_conversation failed`, convErr ?? new Error('no conv'), {
      workspaceId,
      channelType,
      externalUserId,
    })
    return
  }

  // 2. INSERT message（source_id UNIQUE 防 webhook 重送、ON CONFLICT DO NOTHING）
  const { error: msgErr } = await supabase.from('inbox_messages').insert({
    conversation_id: conv.id,
    workspace_id: workspaceId,
    direction,
    sender_type: senderType,
    sender_employee_id: senderEmployeeId,
    message_type: messageType,
    content,
    raw_event: (rawEvent ?? null) as never,
    source_id: sourceId,
    ...(mediaUrl !== undefined && { media_url: mediaUrl }),
  })

  if (msgErr) {
    // 23505 unique violation = webhook 重送、靜默吞（這是正常）
    const code = (msgErr as { code?: string })?.code
    if (code !== '23505') {
      logger.error(`${HANDLER}: insert inbox_message failed`, msgErr, {
        workspaceId,
        channelType,
        externalUserId,
        sourceId,
      })
    }
    return
  }

  // 3. inbound 時 unread_count++（agent 還沒看）
  if (direction === 'inbound') {
    const { error: bumpErr } = await supabase.rpc('increment_inbox_unread', {
      p_conversation_id: conv.id,
    })
    if (bumpErr) {
      // RPC 沒做也沒關係、unread_count 是 nice-to-have、不是 blocker
      const code = (bumpErr as { code?: string })?.code
      if (code !== '42883') {
        // 42883 = function does not exist（RPC 還沒寫）
        logger.error(`${HANDLER}: increment_inbox_unread failed`, bumpErr, {
          conversationId: conv.id,
        })
      }
    }
  }
}
