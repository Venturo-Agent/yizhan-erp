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
 * Phase 2（待後續 AI 業務 spec 接管）：
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

import { useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useRealtimeMutate } from '@/lib/swr/use-realtime-mutate'
import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { formatDateTaipei } from '@/lib/utils/format-date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { MessageCircle, Facebook, Instagram, Bot, Send, Loader2, Users, Pencil, Check, X, Camera, ChevronUp, ChevronDown, FileText, PanelRight, Pause, Tag, Sparkles, RefreshCw } from 'lucide-react'
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
  /** AI 速記卡 tone — derive 信心 emoji 用、null = 還沒生成速記卡 */
  memory_tone?: string | null
  /** 速記卡連續失敗 ≥3、暫停摘要 */
  memory_failed?: boolean
}

/** tone → emoji map（W 5/18 拍板：主動/完整 = 🟢、應付 = 🟡、失敗 = 🔴、無 = 空白）*/
function listToneEmoji(item: ConversationItem): string | null {
  if (item.memory_failed) return '🔴'
  const tone = item.memory_tone
  if (!tone) return null
  if (tone.includes('主動') || tone.includes('完整')) return '🟢'
  if (tone.includes('應付')) return '🟡'
  return null
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

// Channel badge 保留品牌色（不是硬編碼、是社群識別色）— W 拍板 2026-05-23
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

/**
 * @param hideList 主畫面在 sidebar 已經 render 一份對話列表時、傳 true 隱藏內建的 280px 列表
 *                 William 2026-05-21 v3.3：sidebar 列表 + 主畫面 thread、selectedId 走 URL ?conv=
 */
export function AiConversationsTab({ hideList = false }: { hideList?: boolean } = {}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  // selectedId 走 URL search param ?conv=<id>、跟 sidebar 共用 state
  const selectedId = searchParams.get('conv')
  const setSelectedId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('conv', id)
    else params.delete('conv')
    router.replace(`/ai?${params.toString()}`, { scroll: false })
  }
  const [panelOpen, setPanelOpen] = useState(false)
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id ?? null

  const listUrl =
    channelFilter === 'all'
      ? '/api/messaging/conversations'
      : `/api/messaging/conversations?channel=${channelFilter}`

  // 🔴 Phase C 主路徑（AUDIT_SWR_REALTIME.md S3 修法 1 + L3）：
  //   webhook / inbox-service 寫完訊息會用 broadcast 推一個 event 到
  //   workspace:${workspaceId}:inbox channel、這邊訂閱、收到就 mutate SWR。
  //   不依賴 postgres_changes（RLS + ssr cookie 已知不穩、5/18 註解寫得清楚）。
  //   selectedIdRef 給 channel callback 用、避免 effect deps 把 channel 重訂閱
  //   每次切對話都重訂 → race window。
  const selectedIdForBroadcast = useRef<string | null>(selectedId)
  useEffect(() => {
    selectedIdForBroadcast.current = selectedId
  }, [selectedId])

  useEffect(() => {
    if (!workspaceId) return

    const channelName = `workspace:${workspaceId}:inbox`
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new-message' }, (msg) => {
        // 對話列表 mutate（無論哪個 conversation 動了、列表都要重撈最新 last_message_*）
        void globalMutate(listUrl)
        // 該 conversation 的訊息流 mutate（只有當下選的對話才重撈）
        const payload = msg.payload as { conversationId?: string } | undefined
        const convId = payload?.conversationId
        if (convId && convId === selectedIdForBroadcast.current) {
          void globalMutate(`/api/messaging/conversations/${convId}/messages`)
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // listUrl 變（切 channel filter）也要重訂閱、確保 mutate 對的 key
  }, [workspaceId, listUrl])

  // 保留 postgres_changes 訂閱當第二保險：
  //   broadcast 是主路徑、cover LINE/FB/IG webhook + bot reply 走中央 helper 的情境。
  //   但 inbox_* 表還可能有「不走中央 helper 的寫入」（譬如直接 supabase.from('inbox_*').update
  //   做的 mark_as_read / display_name backfill / bot_paused toggle 等），這時 broadcast 沒推、
  //   postgres_changes 仍會 fire（即使不穩、有時就是會到）。雙路徑都收進同一 mutate、
  //   SWR 自己 dedupe、不會雙撈。
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

  // Phase C.4：拿掉 refreshInterval polling（既有 broadcast 主路徑 + postgres_changes 兜底、
  // 不再雙路兜底、避免每 5/10 秒一次全 workspace inbox SELECT 的 Supabase egress 浪費）。
  const { data: listResp, error: listError, isLoading: listLoading } = useSWR<{
    data: ConversationItem[]
  }>(listUrl, fetcher, { revalidateOnFocus: false })

  const conversations = useMemo(() => listResp?.data ?? [], [listResp])

  const { data: msgResp, isLoading: msgLoading } = useSWR<{
    data: MessageItem[]
    sender_avatars?: Record<string, string>
  }>(
    selectedId ? `/api/messaging/conversations/${selectedId}/messages` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const messages = useMemo(() => msgResp?.data ?? [], [msgResp])
  const senderAvatars = useMemo(() => msgResp?.sender_avatars ?? {}, [msgResp])
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

  // 業務面板 portal mount（layout.tsx 提供的 #ai-hub-business-panel-mount）
  // 用 state 等 mount 才 createPortal、避免 SSR / hydration 撞
  const [panelMount, setPanelMount] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPanelMount(document.getElementById('ai-hub-business-panel-mount'))
  }, [])

  return (
    <div className="flex h-full w-full">
      {/* v3.3 拿掉內層 Card：layout.tsx 外層已經是 rounded-xl card、再包一層會雙圓角 / 雙邊框
          兩個區（list + thread）改用 flex 容器同列、靠中間 border-r 隔開
          v3.4（5/22 William）：BusinessPanel 透過 portal 送到 layout 層 #ai-hub-business-panel-mount、
          變成獨立卡片、不再被外卡包住 */}
      <div className="flex-1 flex overflow-hidden min-w-0">
      {/* 左側：對話列表（Hub 模式、不分 channel） */}
      {!hideList && (
      <div className="w-[280px] flex flex-col flex-shrink-0 h-full border-r border-border">
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {listLoading && (
            <div className="p-6 text-center text-sm text-morandi-muted">載入中...</div>
          )}
          {listError && (
            <div className="p-6 text-center text-sm text-status-danger">載入失敗、請刷新頁面</div>
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
                    <span className="text-sm font-medium truncate flex items-center gap-1">
                      {listToneEmoji(c) && (
                        <span className="text-[0.7rem] shrink-0" title="AI 速記卡信心">
                          {listToneEmoji(c)}
                        </span>
                      )}
                      <span className="truncate">{c.display_name || '（未取得名稱）'}</span>
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
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 中間：對話 thread（同 Card 內、不另設 border）*/}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
              senderAvatars={senderAvatars}
              loading={msgLoading}
              conversationId={selectedConv.id}
              isGroup={
                selectedConv.external_user_id.startsWith('group:') ||
                selectedConv.external_user_id.startsWith('room:')
              }
              conversationDisplayName={selectedConv.display_name}
              conversationPictureUrl={selectedConv.picture_url}
            />
            <ReplyComposer conversationId={selectedConv.id} listUrl={listUrl} />
          </>
        )}
      </div>
      </div>

      {/* 右側業務面板（透過 portal 送到 layout 層、變成獨立卡片）*/}
      {selectedConv && panelOpen && panelMount && createPortal(
        <BusinessPanel
          conv={selectedConv}
          listUrl={listUrl}
          onClose={() => setPanelOpen(false)}
        />,
        panelMount
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
  senderAvatars,
  conversationDisplayName,
  conversationPictureUrl,
}: {
  messages: MessageItem[]
  loading: boolean
  conversationId: string
  isGroup: boolean
  senderAvatars: Record<string, string>
  conversationDisplayName: string | null
  conversationPictureUrl: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef<number>(0)
  const lastConversationIdRef = useRef<string>(conversationId)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Phase A.9（5/20 William 拍板）：切對話「從第一封滑到最後一封」UX bug 修法
  // 過去：useEffect 在 paint 後 fire、user 看到「先 render 在最上方、再 scroll 到底」中間態
  // 現在：useLayoutEffect 在 paint 前同步 mutate scrollTop、user 直接看到「停在最後一封」
  //
  // 觸發時機分兩類：
  //  - 切 conversation：conversationId 變、或同 conversationId 但 messages 從空→有（async 載入完）
  //    → instant jump（scrollTop = scrollHeight）
  //  - 同 conversation 新訊息進來：messages.length 變大、且不是初次載入
  //    → smooth scroll（保留「新訊息進來」的動畫感）
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const isConversationSwitch = lastConversationIdRef.current !== conversationId
    const isInitialLoad = lastMessageCountRef.current === 0 && messages.length > 0
    const isNewMessage =
      messages.length > lastMessageCountRef.current &&
      !isConversationSwitch &&
      !isInitialLoad

    if (isConversationSwitch || isInitialLoad) {
      // Instant jump：切對話 / 初次載入、直接到底、不要動畫
      el.scrollTop = el.scrollHeight
    } else if (isNewMessage) {
      // Smooth scroll：同對話新訊息進來、保留動畫
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }

    lastConversationIdRef.current = conversationId
    lastMessageCountRef.current = messages.length
  }, [conversationId, messages.length])

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
          <MessageBubble
            key={m.id}
            msg={m}
            isGroup={isGroup}
            onImageClick={setLightboxUrl}
            senderAvatars={senderAvatars}
            conversationDisplayName={conversationDisplayName}
            conversationPictureUrl={conversationPictureUrl}
          />
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
  const [refreshingProfile, setRefreshingProfile] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleRefreshGroupProfile = async () => {
    setRefreshingProfile(true)
    try {
      const res = await fetch('/api/line/admin/refresh-group-profiles', { method: 'POST' })
      const json = await res.json() as { data?: { updated: number; totalGroups: number }; error?: string }
      if (!res.ok) {
        toast.error(json.error || '重抓失敗')
        return
      }
      const updated = json.data?.updated ?? 0
      const total = json.data?.totalGroups ?? 0
      toast.success(`已從 LINE 重抓 ${updated} / ${total} 個群組頭像`)
      await globalMutate(listUrl)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '重抓失敗')
    } finally {
      setRefreshingProfile(false)
    }
  }

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
    <div className="px-4 h-[calc(3.75rem_-_1px)] border-b border-morandi-muted/20 flex items-center gap-3">
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
            <button onClick={handleSaveName} className="text-status-success hover:text-status-success"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="text-morandi-muted hover:text-morandi-primary"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-sm truncate">{conv.display_name || '（未取得名稱）'}</h3>
            {isGroup && (
              <>
                <button
                  onClick={() => { setNameInput(conv.display_name || ''); setEditingName(true) }}
                  className="text-morandi-muted hover:text-morandi-primary shrink-0"
                  title="改名"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRefreshGroupProfile}
                  disabled={refreshingProfile}
                  className="text-morandi-muted hover:text-morandi-primary shrink-0 disabled:opacity-50"
                  title="從 LINE 重抓群組頭像 + 名稱"
                >
                  {refreshingProfile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void handleSend()
    }
  }

  // 樣式對齊 src/app/(main)/channels/_components/ChannelView.tsx 的 composer
  // William 2026-05-19 拍板：兩邊輸入介面樣式統一
  return (
    <div className="border-t border-border px-4 py-3 bg-card flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="輸入回覆內容（Enter 送出、Shift+Enter 換行）"
        rows={1}
        disabled={sending}
        className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold"
      />
      <Button onClick={handleSend} disabled={sending || !text.trim()} className="gap-1">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        送出
      </Button>
    </div>
  )
}

// 復盤紀錄狀態（DB 對齊 conversation_retrospectives.status）
type RetroStatus = 'pending' | 'reviewed' | 'actioned' | 'archived'

interface RetrospectiveRow {
  id: string
  summary_text: string
  notes: string | null
  status: RetroStatus
  conversation_type: 'customer' | 'group' | 'room'
  message_count_at_generation: number
  created_at: string
  updated_at: string
}

const RETRO_STATUS_LABEL: Record<RetroStatus, string> = {
  pending: '待 review',
  reviewed: '已看過',
  actioned: '已處理',
  archived: '封存',
}

const RETRO_STATUS_COLOR: Record<RetroStatus, string> = {
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  reviewed: 'bg-status-info-bg text-status-info border-status-info/30',
  actioned: 'bg-status-success-bg text-status-success border-status-success/30',
  archived: 'bg-morandi-muted/20 text-morandi-muted border-morandi-muted/30',
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
  const historyUrl = `/api/messaging/conversations/${conversationId}/retrospectives`
  const { data: histResp, mutate: refetchHistory, isLoading: historyLoading } = useSWR<{
    data: RetrospectiveRow[]
  }>(historyUrl, fetcher, { revalidateOnFocus: false })

  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const history = histResp?.data ?? []

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}/retrospective`, {
        method: 'POST',
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!res.ok || !json.success) {
        setGenerateError(json.error || '生成失敗、請稍後再試')
        return
      }
      toast.success('新復盤已產生')
      await refetchHistory()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '網路錯誤')
    } finally {
      setGenerating(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-morandi-muted/20">
          <div>
            <h3 className="font-semibold text-morandi-primary">對話復盤</h3>
            <p className="text-xs text-morandi-muted">{customerName} · 共 {history.length} 筆歷史</p>
          </div>
          <button onClick={onClose} className="text-morandi-muted hover:text-morandi-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 跑新復盤 */}
        <div className="px-5 py-3 border-b border-morandi-muted/20 bg-morandi-container/10">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="gap-1.5 w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 分析對話中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {history.length > 0 ? '產新一份復盤' : '產第一份復盤'}
              </>
            )}
          </Button>
          {generateError && (
            <p className="text-xs text-status-danger mt-2">⚠️ {generateError}</p>
          )}
        </div>

        {/* 歷史列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {historyLoading && (
            <div className="text-center text-sm text-morandi-muted py-6">載入中...</div>
          )}
          {!historyLoading && history.length === 0 && (
            <div className="text-center text-sm text-morandi-muted py-12 border border-dashed border-morandi-muted/30 rounded-xl">
              尚無復盤紀錄。按上面按鈕產第一份。
            </div>
          )}
          {history.map(retro => (
            <RetrospectiveEntry
              key={retro.id}
              retro={retro}
              conversationId={conversationId}
              onChanged={() => void refetchHistory()}
            />
          ))}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

function RetrospectiveEntry({
  retro,
  conversationId,
  onChanged,
}: {
  retro: RetrospectiveRow
  conversationId: string
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(retro.status === 'pending')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(retro.notes ?? '')
  const [busy, setBusy] = useState(false)

  const patchUrl = `/api/messaging/conversations/${conversationId}/retrospectives/${retro.id}`
  const historyUrl = `/api/messaging/conversations/${conversationId}/retrospectives`

  const handleStatus = async (status: RetroStatus) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiMutate<{ success: boolean }>(patchUrl, {
        method: 'PATCH',
        body: { status },
        invalidate: [historyUrl],
      })
      if (!res.ok || !res.data?.success) {
        toast.error('更新失敗')
        return
      }
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const handleSaveNotes = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiMutate<{ success: boolean }>(patchUrl, {
        method: 'PATCH',
        body: { notes: notesDraft || null },
        invalidate: [historyUrl],
      })
      if (!res.ok || !res.data?.success) {
        toast.error('儲存失敗')
        return
      }
      toast.success('已儲存')
      setEditingNotes(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定刪除這筆復盤紀錄？')) return
    setBusy(true)
    try {
      const res = await apiMutate<{ success: boolean }>(patchUrl, {
        method: 'DELETE',
        invalidate: [historyUrl],
      })
      if (!res.ok || !res.data?.success) {
        toast.error('刪除失敗')
        return
      }
      toast.success('已刪除')
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const createdLabel = new Date(retro.created_at).toLocaleString('zh-TW', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <div className="border border-morandi-muted/20 rounded-xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-morandi-muted/10">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-morandi-muted hover:text-morandi-primary shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full border ${RETRO_STATUS_COLOR[retro.status]}`}>
          {RETRO_STATUS_LABEL[retro.status]}
        </span>
        <span className="text-xs text-morandi-muted">{createdLabel}</span>
        <span className="text-[0.65rem] text-morandi-muted">· {retro.message_count_at_generation} 則訊息</span>
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          disabled={busy}
          title="刪除"
          className="p-1 text-morandi-muted hover:text-status-danger disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-3 py-3 space-y-3">
          {/* 摘要本文 */}
          <div className="text-xs text-morandi-primary whitespace-pre-wrap leading-relaxed">
            {retro.summary_text}
          </div>

          {/* Notes */}
          <div className="border-t border-morandi-muted/10 pt-2">
            {!editingNotes ? (
              <div className="flex items-start gap-2">
                <p className="text-xs text-morandi-secondary flex-1">
                  {retro.notes ? (
                    <>
                      <span className="text-morandi-muted">補充：</span>
                      {retro.notes}
                    </>
                  ) : (
                    <span className="text-morandi-muted italic">尚無補充說明</span>
                  )}
                </p>
                <button
                  onClick={() => { setNotesDraft(retro.notes ?? ''); setEditingNotes(true) }}
                  className="text-morandi-muted hover:text-morandi-primary shrink-0"
                  title="編輯補充"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  placeholder="補充說明（如『已聯繫客人處理』）"
                  className="w-full h-16 text-xs px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={4000}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)} disabled={busy} className="h-7 text-xs">
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={busy} className="h-7 text-xs gap-1">
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    儲存
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 狀態快速切換 */}
          <div className="border-t border-morandi-muted/10 pt-2 flex flex-wrap gap-1.5">
            {(['pending', 'reviewed', 'actioned', 'archived'] as const).map(s => (
              <button
                key={s}
                onClick={() => void handleStatus(s)}
                disabled={busy || retro.status === s}
                className={`text-[0.65rem] px-2 py-0.5 rounded-full border transition-colors ${
                  retro.status === s
                    ? RETRO_STATUS_COLOR[s] + ' font-medium'
                    : 'border-morandi-muted/20 text-morandi-muted hover:border-morandi-primary/30 hover:text-morandi-primary'
                } disabled:opacity-60`}
              >
                {RETRO_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
    <div className="w-72 flex-shrink-0 h-full border border-border rounded-xl bg-card flex flex-col overflow-hidden">
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
            <span className={`text-xs ${!paused ? 'text-status-success font-medium' : 'text-morandi-muted'}`}>
              {!paused ? '回覆中' : '已暫停'}
            </span>
            <Switch checked={!paused} onCheckedChange={handleToggle} />
          </div>
        </div>

        {/* 速記卡 — AI 對客戶的長期記憶（每 50 則訊息重生）*/}
        <div className="px-3 py-3">
          <SpeedCardSection conversationId={conv.id} />
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

// ===== 速記卡（AI 長期記憶）=====
// 對應後端：generateMemorySummary（每 50 則訊息 fire-and-forget LLM 重寫）
// API：GET /api/messaging/conversations/[id]/memory（讀）
//      POST .../memory/regenerate（手動重生）
//      PATCH .../memory（編輯）
//      DELETE .../memory（清空）

interface MemoryApiResponse {
  data: {
    id: string
    memory_json: SpeedCardMemoryJson | null
    last_summarized_message_count: number
    last_summarized_at: string | null
    failed_attempts: number
    last_error: string | null
    created_at: string
    updated_at: string
  } | null
}

interface SpeedCardMemoryJson {
  persona?: {
    name?: string | null
    family?: string | null
    occupation?: string | null
    tone?: string
  }
  preferences?: {
    destinations?: string[]
    budget_range?: string | null
    departure_window?: string | null
    avoid?: string[]
    special_needs?: string[]
  }
  history?: {
    discussed_tours?: string[]
    rejected?: Array<{ tour: string; reason: string }>
    interested?: string[]
  }
  unanswered_questions?: string[]
  summary_text?: string
}

function toneEmoji(tone?: string): string {
  if (!tone) return '⚪'
  if (tone.includes('主動') || tone.includes('完整')) return '🟢'
  if (tone.includes('應付')) return '🟡'
  return '⚪'
}

function SpeedCardSection({ conversationId }: { conversationId: string }) {
  const apiUrl = `/api/messaging/conversations/${conversationId}/memory`
  const { data, isLoading, mutate } = useSWR<MemoryApiResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
  })
  const [regenLoading, setRegenLoading] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const memory = data?.data
  const m = memory?.memory_json ?? null

  const handleRegenerate = async () => {
    if (regenLoading) return
    setRegenLoading(true)
    try {
      const res = await apiMutate<{ success: boolean; error?: string }>(
        `/api/messaging/conversations/${conversationId}/memory/regenerate`,
        { method: 'POST', invalidate: [apiUrl] }
      )
      if (!res.ok || !res.data?.success) {
        toast.error(res.error || res.data?.error || '重生失敗')
      } else {
        toast.success('已重生速記卡')
      }
      void mutate()
    } finally {
      setRegenLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定清空這位客戶的速記卡？下次累積 20 則訊息會再自動生成。')) return
    const res = await apiMutate<{ success: boolean }>(apiUrl, {
      method: 'DELETE',
      invalidate: [apiUrl],
    })
    if (!res.ok) toast.error('刪除失敗')
    else toast.success('已清空')
    void mutate()
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-morandi-muted" />
        <p className="text-[0.65rem] font-semibold text-morandi-secondary uppercase tracking-wide flex-1">速記卡</p>
        {memory?.failed_attempts ? (
          <span className="text-[0.6rem] text-status-danger">失敗 {memory.failed_attempts}/3</span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-xs text-morandi-muted">載入中...</p>
      ) : !m ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-morandi-muted">
            尚未生成（對話累積 50 則訊息會自動建立）
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={regenLoading}
            onClick={handleRegenerate}
            className="h-7 text-xs gap-1"
          >
            {regenLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            立刻生成
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-xs">
          {/* 一句話總結 + tone emoji */}
          <div className="bg-morandi-container/30 rounded-md px-2 py-1.5">
            <div className="flex items-start gap-1.5">
              <span className="shrink-0">{toneEmoji(m.persona?.tone)}</span>
              <p className="text-morandi-primary leading-snug">
                {m.summary_text ?? '（無摘要）'}
              </p>
            </div>
          </div>

          {/* 偏好 */}
          {m.preferences && (
            <div className="space-y-1">
              {m.preferences.avoid && m.preferences.avoid.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[0.6rem] text-morandi-muted shrink-0">避忌：</span>
                  {m.preferences.avoid.map((x, i) => (
                    <span key={i} className="text-[0.65rem] bg-status-danger-bg text-status-danger px-1.5 py-0.5 rounded">
                      {x}
                    </span>
                  ))}
                </div>
              )}
              {m.preferences.budget_range && (
                <p className="text-[0.65rem]">
                  <span className="text-morandi-muted">預算：</span>
                  <span className="text-morandi-primary">{m.preferences.budget_range}</span>
                </p>
              )}
              {m.preferences.destinations && m.preferences.destinations.length > 0 && (
                <p className="text-[0.65rem]">
                  <span className="text-morandi-muted">想去：</span>
                  <span className="text-morandi-primary">{m.preferences.destinations.join('、')}</span>
                </p>
              )}
              {m.preferences.special_needs && m.preferences.special_needs.length > 0 && (
                <p className="text-[0.65rem]">
                  <span className="text-morandi-muted">特殊：</span>
                  <span className="text-morandi-primary">{m.preferences.special_needs.join('、')}</span>
                </p>
              )}
            </div>
          )}

          {/* 聊過的事 */}
          {m.history && (m.history.interested?.length || m.history.rejected?.length) ? (
            <div className="space-y-1 border-t border-morandi-muted/10 pt-1.5">
              {m.history.interested && m.history.interested.length > 0 && (
                <p className="text-[0.65rem]">
                  <span className="text-morandi-muted">有興趣：</span>
                  <span className="text-morandi-primary">{m.history.interested.join('、')}</span>
                </p>
              )}
              {m.history.rejected && m.history.rejected.length > 0 && (
                <p className="text-[0.65rem]">
                  <span className="text-morandi-muted">已拒絕：</span>
                  <span className="text-morandi-primary">
                    {m.history.rejected.map(r => `${r.tour}（${r.reason}）`).join('、')}
                  </span>
                </p>
              )}
            </div>
          ) : null}

          {/* AI 答不出來的問題 */}
          {m.unanswered_questions && m.unanswered_questions.length > 0 && (
            <div className="border-t border-morandi-muted/10 pt-1.5">
              <p className="text-[0.6rem] text-morandi-muted mb-0.5">AI 答不出來：</p>
              <ul className="space-y-0.5">
                {m.unanswered_questions.slice(0, 3).map((q, i) => (
                  <li key={i} className="text-[0.65rem] text-orange-700 line-clamp-1">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 失敗錯誤訊息 */}
          {memory?.last_error && (
            <p className="text-[0.6rem] text-status-danger line-clamp-2">
              ⚠️ {memory.last_error}
            </p>
          )}

          {/* 上次更新時間 + 操作按鈕 */}
          <div className="border-t border-morandi-muted/10 pt-1.5 flex items-center justify-between">
            <span className="text-[0.6rem] text-morandi-muted">
              {memory?.last_summarized_at
                ? `更新 ${new Date(memory.last_summarized_at).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' })}`
                : '尚未生成'}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleRegenerate}
                disabled={regenLoading}
                title="重生"
                className="p-1 text-morandi-muted hover:text-morandi-gold disabled:opacity-50"
              >
                {regenLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setShowEditor(true)}
                title="編輯"
                className="p-1 text-morandi-muted hover:text-morandi-primary"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={handleDelete}
                title="清空"
                className="p-1 text-morandi-muted hover:text-status-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditor && memory && (
        <SpeedCardEditor
          conversationId={conversationId}
          initialJson={m ?? {}}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
            setShowEditor(false)
            void mutate()
          }}
        />
      )}
    </>
  )
}

// ===== 速記卡編輯器（modal、純 JSON textarea、業務手動精修）=====
function SpeedCardEditor({
  conversationId,
  initialJson,
  onClose,
  onSaved,
}: {
  conversationId: string
  initialJson: SpeedCardMemoryJson
  onClose: () => void
  onSaved: () => void
}) {
  const [text, setText] = useState(() => JSON.stringify(initialJson, null, 2))
  const [saving, setSaving] = useState(false)
  const [parseErr, setParseErr] = useState<string | null>(null)

  const handleSave = async () => {
    let parsed: SpeedCardMemoryJson
    try {
      parsed = JSON.parse(text) as SpeedCardMemoryJson
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : 'JSON 格式錯誤')
      return
    }
    setSaving(true)
    try {
      const res = await apiMutate<{ success: boolean }>(
        `/api/messaging/conversations/${conversationId}/memory`,
        {
          method: 'PATCH',
          body: { memory_json: parsed },
          invalidate: [`/api/messaging/conversations/${conversationId}/memory`],
        }
      )
      if (!res.ok || !res.data?.success) {
        toast.error('儲存失敗')
        return
      }
      toast.success('已儲存')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-morandi-muted/20 flex items-center justify-between">
          <h3 className="font-semibold text-morandi-primary">編輯速記卡（JSON）</h3>
          <button onClick={onClose} className="text-morandi-muted hover:text-morandi-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex-1 overflow-auto">
          <p className="text-xs text-morandi-muted mb-2">
            手動編輯速記卡 JSON（persona / preferences / history / unanswered_questions / summary_text）。
            存檔後 AI 下次回覆會用這版。下次累積 20 則訊息會 AI 重生覆蓋、想保留就鎖住 ✋。
          </p>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setParseErr(null) }}
            className="w-full h-96 text-xs font-mono px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            spellCheck={false}
          />
          {parseErr && <p className="text-xs text-status-danger mt-2">⚠️ {parseErr}</p>}
        </div>
        <div className="px-5 py-3 border-t border-morandi-muted/20 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>取消</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            儲存
          </Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
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
  senderAvatars,
  conversationDisplayName,
  conversationPictureUrl,
}: {
  msg: MessageItem
  isGroup: boolean
  onImageClick: (url: string) => void
  senderAvatars: Record<string, string>
  conversationDisplayName: string | null
  conversationPictureUrl: string | null
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

  // 訊息頭像 + 名字（樣式參考 channels ChannelView.tsx）
  // - 群組訊息：用 groupSenderName 從 line_user_profiles map 拿 picture_url
  // - 1-對-1 訊息：用 conversation 的 display_name + picture_url（同一個發訊者）
  // - 系統 / 出站訊息：不顯示頭像
  const senderNameForDisplay =
    groupSenderName ??
    (isInbound ? conversationDisplayName : null) ??
    null

  const avatarUrl = groupSenderName
    ? (senderAvatars[groupSenderName] ?? null)
    : isInbound
      ? conversationPictureUrl
      : null
  const avatarInitial = (senderNameForDisplay ?? '?').slice(0, 1)
  const showAvatar = isInbound && Boolean(senderNameForDisplay || conversationPictureUrl)

  const footerLabel =
    senderNameForDisplay ??
    (msg.sender_type === 'contact'
      ? '客戶'
      : msg.sender_type === 'ai_agent'
        ? 'AI'
        : msg.sender_type === 'agent'
          ? '客服'
          : '系統')

  return (
    <div className={`flex gap-2 ${isInbound ? 'justify-start' : 'justify-end'}`}>
      {showAvatar && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-morandi-gold/20 overflow-hidden flex items-center justify-center text-xs font-medium text-morandi-gold">
          {avatarUrl ? (
            <img src={avatarUrl} alt={senderNameForDisplay ?? ''} className="w-full h-full object-cover" />
          ) : (
            <span>{avatarInitial}</span>
          )}
        </div>
      )}
      <div className="max-w-[75%]">
        {senderNameForDisplay && isInbound && (
          <p className="text-[0.65rem] text-morandi-secondary font-medium mb-0.5 px-1">
            {senderNameForDisplay}
          </p>
        )}
        <div
          className={`overflow-hidden w-fit ${isInbound ? '' : 'ml-auto'} ${
            isImage
              ? 'rounded-2xl'
              : `px-3 py-2 rounded-2xl ${
                  isInbound
                    ? 'bg-morandi-container/60 rounded-tl-sm'
                    : msg.sender_type === 'ai_agent'
                      ? 'bg-morandi-gold/20 text-morandi-primary rounded-tr-sm'
                      : 'bg-morandi-primary text-white rounded-tr-sm'
                }`
          }`}
        >
          {isImage ? (
            <button
              type="button"
              onClick={() => onImageClick(msg.media_url!)}
              className="block"
            >
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
