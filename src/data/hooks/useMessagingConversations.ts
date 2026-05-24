import useSWR from 'swr'

export type ChannelType = 'line' | 'facebook' | 'instagram'

export interface ConversationItem {
  id: string
  channel_type: ChannelType
  external_user_id: string
  display_name: string | null
  picture_url: string | null
  last_message_at: string | null
  last_message_preview: string | null
  last_message_direction: 'inbound' | 'outbound' | null
  unread_count: number
  bot_paused: boolean
  memory_tone?: string | null
  memory_failed?: boolean
}

/** 訊息收件匣對話列表 endpoint（AiSidebar / AiConversationsTab 共用、同 key 自動 dedupe）。 */
export const CONVERSATIONS_URL = '/api/messaging/conversations'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * 抓訊息收件匣對話列表（LINE / FB / IG 聚合）。
 * 收件匣聚合視圖、非單一 workspace 實體表 → 走 REST endpoint，createEntityHook 不適用。
 * （比照 useRoles：src/data/hooks 內 wrap REST endpoint、避開「頁面禁直接 useSWR」紅線 F）
 */
export function useMessagingConversations() {
  const { data, isLoading, mutate } = useSWR<{ data: ConversationItem[] }>(
    CONVERSATIONS_URL,
    fetcher,
    { revalidateOnFocus: false }
  )

  return { conversations: data?.data ?? [], isLoading, mutate }
}
