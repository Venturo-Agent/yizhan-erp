'use client'

/**
 * useRealtimeReload — 給「直接 useState + 手動 loadXxx」的 D 型頁面補「同事改同步」。
 *
 * 背景：會計科目 / 傳票 / 支票等頁面用 useState + loadXxx() 重撈、不走 entity hook / SWR，
 * 所以 entity 的 useRealtimeSync（刷 SWR key）不適用。本 hook 訂閱該表 postgres_changes、
 * 有異動就呼叫傳入的 reload()（= 該頁的 loadXxx）→ 同事改了自動重抓（北極星 V2「同事改同步」）。
 *
 * 設計（比照 src/data/core/entityHookRealtime.ts 的 race 處理）：
 * - reload 存 ref、不進 useEffect deps → reload 每次 render 新參考也不會重訂閱。
 * - await getSession + setAuth 完成才 subscribe（解 anon token race）。
 * - channel name 加 random suffix（避免快速 mount/unmount 同名 collide）。
 * - cancelled flag 處理 unmount 早於 subscribe 的 race。
 *
 * ⚠️ 前提：tableName 必須在 supabase_realtime publication（否則收不到廣播、靜默失效）。
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export function useRealtimeReload(tableName: string, reload: () => void): void {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    let cancelled = false
    let channelRef: ReturnType<typeof supabase.channel> | null = null

    const suffix = Math.random().toString(36).slice(2, 10)
    const channelName = `realtime-reload:${tableName}:${suffix}`

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token)
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
          reloadRef.current()
        })
        .subscribe((status, err) => {
          if (status !== 'SUBSCRIBED') {
            logger.warn(`realtime-reload subscribe non-OK [${tableName}]`, { status, err })
          }
        })

      if (cancelled) {
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
  }, [tableName])
}
