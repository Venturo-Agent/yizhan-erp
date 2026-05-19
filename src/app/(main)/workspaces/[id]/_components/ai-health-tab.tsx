'use client'

/**
 * AI 健康度 / AI Hub 總覽 共用 dashboard
 *
 * 一份 component 兩個受眾：
 *   - 'tenant-admin'（漫途 staff、租戶管理頁）：看任一客戶 workspace 的 AI 表現、做 consulting
 *   - 'customer'（SaaS 客戶 admin、AI Hub 總覽）：看自己 workspace 的 AI 表現
 *
 * 資料 shape 完全相同、走不同 API：
 *   - tenant-admin → /api/workspaces/[id]/ai-health（workspaces.write 守門）
 *   - customer     → /api/ai/health（ai_hub.read 守門、自己 workspace）
 *
 * 文案 / 提示卡會依 audience 調整。
 */

import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Activity, MessageSquare, Sparkles, BookOpenCheck, BrainCircuit, AlertCircle } from 'lucide-react'

interface AiHealthData {
  conversations: {
    total: number
    customer: number
    group: number
    room: number
    last7d_active: number
    bot_paused: number
  }
  messages: {
    total: number
    inbound: number
    outbound_ai: number
    outbound_human: number
    last7d_total: number
    ai_takeover_rate: number
  }
  memories: {
    total: number
    paused_failures: number
    tone_active: number
    tone_passive: number
    tone_unknown: number
  }
  retrospectives: {
    total: number
    pending: number
    reviewed: number
    actioned: number
    archived: number
  }
  rag_topics: {
    total: number
    pending: number
    added_to_rag: number
    declined: number
    top_unanswered: Array<{ topic: string; count: number }>
  }
}

type Audience = 'tenant-admin' | 'customer'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** 租戶管理頁包 — 給漫途 staff 看的版本 */
export function AiHealthTab({ workspaceId }: { workspaceId: string }) {
  return (
    <AiHealthDashboard
      apiUrl={`/api/workspaces/${workspaceId}/ai-health`}
      audience="tenant-admin"
    />
  )
}

/** AI Hub 總覽 / 租戶管理 共用 dashboard */
export function AiHealthDashboard({
  apiUrl,
  audience,
}: {
  apiUrl: string
  audience: Audience
}) {
  const { data: resp, error, isLoading } = useSWR<{ data: AiHealthData }>(
    apiUrl,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-morandi-muted">載入中...</div>
  }
  if (error || !resp?.data) {
    return <div className="p-6 text-center text-sm text-red-600">載入失敗、請刷新</div>
  }

  const d = resp.data
  const takeoverPct = (d.messages.ai_takeover_rate * 100).toFixed(0)

  const headerTitle = audience === 'tenant-admin' ? 'AI 健康度' : 'AI 總覽'
  const headerSub =
    audience === 'tenant-admin'
      ? '漫途 consulting 視角：彙總此客戶 workspace 的 AI 整體表現。SaaS 客戶看不到此頁。'
      : '你的 AI 客服 / AI 助理整體運作狀態。看訊息量、AI 接管程度、客戶聊得怎樣、答不出來的問題。'

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-morandi-primary">{headerTitle}</h2>
        <p className="text-xs text-morandi-secondary mt-1">{headerSub}</p>
      </div>

      {/* 統計卡片區 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={MessageSquare}
          label="活躍對話（7d）"
          value={d.conversations.last7d_active}
          sub={`總 ${d.conversations.total} · 群組 ${d.conversations.group} · 1對1 ${d.conversations.customer}`}
        />
        <StatCard
          icon={Activity}
          label="近 30 天訊息"
          value={d.messages.total}
          sub={`7d ${d.messages.last7d_total} · 客戶 ${d.messages.inbound} · AI ${d.messages.outbound_ai} · 人 ${d.messages.outbound_human}`}
        />
        <StatCard
          icon={BrainCircuit}
          label="AI 接管率"
          value={`${takeoverPct}%`}
          sub={`AI 回 ${d.messages.outbound_ai} / 人類回 ${d.messages.outbound_human}`}
          highlight={d.messages.ai_takeover_rate < 0.3 ? 'warn' : null}
        />
        <StatCard
          icon={AlertCircle}
          label="Bot 被暫停"
          value={d.conversations.bot_paused}
          sub={`占 ${d.conversations.total > 0 ? Math.round((d.conversations.bot_paused / d.conversations.total) * 100) : 0}%`}
          highlight={d.conversations.bot_paused > 0 ? 'warn' : null}
        />
      </div>

      {/* 速記卡狀態 */}
      <Card className="p-5 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-morandi-gold" />
          <h3 className="text-sm font-semibold text-morandi-primary">速記卡狀態</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Metric label="總數" value={d.memories.total} />
          <Metric label="🟢 主動 / 完整" value={d.memories.tone_active} />
          <Metric label="🟡 應付" value={d.memories.tone_passive} highlight={d.memories.tone_passive > d.memories.tone_active ? 'warn' : null} />
          <Metric label="⚪ 未分類" value={d.memories.tone_unknown} />
          <Metric label="🔴 連續失敗 ≥3" value={d.memories.paused_failures} highlight={d.memories.paused_failures > 0 ? 'danger' : null} />
        </div>
      </Card>

      {/* 復盤統計 */}
      <Card className="p-5 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <BookOpenCheck className="w-4 h-4 text-morandi-gold" />
          <h3 className="text-sm font-semibold text-morandi-primary">復盤紀錄</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Metric label="總次數" value={d.retrospectives.total} />
          <Metric label="🟠 待 review" value={d.retrospectives.pending} highlight={d.retrospectives.pending > 0 ? 'warn' : null} />
          <Metric label="🔵 已看過" value={d.retrospectives.reviewed} />
          <Metric label="🟢 已處理" value={d.retrospectives.actioned} />
          <Metric label="⚫ 已封存" value={d.retrospectives.archived} />
        </div>
      </Card>

      {/* 未解問題 top 5 */}
      <Card className="p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-morandi-gold" />
            <h3 className="text-sm font-semibold text-morandi-primary">AI 答不出來的問題（Top 5）</h3>
          </div>
          <span className="text-xs text-morandi-muted">
            總 {d.rag_topics.total} 個主題 · 待 {d.rag_topics.pending} · 已補 RAG {d.rag_topics.added_to_rag} · 不採納 {d.rag_topics.declined}
          </span>
        </div>
        {d.rag_topics.top_unanswered.length === 0 ? (
          <p className="text-sm text-morandi-muted text-center py-6">
            尚無待 review 的未解問題。客戶可在 AI Hub → 對話復盤 tab 跑「立刻跑復盤」產出。
          </p>
        ) : (
          <ul className="space-y-2">
            {d.rag_topics.top_unanswered.map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-morandi-gold/10 text-morandi-gold text-xs font-medium flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-morandi-primary line-clamp-1">{t.topic}</span>
                <span className="text-xs text-morandi-muted shrink-0">出現 {t.count} 次</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 受眾不同、提示文案不同 */}
      <Card className="p-4 border border-morandi-gold/30 bg-morandi-gold/5">
        <p className="text-xs text-morandi-secondary leading-relaxed">
          <span className="font-medium text-morandi-primary">使用建議</span>：
          {audience === 'tenant-admin' ? (
            <>進客戶對應 AI Hub 看實際對話、看 AI 答不出來的主題建議客戶優先補哪些知識、速記卡 🔴 失敗多代表 AI 設定可能有問題（prompt / model / token）需要協助調整。</>
          ) : (
            <>切到「對話管理」看實際對話、「對話復盤」跑 AI 答不出來的主題清單建知識庫、若速記卡有 🔴 表示 AI 連續失敗、聯絡漫途協助調整 prompt / model。</>
          )}
        </p>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: typeof MessageSquare
  label: string
  value: number | string
  sub: string
  highlight?: 'warn' | 'danger' | null
}) {
  const borderColor =
    highlight === 'danger' ? 'border-red-200 bg-red-50' :
    highlight === 'warn' ? 'border-orange-200 bg-orange-50' :
    'border-border bg-white'
  return (
    <Card className={`p-4 ${borderColor}`}>
      <div className="flex items-center gap-1.5 text-morandi-muted mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[0.65rem] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-morandi-primary leading-none mb-1">{value}</p>
      <p className="text-[0.65rem] text-morandi-muted leading-snug">{sub}</p>
    </Card>
  )
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: 'warn' | 'danger' | null
}) {
  const valueColor =
    highlight === 'danger' ? 'text-red-700' :
    highlight === 'warn' ? 'text-orange-700' :
    'text-morandi-primary'
  return (
    <div>
      <p className="text-[0.65rem] text-morandi-muted mb-0.5">{label}</p>
      <p className={`text-lg font-semibold leading-none ${valueColor}`}>{value}</p>
    </div>
  )
}
