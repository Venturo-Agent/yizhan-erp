'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

interface EditorInfo {
  id: string
  name: string
  email?: string
  joinedAt: string
}

interface UseEditingPresenceOptions {
  resourceType: string // 'itinerary' | 'order' | 'quote' | 'contract' 等
  resourceId: string // 資源的 ID
  enabled?: boolean // 是否啟用（預設 true）
}

interface UseEditingPresenceReturn {
  otherEditors: EditorInfo[] // 其他正在編輯的人
  isOtherEditing: boolean // 是否有其他人在編輯
  currentEditors: EditorInfo[] // 所有編輯者（包含自己）
}

/**
 * 追蹤誰正在編輯同一份資源
 * 使用 Supabase Realtime Presence 功能
 */
export function useEditingPresence({
  resourceType,
  resourceId,
  enabled = true,
}: UseEditingPresenceOptions): UseEditingPresenceReturn {
  const [otherEditors, setOtherEditors] = useState<EditorInfo[]>([])
  const [currentEditors, setCurrentEditors] = useState<EditorInfo[]>([])
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    if (!enabled || !resourceId || !user?.id) {
      return
    }

    const channelName = `editing:${resourceType}:${resourceId}`
    let channel: RealtimeChannel | null = null

    const setupPresence = async () => {
      channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      // 監聽 presence 狀態變化
      channel.on('presence', { event: 'sync' }, () => {
        if (!channel) return

        const presenceState = channel.presenceState()
        const editors: EditorInfo[] = []

        Object.entries(presenceState).forEach(([userId, presences]) => {
          if (presences && presences.length > 0) {
            const presence = presences[0] as { name?: string; email?: string; joinedAt?: string }
            editors.push({
              id: userId,
              name: presence.name || '未知用戶',
              email: presence.email,
              joinedAt: presence.joinedAt || new Date().toISOString(),
            })
          }
        })

        setCurrentEditors(editors)
        setOtherEditors(editors.filter(e => e.id !== user.id))
      })

      // 訂閱並追蹤自己的 presence
      await channel.subscribe(async status => {
        if (status === 'SUBSCRIBED' && channel) {
          await channel.track({
            name: user.name || user.email || '未知用戶',
            email: user.email,
            joinedAt: new Date().toISOString(),
          })
        }
      })
    }

    setupPresence().catch(err => logger.error('[setupPresence]', err))

    // 清理函數
    return () => {
      if (channel) {
        channel.untrack()
        supabase.removeChannel(channel)
      }
    }
  }, [enabled, resourceType, resourceId, user?.id, user?.name, user?.email])

  return {
    otherEditors,
    isOtherEditing: otherEditors.length > 0,
    currentEditors,
  }
}
