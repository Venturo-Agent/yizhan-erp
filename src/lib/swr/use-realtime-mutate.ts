/**
 * useRealtimeMutate — REST endpoint / 自定 SWR key 的 Realtime 同步 helper
 *
 * 2026-05-29 B11 邊界釐清：
 *   - 本 hook 服務「REST API endpoint 當 SWR key」場景（譬如 /api/messaging/conversations）。
 *   - entity hook 的 `useRealtimeSync(table, cacheKeyPrefix)`（src/data/core/entityHookRealtime.ts）
 *     服務「entity:<table> 前綴的 SWR cache」場景、由 createEntityHook 自動內建、不該手動呼。
 *   - 兩者**不是重複**：cache key 命名空間不同（API path vs entity prefix）、不能互相替代。
 *
 * 設計（William 2026-05-17 拍板「真正根本解」#8 SWR Realtime）：
 *   - 解決「別人改了我看不到、要 reload」的全 SaaS UX 痛點
 *   - 配合 apiMutate（寫入後立即 invalidate）形成「自己改 + 別人改」雙向即時
 *
 * 用法（限 REST endpoint / 自定 key）：
 *   useRealtimeMutate({
 *     table: 'inbox_conversations',
 *     filter: `workspace_id=eq.${workspaceId}`,  // Realtime postgres-changes filter
 *     swrKeys: ['/api/messaging/conversations'],
 *   })
 *
 * 用 entity hook 的場景請走 useList() 內建 realtime、不要在 page 散刻本 hook 補訂閱。
 *
 * 前提（已完成 2026-05-17）：
 *   - production DB 上對應 table 已加進 supabase_realtime publication
 *     SQL: ALTER PUBLICATION supabase_realtime ADD TABLE public.<table>
 */

'use client'

import { useEffect } from 'react'
import { mutate as globalMutate } from './scoped-mutate'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export interface UseRealtimeMutateOptions {
  /** Postgres table 名（必須已加進 supabase_realtime publication）*/
  table: string
  /**
   * Postgres-changes filter（OPTIONAL）。
   * 例：`workspace_id=eq.abc123` 只訂閱該 workspace 的變動。
   * Supabase 限制：每個 channel 只能用一個 filter（多條件要用複合 column）
   */
  filter?: string
  /** 收到變動後要 refetch 的 SWR keys */
  swrKeys: string[]
  /** 預設 true、false 時不訂閱（懶載入用）*/
  enabled?: boolean
  /** 接收的事件：INSERT / UPDATE / DELETE / *（預設 *）*/
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  /** Realtime channel 名（debugging 用、預設自動產生）*/
  channelName?: string
}

/**
 * 訂閱 Supabase Realtime postgres-changes、變動時 mutate 指定 SWR keys。
 *
 * 內部會在 unmount / deps 變動時 unsubscribe、避免 leak。
 */
export function useRealtimeMutate({
  table,
  filter,
  swrKeys,
  enabled = true,
  event = '*',
  channelName,
}: UseRealtimeMutateOptions): void {
  // 把 swrKeys 序列化、避免 useEffect 每 render 都觸發
  const keysSig = swrKeys.join('|')

  useEffect(() => {
    if (!enabled) return
    if (swrKeys.length === 0) return

    const name =
      channelName ?? `realtime:${table}:${filter ?? '*'}:${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(name)

    // postgres_changes payload 型別由 supabase-js 提供、我們只用 commit_timestamp 跟 eventType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (payload: any) => {
      logger.info(`[realtime] ${table} ${payload.eventType}`, {
        commit_timestamp: payload.commit_timestamp,
      })
      // mutate 所有指定 keys（觸發 refetch、UI 立即更新）
      void Promise.all(swrKeys.map(k => globalMutate(k)))
    }

    channel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event, schema: 'public', table, filter }, handler)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // keysSig 變才重新訂閱、避免 swrKeys array reference 變動觸發
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, event, enabled, keysSig, channelName])
}
