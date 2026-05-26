/**
 * useRealtimeMutate — 訂閱 Supabase Realtime、收到變動自動 mutate SWR cache
 *
 * 設計（William 2026-05-17 拍板「真正根本解」#8 SWR Realtime）：
 *   - 解決「別人改了我看不到、要 reload」的全 SaaS UX 痛點
 *   - 配合 apiMutate（寫入後立即 invalidate）形成「自己改 + 別人改」雙向即時
 *
 * 用法：
 *   useRealtimeMutate({
 *     table: 'inbox_conversations',
 *     filter: `workspace_id=eq.${workspaceId}`,  // Realtime postgres-changes filter
 *     swrKeys: ['/api/messaging/conversations'],
 *   })
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
