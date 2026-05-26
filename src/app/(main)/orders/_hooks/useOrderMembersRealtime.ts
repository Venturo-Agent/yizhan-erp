'use client'

/**
 * useOrderMembersRealtime - Realtime 訂閱：即時同步成員變更
 * 從 useOrderMembersData.ts 拆分出來
 *
 * 監聽 order_members 表變更（INSERT / UPDATE / DELETE），
 * 過濾只處理屬於當前訂單/旅遊團的事件。
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { wasMemberRecentlyWritten } from './member-write-tracker'
import type { OrderMember } from '../_types/order-member.types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'

interface TourOrder {
  id: string
  order_number: string | null
}

interface UseOrderMembersRealtimeParams {
  orderId?: string
  tourId: string
  mode: 'order' | 'tour'
  tourOrders: TourOrder[]
  setMembers: React.Dispatch<React.SetStateAction<OrderMember[]>>
}

export function useOrderMembersRealtime({
  orderId,
  tourId,
  mode,
  tourOrders,
  setMembers,
}: UseOrderMembersRealtimeParams) {
  const t = useTranslations('orders')
  // 追蹤當前訂單 ID 列表（用於 Realtime 過濾）
  const orderIdsRef = useRef<string[]>([])

  // 更新 orderIdsRef（用於 Realtime 過濾）
  useEffect(() => {
    if (mode === 'tour') {
      orderIdsRef.current = tourOrders.map(o => o.id)
    } else if (orderId) {
      orderIdsRef.current = [orderId]
    }
  }, [mode, tourOrders, orderId])

  /**
   * Realtime 訂閱 - 即時同步成員變更
   */
  useEffect(() => {
    // 構建訂閱的 filter
    // 團體模式：監聽該團所有訂單的成員
    // 單一訂單模式：監聽該訂單的成員
    const targetOrderIds = mode === 'tour' ? tourOrders.map(o => o.id) : orderId ? [orderId] : []
    if (targetOrderIds.length === 0) return

    const channelName = mode === 'tour' ? `tour-members-${tourId}` : `order-members-${orderId}`
    const filterExpr =
      targetOrderIds.length === 1
        ? `order_id=eq.${targetOrderIds[0]}`
        : `order_id=in.(${targetOrderIds.join(',')})`
    const channel = supabase
      .channel(channelName)
      .on<OrderMember>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_members',
          filter: filterExpr,
        },
        (payload: RealtimePostgresChangesPayload<OrderMember>) => {
          // 檢查是否屬於當前監聽的訂單
          const newRecord = payload.new as OrderMember | undefined
          const oldRecord = payload.old as { id: string; order_id?: string } | undefined

          // 取得變更記錄的 order_id
          const recordOrderId = newRecord?.order_id || oldRecord?.order_id
          if (!recordOrderId || !orderIdsRef.current.includes(recordOrderId)) {
            return // 不屬於當前監聽的訂單，忽略
          }

          if (payload.eventType === 'INSERT' && newRecord) {
            // 新增成員 - 檢查是否已存在（避免重複）
            setMembers(prev => {
              if (prev.some(m => m.id === newRecord.id)) return prev
              toast.success(t('newMemberJoined'), { duration: 2000 })
              return [...prev, newRecord]
            })
          } else if (payload.eventType === 'UPDATE' && newRecord) {
            // 若這個成員是「本地剛寫過」的、這就是自己寫入的回音、別拿來蓋本地
            // （否則會把使用者正在編輯的輸入框值蓋回去 → 中文快打重複字「張張文」）
            if (wasMemberRecentlyWritten(newRecord.id)) {
              return
            }
            // 更新成員（真正的遠端變更）
            setMembers(prev => prev.map(m => (m.id === newRecord.id ? { ...m, ...newRecord } : m)))
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            // 刪除成員
            setMembers(prev => prev.filter(m => m.id !== oldRecord.id))
          }
        }
      )
      .subscribe()

    // 清理訂閱
    return () => {
      supabase.removeChannel(channel)
    }
  }, [mode, tourId, orderId, tourOrders, setMembers, t])
}
