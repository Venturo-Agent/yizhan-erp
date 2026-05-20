'use client'

/**
 * entityHookRealtime — Supabase Realtime 訂閱 helper
 *
 * 從 createEntityHook.ts 抽出。
 * useRealtimeSync 監聽 Supabase postgres_changes、異動時：
 *   1. 刷新符合 cacheKeyPrefix 的所有 SWR 快取
 *   2. 清除 IndexedDB 同前綴的快取
 *
 * 設計為 pure function（不依賴工廠 closure）：
 * caller（createEntityHook）傳入 tableName + cacheKeyPrefix。
 */

import { useEffect } from 'react'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { supabase } from '@/lib/supabase/client'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { logger } from '@/lib/utils/logger'

/**
 * 訂閱某張 Supabase table 的所有 postgres_changes。
 * 有異動 → 刷新 SWR + 清 IDB（前綴比對）。
 *
 * @param tableName      要監聽的 table（例："tours"）
 * @param cacheKeyPrefix 對應的 SWR key 前綴（例："entity:tours"）
 */
export function useRealtimeSync(tableName: string, cacheKeyPrefix: string): void {
  useEffect(() => {
    // 5/20 Phase C 強化（AUDIT_SWR_REALTIME.md S2 修法 2）：
    //   1) await setAuth 完成才 subscribe — 解 client.ts module-level fire-and-forget race。
    //      之前 useEffect 內也 fire-and-forget setAuth 跟 channel.subscribe() 同 microtask、
    //      subscribe 比 setAuth 先送出去就用 anon token、RLS 擋光 events（忽好忽壞根因）。
    //   2) channel name 加 random suffix — 避免快速切 page → unmount + mount 連續打、
    //      同名 channel collide race。同 page 多 entity hook 訂同 table 也彼此獨立。
    //   3) 用 cancelled flag 處理 unmount 早於 subscribe 的 race（async IIFE 在 useEffect 內）。
    let cancelled = false
    let channelRef: ReturnType<typeof supabase.channel> | null = null

    const suffix = Math.random().toString(36).slice(2, 10)
    const channelName = `realtime:${tableName}:${suffix}`

    void (async () => {
      // C.1：先 await getSession 拿到 access_token、確保 setAuth 完成才訂閱。
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token)
      }

      // C.2：channel name 加 suffix 後再 subscribe（unsub 走同一 channel reference、不靠 name lookup）。
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
          // 有人異動了這張表 → 刷新所有相關 SWR 快取
          globalMutate(
            (key: string) => typeof key === 'string' && key.startsWith(cacheKeyPrefix),
            undefined,
            { revalidate: true }
          )
          // 同步清 IndexedDB 快取
          invalidate_cache_pattern(cacheKeyPrefix)
        })
        .subscribe((status, err) => {
          // 訂閱結果觀測：SUBSCRIBED / TIMED_OUT / CHANNEL_ERROR / CLOSED
          // 之前缺這條、realtime 靜默壞掉 user 看不出
          if (status !== 'SUBSCRIBED') {
            logger.warn(`realtime subscribe non-OK [${tableName}]`, { status, err, channelName })
          }
        })

      if (cancelled) {
        // unmount 在 subscribe 完成前就觸發、補一刀 removeChannel 避免 leak
        void supabase.removeChannel(channel)
        return
      }
      channelRef = channel
    })()

    return () => {
      cancelled = true
      if (channelRef) {
        void supabase.removeChannel(channelRef)
        channelRef = null
      }
    }
  }, [tableName, cacheKeyPrefix])
}
