'use client'

/**
 * AI Hub - Conversations tab
 *
 * 多通路對話收件匣（合併原 /messaging 內容、不重做資料層）。
 *
 * 結構（Phase 1）：
 *   - 左：channel filter（all / line / fb / ig）+ 對話列表（SWR 10s refresh）
 *   - 右：訊息 thread + 回覆 composer + bot pause switch
 *
 * Phase 2（執事長 spec v2 接管）：
 *   - 加最右側 AI 摘要面板（情緒分析 / 關鍵資訊 / 建議動作）
 *   - 對話 row 加 AI 信心三檔 🟢🟡🔴 標籤
 *   - 訊息分 sender_type: customer / agent / ai_agent 視覺區隔（已有、優化文案）
 *
 * 資料來源：既有 API
 *   - GET /api/messaging/conversations
 *   - GET /api/messaging/conversations/:id/messages
 *   - POST /api/messaging/conversations/:id/reply
 *   - PATCH /api/messaging/conversations/:id  (bot_paused toggle)
 */

import { useEffect, useState, useMemo, useRef } from 'react'
import useSWR from 'swr'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useRealtimeMutate } from '@/lib/swr/use-realtime-mutate'
import { useAuthStore } from '@/stores/auth-store'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { MessageCircle, Facebook, Instagram, Bot, Send, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

type ChannelType = 'line' | 'facebook' | 'instagram'
type ChannelFilter = 'all' | ChannelType

interface ConversationItem {
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
}

interface MessageItem {
  id: number
  direction: 'inbound' | 'outbound'
  sender_type: 'contact' | 'agent' | 'ai_agent' | 'system'
  message_type: string
  content: string | null
  created_at: string
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  line: 'LINE',
  facebook: 'FB',
  instagram: 'IG',
}

const CHANNEL_COLORS: Record<ChannelType, string> = {
  line: 'bg-green-100 text-green-700',
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
}

function ChannelIcon({ channel }: { channel: ChannelType }) {
  if (channel === 'line') return <MessageCircle className="w-4 h-4" />
  if (channel === 'facebook') return <Facebook className="w-4 h-4" />
  return <Instagram className="w-4 h-4" />
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function formatRelative(ts: string | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小時前`
  const diffD = Math.floor(diffHr / 24)
  if (diffD < 7) return `${diffD} 天前`
  return formatDateTaipei(d)
}

export function AiConversationsTab() {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id ?? null

  const listUrl =
    channelFilter === 'all'
      ? '/api/messaging/conversations'
      : `/api/messaging/conversations?channel=${channelFilter}`

  // 🔴 SWR Realtime：別人改 inbox_conversations / 該 conversation 的 messages → 我這邊立刻更新
  useRealtimeMutate({
    table: 'inbox_conversations',
    filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
    swrKeys: [listUrl],
    enabled: Boolean(workspaceId),
  })

  useRealtimeMutate({
    table: 'inbox_messages',
    filter: selectedId ? `conversation_id=eq.${selectedId}` : undefined,
    swrKeys: selectedId ? [`/api/messaging/conversations/${selectedId}/messages`] : [],
    enabled: Boolean(selectedId),
  })

  const { data: listResp, error: listError, isLoading: listLoading } = useSWR<{
    data: ConversationItem[]
  }>(listUrl, fetcher, { refreshInterval: 10000, revalidateOnFocus: false })

  const conversations = useMemo(() => listResp?.data ?? [], [listResp])

  const { data: msgResp, isLoading: msgLoading } = useSWR<{ data: MessageItem[] }>(
    selectedId ? `/api/messaging/conversations/${selectedId}/messages` : null,
    fetcher,
    { refreshInterval: selectedId ? 5000 : 0, revalidateOnFocus: false }
  )

  const messages = useMemo(() => msgResp?.data ?? [], [msgResp])
  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  )

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  // 選中對話時、若有未讀就 mark_as_read
  useEffect(() => {
    if (!selectedConv || selectedConv.unread_count === 0) return
    void apiMutate(`/api/messaging/conversations/${selectedConv.id}`, {
      method: 'PATCH',
      body: { mark_as_read: true },
      invalidate: [listUrl],
    })
  }, [selectedConv, listUrl])

  return (
    <div className="flex gap-4 p-4 h-full">
      {/* 左側：對話列表（Hub 模式、不分 channel） */}
      <div className="w-[280px] flex flex-col flex-shrink-0">
        {/* List */}
        <Card className="flex-1 overflow-y-auto p-0">
          {listLoading && (
            <div className="p-6 text-center text-sm text-morandi-muted">載入中...</div>
          )}
          {listError && (
            <div className="p-6 text-center text-sm text-red-600">載入失敗、請刷新頁面</div>
          )}
          {!listLoading && conversations.length === 0 && (
            <div className="p-6 text-center text-sm text-morandi-muted space-y-2">
              <Bot className="w-10 h-10 mx-auto text-morandi-muted/50" />
              <p>還沒有對話進來</p>
              <p className="text-xs">
                到{' '}
                <a href="/bot/facebook-setup" className="text-morandi-gold underline">
                  FB 設定
                </a>{' '}
                /{' '}
                <a href="/bot/instagram-setup" className="text-morandi-gold underline">
                  IG 設定
                </a>{' '}
                跑嚮導開通
              </p>
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full px-3 py-2.5 border-b border-morandi-muted/20 text-left hover:bg-morandi-gold/5 transition-colors ${
                selectedId === c.id ? 'bg-morandi-gold/10' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* 頭像（含 channel icon overlay） */}
                <div className="relative shrink-0">
                  {c.picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.picture_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : c.external_user_id.startsWith('group:') ||
                    c.external_user_id.startsWith('room:') ? (
                    // 群組 / 多人聊天室、用 Users icon 視覺區分
                    <div className="w-10 h-10 rounded-full bg-morandi-gold/20 flex items-center justify-center text-morandi-gold">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-morandi-gold/20 flex items-center justify-center text-sm font-medium text-morandi-gold">
                      {(c.display_name || c.external_user_id).slice(0, 1)}
                    </div>
                  )}
                  {/* channel 角標（右下角小圓圈） */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${CHANNEL_COLORS[c.channel_type]}`}
                  >
                    <ChannelIcon channel={c.channel_type} />
                  </div>
                </div>

                {/* 中間：名字 + 預覽（兩行） */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {c.display_name || '（未取得名稱）'}
                    </span>
                    <span className="text-[0.65rem] text-morandi-muted shrink-0">
                      {formatRelative(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-morandi-secondary truncate">
                      {c.last_message_direction === 'outbound' ? '你: ' : ''}
                      {c.last_message_preview || '（無訊息）'}
                    </span>
                    {c.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-[0.588rem] rounded-full px-1.5 py-0.5 font-bold shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                    {c.bot_paused && (
                      <span className="text-[0.588rem] text-orange-600 shrink-0">⏸</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </Card>
      </div>

      {/* 右側：對話 thread */}
      <Card className="flex-1 flex flex-col overflow-hidden border border-morandi-muted/30">
        {!selectedConv && (
          <div className="flex-1 flex items-center justify-center text-sm text-morandi-muted">
            選一個對話看訊息
          </div>
        )}

        {selectedConv && (
          <>
            {/* 對話 header（含 Bot 自動回覆 toggle、亮著 = 自動回覆中、暫停變灰） */}
            <ConversationHeader conv={selectedConv} listUrl={listUrl} />

            {/* 訊息 list（自動 scroll 到最底） */}
            <MessagesList
              messages={messages}
              loading={msgLoading}
              conversationId={selectedConv.id}
            />

            {/* 回覆區 */}
            <ReplyComposer conversationId={selectedConv.id} listUrl={listUrl} />
          </>
        )}
      </Card>
    </div>
  )
}

// ===== 訊息 list（auto scroll to bottom） =====
function MessagesList({
  messages,
  loading,
  conversationId,
}: {
  messages: MessageItem[]
  loading: boolean
  conversationId: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef<number>(0)

  // 1. 切 conversation → 立刻跳到底（不要 smooth、user 期待立即）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    lastMessageCountRef.current = messages.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // 2. 同 conversation 內有新訊息 → smooth scroll 到底（user 看得到「新訊息進來」感）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (messages.length > lastMessageCountRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    lastMessageCountRef.current = messages.length
  }, [messages.length])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-morandi-container/10"
    >
      {loading && (
        <div className="text-center text-sm text-morandi-muted">載入中...</div>
      )}
      {!loading && messages.length === 0 && (
        <div className="text-center text-sm text-morandi-muted py-12">
          這個對話還沒有訊息
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble key={m.id} msg={m} />
      ))}
    </div>
  )
}

// ===== 右側 header（含 Bot toggle）=====
function ConversationHeader({
  conv,
  listUrl,
}: {
  conv: ConversationItem
  listUrl: string
}) {
  const [paused, setPaused] = useState(conv.bot_paused)
  useEffect(() => setPaused(conv.bot_paused), [conv.id, conv.bot_paused])

  const handleToggle = async (next: boolean) => {
    // UI 顯示「自動回覆中亮著」、邏輯 paused 反向
    const newPaused = !next
    setPaused(newPaused)
    // apiMutate：PATCH 完成後自動 invalidate listUrl、其他 user 看到更新
    const res = await apiMutate<{ success: boolean; error?: string }>(
      `/api/messaging/conversations/${conv.id}`,
      {
        method: 'PATCH',
        body: { bot_paused: newPaused },
        invalidate: [listUrl],
      }
    )
    if (!res.ok || !res.data?.success) {
      toast.error(res.error || res.data?.error || '切換失敗')
      setPaused(!newPaused)
    }
  }

  return (
    <div className="px-4 py-3 border-b border-morandi-muted/20 flex items-center gap-3">
      {/* 頭像（群組用 Users icon） */}
      {conv.picture_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={conv.picture_url}
          alt=""
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      ) : conv.external_user_id.startsWith('group:') ||
        conv.external_user_id.startsWith('room:') ? (
        <div className="w-9 h-9 rounded-full bg-morandi-gold/20 flex items-center justify-center text-morandi-gold shrink-0">
          <Users className="w-4.5 h-4.5" />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-morandi-gold/20 flex items-center justify-center text-sm font-medium text-morandi-gold shrink-0">
          {(conv.display_name || conv.external_user_id).slice(0, 1)}
        </div>
      )}
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-semibold ${CHANNEL_COLORS[conv.channel_type]}`}
      >
        <ChannelIcon channel={conv.channel_type} />
        {CHANNEL_LABELS[conv.channel_type]}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate">
          {conv.display_name || '（未取得名稱）'}
        </h3>
      </div>
      {/* Bot 自動回覆 toggle：亮著 = 自動回覆中 */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${!paused ? 'text-green-700 font-medium' : 'text-morandi-muted'}`}>
          {!paused ? '✨ 自動回覆中' : '⏸ 已暫停'}
        </span>
        <Switch checked={!paused} onCheckedChange={handleToggle} />
      </div>
    </div>
  )
}

function ReplyComposer({
  conversationId,
  listUrl,
}: {
  conversationId: string
  listUrl: string
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    try {
      // apiMutate：寫入後自動 invalidate messages + listUrl、UI 立即更新（#7 根本解）
      const res = await apiMutate<{ success: boolean; error?: string }>(
        `/api/messaging/conversations/${conversationId}/reply`,
        {
          method: 'POST',
          body: { text: trimmed },
          invalidate: [
            `/api/messaging/conversations/${conversationId}/messages`,
            listUrl,
          ],
        }
      )
      if (!res.ok || !res.data?.success) {
        toast.error(res.error || res.data?.error || `送出失敗`)
        return
      }
      setText('')
      toast.success('已送出')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="px-4 py-3 border-t border-morandi-muted/20 bg-morandi-container/10">
      <div className="flex gap-2 items-stretch">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入回覆內容、Enter 送出..."
          disabled={sending}
          className="flex-1 h-10"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="h-10 px-4"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: MessageItem }) {
  const isInbound = msg.direction === 'inbound'
  const senderLabel =
    msg.sender_type === 'contact'
      ? '客戶'
      : msg.sender_type === 'ai_agent'
        ? '🤖 AI'
        : msg.sender_type === 'agent'
          ? '客服'
          : '系統'

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[75%]">
        <div
          className={`px-3 py-2 rounded-lg ${
            isInbound
              ? 'bg-white border border-morandi-muted/20'
              : msg.sender_type === 'ai_agent'
                ? 'bg-morandi-gold/20 text-morandi-primary'
                : 'bg-morandi-primary text-white'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{msg.content || '(無內容)'}</p>
        </div>
        <p
          className={`text-[0.588rem] text-morandi-muted mt-0.5 ${
            isInbound ? 'text-left' : 'text-right'
          }`}
        >
          {senderLabel} ・ {new Date(msg.created_at).toLocaleString('zh-TW')}
        </p>
      </div>
    </div>
  )
}
