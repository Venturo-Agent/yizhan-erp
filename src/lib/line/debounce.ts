/**
 * LINE bot reply debounce
 *
 * 設計（William 2026-05-18）：
 *   - 連續訊息 < 10s 間隔：累積到 line_bot_reply_debounce，不立刻回覆
 *   - 10s 靜默後，下一筆訊息到達時觸發「前一批」回覆（PUSH API）
 *   - 若 user 沒再傳訊，pg_cron 25s 後標 is_expired，flush endpoint 負責送 PUSH
 *
 * 為什麼用 PUSH 不用 Reply：
 *   - Reply token 5 分鐘有效、多訊息累積後可能過期
 *   - PUSH 不需要 reply token、永遠有效
 *   - 唯一限制：PUSH 計費（免費方案每月 200 封）
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const DEBOUNCE_MS = 10_000 // 10 秒靜默閥值

export interface DebounceUpsertResult {
  /** 前一批訊息是否 ready（> 10s 靜默）*/
  prevBatchReady: boolean
  /** 前一批累積文字（ready 時有值）*/
  prevAccumulatedText: string | null
}

/**
 * 把訊息存進 debounce state，同時評估前一批是否 ready。
 *
 * 呼叫端根據 prevBatchReady 決定是否處理前一批（透過 PUSH API）。
 * 目前訊息永遠進入新的 accumulation window，不立刻回覆。
 */
export async function upsertDebounceAndCheckPrev(
  supabase: SupabaseClient,
  opts: {
    workspaceId: string
    lineUserId: string
    userText: string
    replyToken: string | null
  }
): Promise<DebounceUpsertResult> {
  const { workspaceId, lineUserId, userText, replyToken } = opts

  const now = new Date()

  // 1. 讀現有 state
  const { data: existing } = await (supabase as unknown as SupabaseClient)
    .from('line_bot_reply_debounce')
    .select('last_message_at, accumulated_text, sent_at, is_expired')
    .eq('workspace_id', workspaceId)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  // 2. 評估前一批是否 ready
  let prevBatchReady = false
  let prevAccumulatedText: string | null = null

  if (existing && !existing.sent_at) {
    const lastAt = new Date(existing.last_message_at)
    const elapsedMs = now.getTime() - lastAt.getTime()
    if (elapsedMs >= DEBOUNCE_MS) {
      prevBatchReady = true
      prevAccumulatedText = existing.accumulated_text || null
    }
  }

  // 3. 如果前一批 ready，清掉 accumulated_text（新開 window）；否則累積
  const newAccumulatedText = prevBatchReady
    ? userText
    : existing && !existing.sent_at
      ? [existing.accumulated_text, userText].filter(Boolean).join('\n')
      : userText

  // 4. Upsert debounce state
  const { error } = await (supabase as unknown as SupabaseClient)
    .from('line_bot_reply_debounce')
    .upsert(
      {
        workspace_id: workspaceId,
        line_user_id: lineUserId,
        accumulated_text: newAccumulatedText,
        last_message_at: now.toISOString(),
        reply_token: replyToken,
        sent_at: null,
        is_expired: false,
        updated_at: now.toISOString(),
      },
      { onConflict: 'workspace_id,line_user_id' }
    )

  if (error) {
    logger.error('[debounce] upsert failed', error, { workspaceId, lineUserId })
  }

  return { prevBatchReady, prevAccumulatedText }
}

/**
 * 純累積版（給 after() 路徑用）。
 *
 * 每則訊息進來就累積 + 更新 reply_token / last_message_at，
 * 不評估前一批、不清 accumulated_text。
 * 原子 claim 由 after() 內的 UPDATE WHERE sent_at IS NULL AND last_message_at < now-10s 負責。
 */
export async function upsertDebounceAccumulate(
  supabase: SupabaseClient,
  opts: {
    workspaceId: string
    lineUserId: string
    userText: string
    replyToken: string | null
  }
): Promise<void> {
  const { workspaceId, lineUserId, userText, replyToken } = opts
  const now = new Date()

  const { data: existing } = await (supabase as unknown as SupabaseClient)
    .from('line_bot_reply_debounce')
    .select('accumulated_text, sent_at')
    .eq('workspace_id', workspaceId)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  const newAccumulatedText =
    existing && !existing.sent_at
      ? [existing.accumulated_text, userText].filter(Boolean).join('\n')
      : userText

  const { error } = await (supabase as unknown as SupabaseClient)
    .from('line_bot_reply_debounce')
    .upsert(
      {
        workspace_id: workspaceId,
        line_user_id: lineUserId,
        accumulated_text: newAccumulatedText,
        last_message_at: now.toISOString(),
        reply_token: replyToken,
        sent_at: null,
        is_expired: false,
        updated_at: now.toISOString(),
      },
      { onConflict: 'workspace_id,line_user_id' }
    )

  if (error) {
    logger.error('[debounce] upsertDebounceAccumulate failed', error, { workspaceId, lineUserId })
  }
}

/**
 * 標記 debounce state 為已送出。
 */
export async function markDebounceSent(
  supabase: SupabaseClient,
  opts: { workspaceId: string; lineUserId: string }
): Promise<void> {
  await (supabase as unknown as SupabaseClient)
    .from('line_bot_reply_debounce')
    .update({
      sent_at: new Date().toISOString(),
      is_expired: false,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', opts.workspaceId)
    .eq('line_user_id', opts.lineUserId)
}
