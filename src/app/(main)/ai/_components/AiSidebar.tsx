'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useMessagingConversations,
  CONVERSATIONS_URL,
  type ConversationItem,
  type ChannelType,
} from '@/data/hooks/useMessagingConversations'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { useRealtimeMutate } from '@/lib/swr/use-realtime-mutate'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  Sparkles,
  MessageCircle,
  Facebook,
  Instagram,
  Users,
  Pause,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiSettingsDialog } from './AiSettingsDialog'

/**
 * AI Hub Sidebar — 2026-05-21 William 拍板 v3.3
 *
 * 「對話」section 直接 render LINE / FB / IG 多通路對話列表（取代 v3.2 的空 placeholder）。
 * 列表跟 AiConversationsTab 內建那組 280px 列表共用同個 SWR endpoint
 * (`/api/messaging/conversations`)、selectedId 走 URL `?conv=<id>` 同步。
 *
 * - 主畫面 page.tsx render `<AiConversationsTab hideList />`、避免雙列表
 * - Realtime broadcast 也訂在這裡讓 sidebar 即時更新（不靠主畫面有沒有 mount）
 */

// Channel badge 保留品牌色（不是硬編碼、是社群識別色、跟 venturo 內部 status token 區分）
// W 拍板 2026-05-23：LINE 綠 / FB 藍 / IG 粉是用戶熟悉的辨識色、不歸 design token 管
const CHANNEL_COLORS: Record<ChannelType, string> = {
  line: 'bg-green-100 text-green-700',
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
}

function ChannelIcon({ channel }: { channel: ChannelType }) {
  if (channel === 'line') return <MessageCircle className="w-3 h-3" />
  if (channel === 'facebook') return <Facebook className="w-3 h-3" />
  return <Instagram className="w-3 h-3" />
}

function listToneEmoji(item: ConversationItem): string | null {
  if (item.memory_failed) return '🔴'
  const tone = item.memory_tone
  if (!tone) return null
  if (tone.includes('主動') || tone.includes('完整')) return '🟢'
  if (tone.includes('應付')) return '🟡'
  return null
}

function formatRelative(ts: string | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 時前`
  const diffD = Math.floor(diffHr / 24)
  if (diffD < 7) return `${diffD} 天前`
  return d.toLocaleDateString('zh-TW')
}

export function AiSidebar() {
  const searchParams = useSearchParams()
  const activeConvId = searchParams.get('conv')
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id ?? null

  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // SWR 取對話列表（跟 AiConversationsTab 共用 cache key 自動 dedupe）
  const { conversations, isLoading } = useMessagingConversations()

  // Realtime broadcast（webhook / inbox-service 推 new-message event 來、列表 mutate 重撈）
  const activeConvIdRef = useRef<string | null>(activeConvId)
  useEffect(() => {
    activeConvIdRef.current = activeConvId
  }, [activeConvId])

  useEffect(() => {
    if (!workspaceId) return
    const channelName = `workspace:${workspaceId}:inbox`
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new-message' }, msg => {
        void globalMutate(CONVERSATIONS_URL)
        const payload = msg.payload as { conversationId?: string } | undefined
        const convId = payload?.conversationId
        if (convId && convId === activeConvIdRef.current) {
          void globalMutate(`/api/messaging/conversations/${convId}/messages`)
        }
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [workspaceId])

  // postgres_changes 兜底（broadcast 漏掉的 update 譬如 mark_as_read 也有）
  useRealtimeMutate({
    table: 'inbox_conversations',
    filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
    swrKeys: [CONVERSATIONS_URL],
    enabled: Boolean(workspaceId),
  })

  const buildConvHref = (convId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('conv', convId)
    return `/ai?${params.toString()}`
  }

  // 收起狀態：sidebar 變窄、只顯示客戶頭像列
  if (collapsed) {
    return (
      <>
        <aside className="w-12 shrink-0 border-r border-border bg-card flex flex-col transition-all">
          <div className="w-full h-[calc(3.75rem_-_1px)] flex items-center justify-center border-b border-border shrink-0">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
              title="展開 AI Hub 側邊欄"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 w-full overflow-y-auto py-2 flex flex-col items-center gap-1">
            {conversations.map(c => {
              const initial = (c.display_name || c.external_user_id).slice(0, 1)
              const isActive = activeConvId === c.id
              return (
                <Link
                  key={c.id}
                  href={buildConvHref(c.id)}
                  title={c.display_name || '（未取得名稱）'}
                  className={cn(
                    'relative w-9 h-9 rounded-full flex items-center justify-center bg-morandi-gold/20 text-morandi-gold text-xs font-medium shrink-0 transition-all',
                    isActive
                      ? 'ring-2 ring-morandi-gold ring-offset-1 ring-offset-card'
                      : 'hover:ring-2 hover:ring-morandi-gold/50'
                  )}
                >
                  {c.picture_url ? (
                    <img src={c.picture_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : c.external_user_id.startsWith('group:') ||
                    c.external_user_id.startsWith('room:') ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    initial
                  )}
                  {c.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-status-danger-bg0 text-white text-[0.55rem] rounded-full min-w-[14px] h-[14px] px-1 font-bold ring-2 ring-card flex items-center justify-center">
                      {c.unread_count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </aside>

        <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    )
  }

  return (
    <>
      <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[calc(3.75rem_-_1px)] border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-morandi-gold" />
            <h2 className="text-sm font-semibold text-morandi-primary">AI Hub</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
              title="收起 AI Hub 側邊欄"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
              title="AI Hub 設定"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 對話列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-4 text-xs text-morandi-muted">載入中…</div>
          )}

          {!isLoading && conversations.length === 0 && (
            <p className="px-4 py-2 text-xs text-morandi-muted">
              尚無對話、客戶傳訊息進來會列在這
            </p>
          )}

          {conversations.map(c => {
            const isActive = activeConvId === c.id
            const tone = listToneEmoji(c)
            return (
              <Link
                key={c.id}
                href={buildConvHref(c.id)}
                className={cn(
                  'block w-full px-3 py-2 border-b border-morandi-muted/15 transition-colors',
                  isActive ? 'bg-morandi-gold-light' : 'hover:bg-morandi-gold/5'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {/* 頭像 + channel 角標 */}
                  <div className="relative shrink-0">
                    {c.picture_url ? (
                      <img
                        src={c.picture_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : c.external_user_id.startsWith('group:') ||
                      c.external_user_id.startsWith('room:') ? (
                      <div className="w-9 h-9 rounded-full bg-morandi-gold/20 flex items-center justify-center text-morandi-gold">
                        <Users className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-morandi-gold/20 flex items-center justify-center text-xs font-medium text-morandi-gold">
                        {(c.display_name || c.external_user_id).slice(0, 1)}
                      </div>
                    )}
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center',
                        CHANNEL_COLORS[c.channel_type]
                      )}
                    >
                      <ChannelIcon channel={c.channel_type} />
                    </div>
                  </div>

                  {/* 名字 + 預覽 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-morandi-primary truncate flex items-center gap-1">
                        {tone && (
                          <span className="text-[0.7rem] shrink-0" title="AI 速記卡信心">
                            {tone}
                          </span>
                        )}
                        <span className="truncate">
                          {c.display_name || '（未取得名稱）'}
                        </span>
                      </span>
                      <span className="text-[0.65rem] text-morandi-muted shrink-0">
                        {formatRelative(c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-morandi-secondary truncate">
                        {c.last_message_direction === 'outbound' ? '你: ' : ''}
                        {c.last_message_preview || '（無訊息）'}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="bg-status-danger-bg0 text-white text-[0.588rem] rounded-full px-1.5 py-0.5 font-bold shrink-0">
                          {c.unread_count}
                        </span>
                      )}
                      {c.bot_paused && (
                        <Pause className="w-3 h-3 text-orange-500 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </aside>

      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
