'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Send, Loader2, Megaphone, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  useChannel,
  useChannelMessages,
  useChannelMembers,
  updateChannelMessage,
  updateChannelMember,
  useEmployeeDictionary,
  useAiAgentsSlim,
  invalidateChannelMessages,
  invalidateChannelMembers,
} from '@/data'
import { apiPost } from '@/lib/api/client'
import { useAuthStore } from '@/stores/auth-store'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import type { ChannelMessage } from '@/types/channel.types'
import { SendAnnouncementDialog } from './SendAnnouncementDialog'
import { ChannelMembersDialog } from './ChannelMembersDialog'

interface Props {
  channelId: string
}

export function ChannelView({ channelId }: Props) {
  const { user } = useAuthStore()
  const { item: channel } = useChannel(channelId)
  const { items: messages, loading: messagesLoading } = useChannelMessages({
    all: true,
    filter: { channel_id: channelId },
  })
  const { items: members } = useChannelMembers({ all: true, filter: { channel_id: channelId } })
  const { get: getEmployee } = useEmployeeDictionary()
  const { items: aiAgents } = useAiAgentsSlim()

  const [draft, setDraft] = useState('')
  // 5/14：sending state 已不再 await API、輸入區永不卡（只在 pendingBody 不為 null 時顯示 pending bubble）
  const sending = false
  // Optimistic：送出後立刻顯示 pending bubble、不等 API、Realtime 推到時 UI 自然 swap
  // 5/14 修：原本 user 看「送出中」直到 API response、體感很慢
  const [pendingBody, setPendingBody] = useState<string | null>(null)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const markedReadRef = useRef<Set<string>>(new Set())
  const { can } = useCapabilities()

  // 進頻道時更新 last_read_at（消未讀紅點）
  // 效能：用 ref 紀錄已標記、避免 members 任何變動都重觸發 UPDATE + invalidate（會 cascade re-fetch）
  // dependency 不含 members.length、只在 channelId / user 變才跑
  useEffect(() => {
    if (!user?.id || !channelId) return
    if (markedReadRef.current.has(channelId)) return

    const myMember = (members ?? []).find(
      m => m.channel_id === channelId && m.employee_id === user.id
    )
    if (!myMember) return
    markedReadRef.current.add(channelId)

    void (async () => {
      try {
        await updateChannelMember(myMember.id, {
          last_read_at: new Date().toISOString(),
        } as never)
        await invalidateChannelMembers()
      } catch (err) {
        logger.warn('更新 last_read_at 失敗', err)
        markedReadRef.current.delete(channelId) // 失敗了允許下次重試
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id])

  // 訊息更新自動 scroll 到底
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages?.length])

  const sortedMessages = useMemo(() => {
    return (messages ?? [])
      .filter(m => m.channel_id === channelId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    // 撤回訊息仍 SELECT 出來、UI 顯示佔位「本訊息已撤回」、不從清單移除
  }, [messages, channelId])

  const channelMemberCount = useMemo(
    () => (members ?? []).filter(m => m.channel_id === channelId).length,
    [members, channelId]
  )

  const isSystemNotice = channel?.type === 'system_notice'
  const isAnnouncement = channel?.type === 'announcement'
  const isBot = channel?.type === 'bot'
  const isDm = channel?.type === 'dm'

  // DM / bot channel 動態算顯示名（channel.name 是 null、跟 sidebar 邏輯一致）
  const displayChannelName = (() => {
    if (!channel) return ''
    if (channel.name) return channel.name
    if (channel.agent_id) {
      const agent = (aiAgents ?? []).find(a => a.id === channel.agent_id)
      return agent?.name || 'AI'
    }
    if (channel.type === 'dm' && user?.id) {
      const peer = (members ?? []).find(
        m => m.channel_id === channel.id && m.employee_id !== user.id
      )
      if (peer) {
        const emp = getEmployee(peer.employee_id)
        return emp?.display_name || emp?.chinese_name || emp?.english_name || '私訊'
      }
    }
    return '未命名頻道'
  })()
  const canManageChannels = can(CAPABILITIES.CHANNELS_MANAGE)
  // 5/13 William 拍板：公告 / 機器人 / 系統通知 / 私訊 都不顯示「N 位成員」按鈕
  // 只在 project / blank（群組類）顯示
  const showMemberCount = !isAnnouncement && !isBot && !isSystemNotice && !isDm

  const handleSend = async () => {
    const body = draft.trim()
    if (!body) return
    if (!user?.id) {
      toast.error('未登入')
      return
    }
    if (isSystemNotice) {
      toast.error('系統通知頻道不能直接發訊息、只能對特定訊息回 thread')
      return
    }

    // 樂觀體驗 v3（5/14、fire-and-forget）：
    // 1. 立刻清 draft + 設 pendingBody（pending bubble 在列表末尾顯示）
    // 2. 不 await API — Realtime postgres_changes 推回真實 row 時自動 swap
    // 3. 失敗才 toast + 還原 draft
    // 這樣 user 點送出後感受是「秒送」、API round-trip 在背景跑
    const optimisticBody = body
    setDraft('')
    setPendingBody(optimisticBody)
    void apiPost('/api/channels/messages', {
      channel_id: channelId,
      body: optimisticBody,
      message_type: 'text',
    })
      .catch((err) => {
        logger.error('發送訊息失敗', err)
        toast.error('發送失敗、請再試一次')
        setDraft(optimisticBody) // 失敗還原 draft、不掉字
      })
      .finally(() => {
        // pending bubble 保留 1.5 秒、給 Realtime 推真實 message 進來覆蓋
        // 太短會在 Realtime 慢時短暫消失再出現、太長 user 會覺得在等
        setTimeout(() => setPendingBody(null), 1500)
      })
  }

  // 撤回訊息：is_active=false + revoked_at（拍板 Q7）
  const handleRevoke = async (msg: ChannelMessage) => {
    if (msg.sender_employee_id !== user?.id) return
    try {
      // 走 API + admin client、繞 client supabase RLS 詭異 bug
      await apiPost(`/api/channels/messages/${msg.id}/revoke`, {})
      await invalidateChannelMessages()
      toast.success('已撤回')
    } catch (err) {
      logger.error('撤回失敗', err)
      toast.error('撤回失敗')
    }
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-morandi-muted" />
      </div>
    )
  }

  const senderName = (msg: ChannelMessage): string => {
    if (msg.sender_agent_id) {
      const agent = (aiAgents ?? []).find(a => a.id === msg.sender_agent_id)
      return agent?.name || 'AI'
    }
    if (msg.sender_employee_id) {
      const emp = getEmployee(msg.sender_employee_id)
      return emp?.display_name || emp?.chinese_name || emp?.english_name || '未知'
    }
    return '系統'
  }

  const senderAvatar = (msg: ChannelMessage): { url: string | null; initial: string } => {
    if (msg.sender_agent_id) {
      const agent = (aiAgents ?? []).find(a => a.id === msg.sender_agent_id)
      return { url: (agent as { avatar_url?: string })?.avatar_url ?? null, initial: agent?.name?.[0] ?? 'A' }
    }
    if (msg.sender_employee_id) {
      const emp = getEmployee(msg.sender_employee_id)
      const url = (emp as { avatar_url?: string | null })?.avatar_url ?? null
      const name = emp?.display_name || emp?.chinese_name || emp?.english_name || '?'
      return { url, initial: name[0] ?? '?' }
    }
    return { url: null, initial: '系' }
  }

  // 5/14 修：channel / members 還沒 ready 時顯示 spinner、避免 fallback 名「私訊」/「未命名」flash
  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-morandi-muted" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header — title + description inline、跟 Slack 一樣同行、不堆兩行 */}
      <header className="px-6 py-3 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-base font-semibold text-morandi-primary shrink-0">
            {displayChannelName}
          </h1>
          {channel.description && (
            <p className="text-xs text-morandi-muted truncate">
              <span className="mr-2">·</span>
              {channel.description}
            </p>
          )}
        </div>
        {showMemberCount && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMembersOpen(true)}
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            {channelMemberCount} 位成員
          </Button>
        )}
      </header>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messagesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-morandi-muted" />
          </div>
        )}
        {!messagesLoading && sortedMessages.length === 0 && !pendingBody && (
          <div className="text-center py-8 text-sm text-morandi-muted">尚無訊息</div>
        )}
        {sortedMessages.map(msg => {
          const isRevoked = !msg.is_active
          const isMine = msg.sender_employee_id === user?.id
          const avatar = senderAvatar(msg)
          return (
            <div key={msg.id} className="flex gap-3 group">
              {/* 頭像 32×32 圓形、有圖顯圖、無圖顯姓氏首字 */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-morandi-gold/20 overflow-hidden flex items-center justify-center text-xs font-medium text-morandi-gold">
                {avatar.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar.url} alt={senderName(msg)} className="w-full h-full object-cover" />
                ) : (
                  <span>{avatar.initial}</span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-morandi-primary">{senderName(msg)}</span>
                  <span className="text-xs text-morandi-muted">
                    {new Date(msg.created_at).toLocaleTimeString('zh-TW', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMine && !isRevoked && (
                    <button
                      onClick={() => handleRevoke(msg)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-morandi-muted hover:text-morandi-red transition-opacity"
                      title="撤回此訊息"
                    >
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  )}
                </div>
                {isRevoked ? (
                  <p className="text-xs text-morandi-muted italic bg-morandi-container/40 rounded px-2 py-1 inline-block w-fit">
                    本訊息已撤回
                  </p>
                ) : msg.message_type === 'system' ? (
                  <p className="text-xs text-morandi-muted italic">{msg.body}</p>
                ) : (
                  <p className="text-sm text-morandi-primary whitespace-pre-wrap">{msg.body}</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Optimistic pending bubble — 5/14 修：user 送出秒看到、不等 API */}
        {pendingBody && (
          <div className="flex gap-3 group opacity-60">
            <div className="w-8 h-8 rounded-full bg-morandi-gold/40 flex items-center justify-center text-xs font-medium shrink-0">
              {(getEmployee(user?.id || '')?.display_name || user?.email || '我')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-morandi-primary">
                  {getEmployee(user?.id || '')?.display_name || '我'}
                </span>
                <span className="text-xs text-morandi-muted flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  傳送中
                </span>
              </div>
              <div className="text-sm text-morandi-primary whitespace-pre-wrap break-words mt-0.5">
                {pendingBody}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area — 依 channel type 變形 */}
      {isSystemNotice && (
        <div className="border-t border-border px-4 py-3 bg-morandi-container/40">
          <p className="text-xs text-morandi-muted text-center">
            系統通知頻道不能直接發訊息、只能對特定通知回覆 thread
          </p>
        </div>
      )}

      {isAnnouncement && (
        <div className="border-t border-border px-4 py-3 bg-card flex items-center justify-center">
          {canManageChannels ? (
            <Button onClick={() => setAnnouncementOpen(true)} className="gap-2">
              <Megaphone className="h-4 w-4" />
              發送公告
            </Button>
          ) : (
            <p className="text-xs text-morandi-muted">公告頻道僅特定權限可發送</p>
          )}
        </div>
      )}

      {!isSystemNotice && !isAnnouncement && (
        <div className="border-t border-border px-4 py-3 bg-card flex items-end gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={`對 ${channel.name ?? '此頻道'} 發訊息（Enter 送出、Shift+Enter 換行）`}
            rows={1}
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !draft.trim()} className="gap-1">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            送出
          </Button>
        </div>
      )}

      <SendAnnouncementDialog
        open={announcementOpen}
        onOpenChange={setAnnouncementOpen}
        channelId={channelId}
      />

      <ChannelMembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        channelId={channelId}
      />
    </div>
  )
}
