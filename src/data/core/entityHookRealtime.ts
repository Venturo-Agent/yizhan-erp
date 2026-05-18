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
import { mutate as globalMutate } from 'swr'
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
    const channel = supabase
      .channel(`realtime:${tableName}`)
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
          logger.warn(`realtime subscribe non-OK [${tableName}]`, { status, err })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName, cacheKeyPrefix])
}
