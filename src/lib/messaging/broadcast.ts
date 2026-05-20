/**
 * Messaging broadcast helper
 *
 * 給 webhook（LINE / FB / IG）/ inbox handler 主動推 Realtime event 給訂閱該 workspace 的 client。
 *
 * 為什麼需要這層（AUDIT_SWR_REALTIME.md S3 修法 #1）：
 *   - 既有路徑只靠 postgres_changes 自動廣播、但這條 5/18 註解寫得清楚：
 *     RLS table + ssr cookie 場景下、postgres_changes 已知不穩、有 race
 *   - 既有 client 端用 polling（refreshInterval 5s/10s）兜底、但 polling 不是真即時、
 *     且每 5 秒一次全 workspace inbox SELECT 是 Supabase egress 殺手
 *   - 解法：webhook 寫入後、用 supabase channel.send broadcast 主動推一條 event 給
 *     訂閱 `workspace:${workspaceId}:inbox` 的 client、client 收到 event 才 mutate SWR
 *   - broadcast 走 Realtime 但是 server-initiated、不依賴 RLS / postgres_changes 路徑
 *
 * 用法（這 phase 不整合、留 Phase C/之後接 LINE webhook / FB webhook / IG webhook）：
 *   ```ts
 *   await broadcastInboxUpdate({
 *     workspaceId: 'xxx',
 *     conversationId: 'yyy',
 *     event: 'new-message',
 *   })
 *   ```
 *
 * 對齊紅線：
 *   - 紅線 F（client 讀取 SSOT）：webhook 主動推 → client 端的 useRealtimeMutate 才會
 *     穩定接到 → SWR cache 才會失效 → UI 才會更新、不依賴 polling
 *   - 失敗靜默：broadcast 失敗不擋寫入主流程（webhook 寫 DB 是 source of truth、
 *     broadcast 只是 nice-to-have 的通知）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const HANDLER = 'broadcast-helper'

/** 廣播事件種類：對應 inbox 不同變動 */
export type InboxBroadcastEvent =
  | 'new-message' // 新訊息進來（inbox_messages INSERT）
  | 'conversation-updated' // conversation last_message / unread 更新（inbox_conversations UPDATE）
  | 'conversation-read' // agent 標已讀

export interface BroadcastInboxUpdateInput {
  /** 該 workspace 訂閱者才會收到（per-workspace channel） */
  workspaceId: string
  /** 哪個 conversation 動了（client 可用此選擇要不要 refetch messages） */
  conversationId: string
  /** 事件種類 */
  event: InboxBroadcastEvent
  /** 額外 payload（譬如新 message 的 id、sender_type 等、client 可選用） */
  payload?: Record<string, unknown>
}

/** 後續 client 端訂閱 channel 名 SSOT */
export function getInboxChannelName(workspaceId: string): string {
  return `workspace:${workspaceId}:inbox`
}

/**
 * 主動廣播 inbox 變動給該 workspace 的訂閱者。
 *
 * 失敗靜默（只 log、不 throw）— webhook 主流程不能因為 broadcast 失敗而失敗。
 */
export async function broadcastInboxUpdate(input: BroadcastInboxUpdateInput): Promise<void> {
  const { workspaceId, conversationId, event, payload } = input

  try {
    const supabase = getSupabaseAdminClient()
    const channelName = getInboxChannelName(workspaceId)
    const channel = supabase.channel(channelName)

    // .send() 不需先 .subscribe()（broadcast type 走 REST 端點、不需 socket 連線）
    const result = await channel.send({
      type: 'broadcast',
      event,
      payload: {
        conversationId,
        ...(payload ?? {}),
      },
    })

    if (result !== 'ok') {
      // 'timed out' / 'error' — log 但不 throw、不擋 webhook 主流程
      logger.warn(`${HANDLER}: broadcast non-ok response`, {
        workspaceId,
        conversationId,
        event,
        result,
      })
    }

    // 用完就釋放、不留 channel reference
    await supabase.removeChannel(channel)
  } catch (err) {
    // 任何 broadcast 失敗（網路 / token 過期 / Realtime down）都靜默吞
    // 主流程的 inbox INSERT 已經成功、postgres_changes 仍會 fire（雖然不穩）、polling 也會接
    logger.error(
      `${HANDLER}: broadcast threw`,
      err instanceof Error ? err : new Error(String(err)),
      {
        workspaceId,
        conversationId,
        event,
      }
    )
  }
}
