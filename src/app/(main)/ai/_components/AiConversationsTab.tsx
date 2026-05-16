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
import useSWR, { mutate as swrMutate } from 'swr'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MessageCircle, Facebook, Instagram, Bot, Send, Loader2 } from 'lucide-react'
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

  const listUrl =
    channelFilter === 'all'
      ? '/api/messaging/conversations'
      : `/api/messaging/conversations?channel=${channelFilter}`

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

  return (
    <div className="flex gap-4 p-4 h-full">
      {/* 左側：對話列表 */}
      <div className="w-[360px] flex flex-col gap-3 flex-shrink-0">
        {/* Channel filter */}
        <div className="flex gap-1">
          {(['all', 'line', 'facebook', 'instagram'] as const).map((c) => (
            <Button
              key={c}
              variant={channelFilter === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChannelFilter(c)}
              className="text-xs"
            >
              {c === 'all' ? '全部' : CHANNEL_LABELS[c]}
            </Button>
          ))}
        </div>

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
              className={`w-full px-3 py-3 border-b border-morandi-muted/20 text-left hover:bg-morandi-gold/5 transition-colors ${
                selectedId === c.id ? 'bg-morandi-gold/10' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.588rem] font-semibold ${CHANNEL_COLORS[c.channel_type]}`}
                >
                  <ChannelIcon channel={c.channel_type} />
                  {CHANNEL_LABELS[c.channel_type]}
                </span>
                <span className="text-sm font-medium flex-1 truncate">
                  {c.display_name || c.external_user_id.slice(0, 10) + '…'}
                </span>
                {c.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-[0.588rem] rounded-full px-1.5 py-0.5 font-bold">
                    {c.unread_count}
                  </span>
                )}
              </div>
              <p className="text-xs text-morandi-secondary truncate">
                {c.last_message_direction === 'outbound' ? '你: ' : ''}
                {c.last_message_preview || '（無訊息）'}
              </p>
              <p className="text-[0.588rem] text-morandi-muted mt-0.5">
                {formatRelative(c.last_message_at)}
                {c.bot_paused && <span className="ml-2 text-orange-600">⏸ Bot 暫停</span>}
              </p>
            </button>
          ))}
        </Card>
      </div>

      {/* 右側：對話 thread */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {!selectedConv && (
          <div className="flex-1 flex items-center justify-center text-sm text-morandi-muted">
            選一個對話看訊息
          </div>
        )}

        {selectedConv && (
          <>
            {/* 對話 header */}
            <div className="px-4 py-3 border-b border-morandi-muted/20 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${CHANNEL_COLORS[selectedConv.channel_type]}`}
              >
                <ChannelIcon channel={selectedConv.channel_type} />
                {CHANNEL_LABELS[selectedConv.channel_type]}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {selectedConv.display_name || selectedConv.external_user_id}
                </h3>
                <p className="text-[0.647rem] text-morandi-muted font-mono">
                  {selectedConv.external_user_id}
                </p>
              </div>
            </div>

            {/* 訊息 list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-morandi-container/10">
              {msgLoading && (
                <div className="text-center text-sm text-morandi-muted">載入中...</div>
              )}
              {!msgLoading && messages.length === 0 && (
                <div className="text-center text-sm text-morandi-muted py-12">
                  這個對話還沒有訊息
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}
            </div>

            {/* 回覆區 */}
            <ReplyComposer
              conversationId={selectedConv.id}
              botPaused={selectedConv.bot_paused}
              listUrl={listUrl}
            />
          </>
        )}
      </Card>
    </div>
  )
}

function ReplyComposer({
  conversationId,
  botPaused,
  listUrl,
}: {
  conversationId: string
  botPaused: boolean
  listUrl: string
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [paused, setPaused] = useState(botPaused)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setPaused(botPaused)
  }, [botPaused, conversationId])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || `送出失敗（HTTP ${res.status}）`)
        return
      }
      setText('')
      await swrMutate(`/api/messaging/conversations/${conversationId}/messages`)
      await swrMutate(listUrl)
      toast.success('已送出')
    } catch (e) {
      logger.error('send reply failed', e)
      toast.error('網路錯誤')
    } finally {
      setSending(false)
    }
  }

  const handleTogglePause = async (next: boolean) => {
    setPaused(next)
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_paused: next }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || '切換失敗')
        setPaused(!next)
        return
      }
      await swrMutate(listUrl)
      toast.success(next ? 'Bot 已暫停、agent 接管' : 'Bot 已恢復自動回覆')
    } catch (e) {
      logger.error('toggle pause failed', e)
      toast.error('網路錯誤')
      setPaused(!next)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="px-4 py-3 border-t border-morandi-muted/20 bg-morandi-container/10 space-y-2">
      {/* Bot 暫停切換 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Switch checked={paused} onCheckedChange={handleTogglePause} disabled={sending} />
          <span className={paused ? 'text-orange-600 font-medium' : 'text-morandi-muted'}>
            {paused ? '⏸ Bot 已暫停（agent 接管中）' : 'Bot 自動回覆中'}
          </span>
        </div>
        <span className="text-morandi-muted">💡 暫停後 AI 不再自動回、由你回覆</span>
      </div>

      {/* 回覆 textarea */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入回覆內容、Cmd/Ctrl+Enter 送出..."
          rows={2}
          disabled={sending}
          className="flex-1 resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="self-end"
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
