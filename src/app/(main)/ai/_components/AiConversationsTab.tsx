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
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useRealtimeMutate } from '@/lib/swr/use-realtime-mutate'
import { useAuthStore } from '@/stores/auth-store'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { MessageCircle, Facebook, Instagram, Bot, Send, Loader2, Users, Pencil, Check, X, Camera, ChevronUp, ChevronDown, FileText, PanelRight, Pause, Tag } from 'lucide-react'
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
  media_url: string | null
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
  const [panelOpen, setPanelOpen] = useState(false)
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
    <div className="flex gap-4 h-full">
      {/* 左側：對話列表（Hub 模式、不分 channel） */}
      <div className="w-[280px] flex flex-col flex-shrink-0 h-full">
        {/* List */}
        <Card className="flex-1 overflow-y-auto p-0 border border-border">
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
                      <Pause className="w-3 h-3 text-orange-500 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </Card>
      </div>

      {/* 中間：對話 thread */}
      <Card className="flex-1 flex flex-col overflow-hidden border border-border min-w-0">
        {!selectedConv && (
          <div className="flex-1 flex items-center justify-center text-sm text-morandi-muted">
            選一個對話看訊息
          </div>
        )}

        {selectedConv && (
          <>
            <ConversationHeader
              conv={selectedConv}
              listUrl={listUrl}
              panelOpen={panelOpen}
              onTogglePanel={() => setPanelOpen(v => !v)}
            />
            <MessagesList
              messages={messages}
              loading={msgLoading}
              conversationId={selectedConv.id}
              isGroup={
                selectedConv.external_user_id.startsWith('group:') ||
                selectedConv.external_user_id.startsWith('room:')
              }
            />
            <ReplyComposer conversationId={selectedConv.id} listUrl={listUrl} />
          </>
        )}
      </Card>

      {/* 右側業務面板 */}
      {selectedConv && panelOpen && (
        <BusinessPanel
          conv={selectedConv}
          listUrl={listUrl}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}

// ===== 訊息 list（auto scroll to bottom） =====
function MessagesList({
  messages,
  loading,
  conversationId,
  isGroup,
}: {
  messages: MessageItem[]
  loading: boolean
  conversationId: string
  isGroup: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef<number>(0)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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
    <>
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
          <MessageBubble key={m.id} msg={m} isGroup={isGroup} onImageClick={setLightboxUrl} />
        ))}
      </div>
      {lightboxUrl && createPortal(
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />,
        document.body
      )}
    </>
  )
}

// ===== 右側 header =====
function ConversationHeader({
  conv,
  listUrl,
  panelOpen,
  onTogglePanel,
}: {
  conv: ConversationItem
  listUrl: string
  panelOpen: boolean
  onTogglePanel: () => void
}) {
  const [showRetro, setShowRetro] = useState(false)

  const isGroup =
    conv.external_user_id.startsWith('group:') || conv.external_user_id.startsWith('room:')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(conv.display_name || '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadRes = await fetch(`/api/messaging/conversations/${conv.id}/avatar`, {
        method: 'POST',
        body: fd,
      })
      const uploadJson = await uploadRes.json() as { url?: string; error?: string }
      if (!uploadRes.ok || !uploadJson.url) {
        toast.error(uploadJson.error || '頭像上傳失敗')
        return
      }
      const patchRes = await apiMutate<{ success: boolean; error?: string }>(
        `/api/messaging/conversations/${conv.id}`,
        { method: 'PATCH', body: { picture_url: uploadJson.url }, invalidate: [listUrl] }
      )
      if (!patchRes.ok || !patchRes.data?.success) {
        toast.error(patchRes.error || '更新頭像失敗')
        return
      }
      toast.success('頭像已更新')
    } finally {
      setAvatarUploading(false)
      // reset so same file can be re-selected
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === conv.display_name) { setEditingName(false); return }
    const res = await apiMutate<{ success: boolean; error?: string }>(
      `/api/messaging/conversations/${conv.id}`,
      { method: 'PATCH', body: { display_name: trimmed }, invalidate: [listUrl] }
    )
    if (!res.ok || !res.data?.success) toast.error(res.error || '改名失敗')
    setEditingName(false)
  }

  return (
    <div className="px-4 py-3 border-b border-morandi-muted/20 flex items-center gap-3">
      {/* 頭像（群組用 Users icon、可點擊換頭像） */}
      {isGroup ? (
        <>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative w-9 h-9 rounded-full shrink-0 group"
            title="換群組頭像"
          >
            {conv.picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={conv.picture_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-morandi-gold/20 flex items-center justify-center text-morandi-gold">
                {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4.5 h-4.5" />}
              </div>
            )}
            {!avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        </>
      ) : conv.picture_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={conv.picture_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-morandi-gold/20 flex items-center justify-center text-sm font-medium text-morandi-gold shrink-0">
          {(conv.display_name || conv.external_user_id).slice(0, 1)}
        </div>
      )}
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-semibold ${CHANNEL_COLORS[conv.channel_type]}`}>
        <ChannelIcon channel={conv.channel_type} />
        {CHANNEL_LABELS[conv.channel_type]}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-1">
        {editingName ? (
          <>
            <Input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="h-7 text-sm py-0 px-2"
              autoFocus
            />
            <button onClick={handleSaveName} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="text-morandi-muted hover:text-morandi-primary"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-sm truncate">{conv.display_name || '（未取得名稱）'}</h3>
            {isGroup && (
              <button
                onClick={() => { setNameInput(conv.display_name || ''); setEditingName(true) }}
                className="text-morandi-muted hover:text-morandi-primary shrink-0"
                title="改名"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* 復盤 */}
      <Button variant="outline" size="sm" onClick={() => setShowRetro(true)} className="gap-1.5 h-8 text-xs shrink-0">
        <FileText className="w-3.5 h-3.5" />
        復盤
      </Button>

      {/* 業務面板開關 */}
      <button
        onClick={onTogglePanel}
        title="業務面板"
        className={`p-1.5 rounded-lg transition-colors shrink-0 ${panelOpen ? 'bg-morandi-gold/20 text-morandi-gold' : 'text-morandi-muted hover:text-morandi-primary hover:bg-morandi-container/40'}`}
      >
        <PanelRight className="w-4 h-4" />
      </button>

      {/* 復盤 Modal */}
      {showRetro && (
        <RetrospectiveModal
          conversationId={conv.id}
          customerName={conv.display_name || '客戶'}
          onClose={() => setShowRetro(false)}
        />
      )}
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

function RetrospectiveModal({
  conversationId,
  customerName,
  onClose,
}: {
  conversationId: string
  customerName: string
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/messaging/conversations/${conversationId}/retrospective`, {
          method: 'POST',
        })
        const json = await res.json() as { success: boolean; summary?: string; error?: string }
        if (cancelled) return
        if (!json.success || !json.summary) {
          setError(json.error || '生成失敗，請稍後再試')
        } else {
          setSummary(json.summary)
        }
      } catch {
        if (!cancelled) setError('網路錯誤，請稍後再試')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [conversationId])

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-morandi-muted/20">
          <div>
            <h3 className="font-semibold text-morandi-primary">對話復盤</h3>
            <p className="text-xs text-morandi-muted">{customerName}</p>
          </div>
          <button onClick={onClose} className="text-morandi-muted hover:text-morandi-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-morandi-gold/60" />
              <p className="text-sm text-morandi-muted">AI 正在分析對話...</p>
            </div>
          )}
          {!loading && error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl p-4">{error}</div>
          )}
          {!loading && summary && (
            <div className="prose prose-sm max-w-none text-morandi-primary whitespace-pre-wrap text-sm leading-relaxed">
              {summary}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// ===== 業務面板（右側可收合）=====
function BusinessPanel({
  conv,
  listUrl,
  onClose,
}: {
  conv: ConversationItem
  listUrl: string
  onClose: () => void
}) {
  const [paused, setPaused] = useState(conv.bot_paused)
  useEffect(() => setPaused(conv.bot_paused), [conv.id, conv.bot_paused])

  const handleToggle = async (next: boolean) => {
    const newPaused = !next
    setPaused(newPaused)
    const res = await apiMutate<{ success: boolean; error?: string }>(
      `/api/messaging/conversations/${conv.id}`,
      { method: 'PATCH', body: { bot_paused: newPaused }, invalidate: [listUrl] }
    )
    if (!res.ok || !res.data?.success) {
      toast.error(res.error || '切換失敗')
      setPaused(!newPaused)
    }
  }

  return (
    <div className="w-56 flex-shrink-0 h-full border border-border rounded-xl bg-white flex flex-col overflow-hidden">
      {/* 面板 header */}
      <div className="px-3 py-2.5 border-b border-morandi-muted/20 flex items-center justify-between">
        <span className="text-xs font-semibold text-morandi-primary">業務面板</span>
        <button onClick={onClose} className="text-morandi-muted hover:text-morandi-primary">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-morandi-muted/10">
        {/* 自動回覆 toggle */}
        <div className="px-3 py-3">
          <p className="text-[0.65rem] font-semibold text-morandi-secondary uppercase tracking-wide mb-2">自動回覆</p>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${!paused ? 'text-green-700 font-medium' : 'text-morandi-muted'}`}>
              {!paused ? '回覆中' : '已暫停'}
            </span>
            <Switch checked={!paused} onCheckedChange={handleToggle} />
          </div>
        </div>

        {/* 標籤 */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3 h-3 text-morandi-muted" />
            <p className="text-[0.65rem] font-semibold text-morandi-secondary uppercase tracking-wide">標籤</p>
          </div>
          <p className="text-xs text-morandi-muted">即將推出（AI 自動判別）</p>
        </div>

        {/* 業務紀錄 */}
        <div className="px-3 py-3 flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold text-morandi-secondary uppercase tracking-wide">業務紀錄</p>
          <ConversationNotes conversationId={conv.id} />
        </div>
      </div>
    </div>
  )
}

// ===== 業務紀錄（文字輸入 + 顯示歷史）=====
interface NoteItem {
  id: number
  content: string
  created_at: string
  employees: { display_name: string | null } | null
}

function ConversationNotes({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const notesUrl = `/api/messaging/conversations/${conversationId}/notes`

  const { data, mutate } = useSWR<{ data: NoteItem[] }>(notesUrl, fetcher, {
    revalidateOnFocus: false,
  })
  const notes = data?.data ?? []

  const handleSave = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const res = await apiMutate<{ success: boolean; error?: string }>(notesUrl, {
        method: 'POST',
        body: { content: trimmed },
      })
      if (!res.ok || !res.data?.success) {
        toast.error(res.error || '儲存失敗')
        return
      }
      setText('')
      void mutate()
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void handleSave()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 輸入區 */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="輸入備忘、⌘Enter 儲存..."
        rows={3}
        disabled={saving}
        className="w-full resize-none text-xs px-2 py-1.5 rounded-lg border border-morandi-muted/30 bg-morandi-container/10 placeholder:text-morandi-muted/60 focus:outline-none focus:ring-1 focus:ring-morandi-gold/40 disabled:opacity-50"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !text.trim()}
        className="h-7 text-xs self-end"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : '儲存'}
      </Button>

      {/* 歷史紀錄（最新在上） */}
      {notes.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {notes.map(n => (
            <div key={n.id} className="rounded-lg bg-morandi-container/20 px-2 py-1.5">
              <p className="text-xs text-morandi-primary whitespace-pre-wrap break-words">{n.content}</p>
              <p className="text-[0.588rem] text-morandi-muted mt-0.5">
                {n.employees?.display_name ?? '員工'} ・ {new Date(n.created_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface PostbackTemplate {
  id: string
  label: string
  postback_data: string
  response_text: string
  sort_order: number
  is_active: boolean
}

function QuickReplyDrawer({
  conversationId,
  listUrl,
}: {
  conversationId: string
  listUrl: string
}) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  const { data, isLoading } = useSWR<{ data: PostbackTemplate[] }>(
    open ? '/api/line/postback-templates' : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const templates = (data?.data ?? []).filter(t => t.is_active)

  const handleSend = async (template: PostbackTemplate) => {
    setSending(template.id)
    try {
      const res = await apiMutate<{ success: boolean; error?: string }>(
        `/api/messaging/conversations/${conversationId}/reply`,
        {
          method: 'POST',
          body: { text: template.response_text },
          invalidate: [
            `/api/messaging/conversations/${conversationId}/messages`,
            listUrl,
          ],
        }
      )
      if (!res.ok || !res.data?.success) {
        toast.error(res.error || res.data?.error || '發送失敗')
        return
      }
      toast.success(`已發送「${template.label}」`)
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="border-t border-morandi-muted/20 bg-morandi-container/5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-morandi-muted hover:text-morandi-primary transition-colors"
      >
        <span className="font-medium">⚡ 快捷回覆</span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          {isLoading && (
            <div className="text-xs text-morandi-muted py-2">載入中...</div>
          )}
          {!isLoading && templates.length === 0 && (
            <div className="text-xs text-morandi-muted py-2">
              尚未設定快捷回覆模板，
              <a href="/bot/line-setup" className="text-morandi-gold underline">前往 LINE 設定</a>
              建立
            </div>
          )}
          {!isLoading && templates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSend(t)}
                  disabled={sending === t.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-morandi-muted/30 text-xs bg-white hover:bg-morandi-gold/10 hover:border-morandi-gold/50 transition-colors disabled:opacity-50"
                  title={t.response_text}
                >
                  {sending === t.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  msg,
  isGroup,
  onImageClick,
}: {
  msg: MessageItem
  isGroup: boolean
  onImageClick: (url: string) => void
}) {
  const isInbound = msg.direction === 'inbound'
  const isImage = msg.message_type === 'image' && msg.media_url

  // For group inbound messages, parse [name] prefix from content
  let groupSenderName: string | null = null
  let displayContent = msg.content
  if (isGroup && isInbound && msg.content) {
    const match = msg.content.match(/^\[([^\]]+)\] ([\s\S]*)$/)
    if (match) {
      groupSenderName = match[1]
      displayContent = match[2]
    }
  }

  const footerLabel =
    groupSenderName ??
    (msg.sender_type === 'contact'
      ? '客戶'
      : msg.sender_type === 'ai_agent'
        ? 'AI'
        : msg.sender_type === 'agent'
          ? '客服'
          : '系統')

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[75%]">
        {groupSenderName && (
          <p className="text-[0.65rem] text-morandi-secondary font-medium mb-0.5 px-1">
            {groupSenderName}
          </p>
        )}
        <div
          className={`rounded-lg overflow-hidden ${
            isImage
              ? ''
              : `px-3 py-2 ${
                  isInbound
                    ? 'bg-white border border-morandi-muted/20'
                    : msg.sender_type === 'ai_agent'
                      ? 'bg-morandi-gold/20 text-morandi-primary'
                      : 'bg-morandi-primary text-white'
                }`
          }`}
        >
          {isImage ? (
            <button
              type="button"
              onClick={() => onImageClick(msg.media_url!)}
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.media_url!}
                alt="客戶傳送的圖片"
                className="max-w-[240px] max-h-[320px] rounded-lg object-contain border border-morandi-muted/20 cursor-pointer hover:opacity-90 transition-opacity"
              />
            </button>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{displayContent || '(無內容)'}</p>
          )}
        </div>
        <p
          className={`text-[0.588rem] text-morandi-muted mt-0.5 ${
            isInbound ? 'text-left' : 'text-right'
          }`}
        >
          {footerLabel} ・ {new Date(msg.created_at).toLocaleString('zh-TW')}
        </p>
      </div>
    </div>
  )
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="圖片預覽"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        type="button"
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  )
}
