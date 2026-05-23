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
import { cn } from '@/lib/utils'
import type { ChannelMessage } from '@/types/channel.types'
import { SendAnnouncementDialog } from './SendAnnouncementDialog'
import { ChannelMembersDialog } from './ChannelMembersDialog'

interface Props {
  channelId: string
}

export function ChannelView({ channelId }: Props) {
  const { user } = useAuthStore()
  const { item: channel } = useChannel(channelId)
  // 2026-05-23 William 拍板：員工溝通用、不是聊天、撈最新 50 則即可
  // 真要看更舊訊息 Phase B 補上滑載入；目前直接砍量、簡單暴力
  const { items: messages, loading: messagesLoading } = useChannelMessages({
    filter: { channel_id: channelId },
    limit: 50,
  })
  const { items: members } = useChannelMembers({ all: true, filter: { channel_id: channelId } })
  const { get: getEmployee } = useEmployeeDictionary()
  const { items: aiAgents } = useAiAgentsSlim()

  const [draft, setDraft] = useState('')
  // 訊息單一來源（v8、2026-05-23 William 拍板根治）：
  //   - 5/18 entity hook 已把 dedupingInterval 從 Infinity 改 2000 → invalidate/mutate 重抓現在可靠
  //   - 故移除舊的 recentlySent 雙來源 workaround（它是上述舊 bug 的補丁、現在反而造成
  //     「realtime 回聲 vs 本地」交接的間歇閃爍）
  //   - 發送 / 撤回後 await invalidateChannelMessages()（單一來源、loading 只看 isLoading 不閃）、
  //     別人的訊息靠 entity hook 內建 realtime
  const [sending, setSending] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  // 只記「目前已標記為已讀的 channelId」、不累積 Set。
  // 切到別的 channel 時 ref 自動被新 channelId 蓋掉、切回來會重新寫 last_read_at（消新進的紅點）。
  const markedReadForRef = useRef<string | null>(null)
  const { can } = useCapabilities()

  // 進頻道時更新 last_read_at（消未讀紅點）
  // 2026-05-21 修：dep 補 members、ref 改 single value
  //   舊 bug：dep 沒包 members → members SWR 還沒 load 完時 myMember=undefined return、
  //          之後 members 載入完 useEffect 不重跑 → last_read_at 永遠沒寫 → 紅點不消
  //          且原本 Set ref 累積、切回同 channel 也被擋、新訊息進來消不掉紅點
  //   現在：members 變動會重跑、但 ref 比對 channelId、同一個 channel 內只寫一次
  useEffect(() => {
    if (!user?.id || !channelId) return
    if (markedReadForRef.current === channelId) return

    const myMember = (members ?? []).find(
      m => m.channel_id === channelId && m.employee_id === user.id
    )
    if (!myMember) return
    markedReadForRef.current = channelId

    void (async () => {
      try {
        await updateChannelMember(myMember.id, {
          last_read_at: new Date().toISOString(),
        } as never)
        await invalidateChannelMembers()
      } catch (err) {
        logger.warn('更新 last_read_at 失敗', err)
        // 失敗了允許下次重試：ref 還原讓下次 effect 通過
        if (markedReadForRef.current === channelId) markedReadForRef.current = null
      }
    })()
  }, [channelId, user?.id, members])

  const sortedMessages = useMemo(() => {
    // 單一來源（entity hook 的 messages）、依 channel filter + 時間排序
    // 撤回訊息仍 SELECT 出來、UI 顯示佔位「本訊息已撤回」、不從清單移除
    return (messages ?? [])
      .filter(m => m.channel_id === channelId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [messages, channelId])

  // 訊息更新自動 scroll 到底
  // dep 用 sortedMessages.length：發/收訊息後 messages 更新、長度變即 scroll 到底
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [sortedMessages.length])

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

    if (sending) return

    // 單一來源發送：
    //   1. 立刻清 draft + 設 sending（按鈕轉圈、防雙擊）
    //   2. await apiPost 寫入 → await invalidateChannelMessages() 重抓（單一來源、不閃）
    //   3. 別人的訊息靠 entity hook 內建 realtime；sending 用 try/finally 保證解除
    const optimisticBody = body
    setDraft('')
    setSending(true)
    try {
      await apiPost<{ message: ChannelMessage }>('/api/channels/messages', {
        channel_id: channelId,
        body: optimisticBody,
        message_type: 'text',
      })
      await invalidateChannelMessages()
      // 自己發的訊息不該讓自己看到未讀紅點：背景推進自己的 last_read_at。
      // （未讀算法是 channel.updated_at > 我的 last_read_at；發訊息會 bump channel.updated_at、
      //   若不同步推進自己的 last_read_at、離開頻道後會看到自己發的訊息變紅點）
      // fire-and-forget：失敗不影響發送、只動 members（不碰訊息列表 = 不影響根治後的不閃爍）
      const myMember = (members ?? []).find(
        m => m.channel_id === channelId && m.employee_id === user.id,
      )
      if (myMember) {
        void updateChannelMember(myMember.id, {
          last_read_at: new Date().toISOString(),
        } as never)
          .then(() => invalidateChannelMembers())
          .catch(() => {})
      }
    } catch (err) {
      logger.error('發送訊息失敗', err)
      toast.error('發送失敗、請再試一次')
      setDraft(optimisticBody) // 失敗還原 draft、不掉字
    } finally {
      setSending(false)
    }
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
      {/* Header — title + description inline、跟 Slack 一樣同行、不堆兩行
          高度對齊 sidebar header / 全局側欄 logo 區的 divider：
          h-18 (4.5rem) - layout p-3 (0.75rem) - card border (1px) = calc(3.75rem - 1px) */}
      <header className="px-6 h-[calc(3.75rem_-_1px)] border-b border-border bg-card flex items-center justify-between">
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
            variant="outline"
            size="sm"
            onClick={() => setMembersOpen(true)}
            className="gap-1.5 h-9 px-3 text-sm border-morandi-gold/40 hover:bg-morandi-gold-light"
          >
            <Users className="h-4 w-4 text-morandi-gold" />
            <span className="font-medium">{channelMemberCount} 位成員</span>
          </Button>
        )}
      </header>

      {/* Message list — 2026-05-20 William 拍板：px 從 6 縮到 3、對方頭像更靠左邊 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messagesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-morandi-muted" />
          </div>
        )}
        {!messagesLoading && sortedMessages.length === 0 && (
          <div className="text-center py-8 text-sm text-morandi-muted">尚無訊息</div>
        )}
        {sortedMessages.map(msg => {
          const isRevoked = !msg.is_active
          const isMine = msg.sender_employee_id === user?.id
          const isSystem = msg.message_type === 'system'

          // 系統訊息：完全置中、不分左右、不顯示頭像名字
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <p className="text-xs text-morandi-muted italic">{msg.body}</p>
              </div>
            )
          }

          const avatar = senderAvatar(msg)
          return (
            <div
              key={msg.id}
              className={cn('flex gap-3 group', isMine && 'flex-row-reverse')}
            >
              {/* 對方 / bot 訊息才有頭像；自己訊息不顯示頭像（自己當然知道是自己） */}
              {!isMine && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-morandi-gold/20 overflow-hidden flex items-center justify-center text-xs font-medium text-morandi-gold">
                  {avatar.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar.url} alt={senderName(msg)} className="w-full h-full object-cover" />
                  ) : (
                    <span>{avatar.initial}</span>
                  )}
                </div>
              )}
              <div className={cn('flex flex-col gap-1 max-w-[70%] min-w-0', isMine && 'items-end')}>
                <div className={cn('flex items-baseline gap-2', isMine && 'flex-row-reverse')}>
                  {/* 自己訊息不顯示自己名字；對方 / bot 訊息才顯示 */}
                  {!isMine && (
                    <span className="text-sm font-medium text-morandi-primary">
                      {senderName(msg)}
                    </span>
                  )}
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
                ) : (
                  <p
                    className={cn(
                      'text-sm text-morandi-primary whitespace-pre-wrap break-words rounded-2xl px-3 py-2 inline-block',
                      isMine
                        ? 'bg-morandi-gold/20 rounded-tr-sm'
                        : 'bg-morandi-container/60 rounded-tl-sm'
                    )}
                  >
                    {msg.body}
                  </p>
                )}
              </div>
            </div>
          )
        })}
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
