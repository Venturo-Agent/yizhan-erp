'use client'

/**
 * AI Hub - Retrospective tab
 *
 * 大型復盤（William 2026-05-18 拍板）：掃全 workspace 速記卡的「AI 答不出來的問題」、
 * LLM 聚合成主題清單、給業務 review、產 RAG 待補主題。
 *
 * 流程：
 *   1. 業務按「跑復盤」→ POST /api/ai/retrospective/aggregate（同步等 LLM）
 *   2. 結果寫進 rag_topic_queue、status='pending'
 *   3. UI 列清單、業務逐個標 added_to_rag / declined / 寫補充說明
 *
 * Phase 2（之後做）：
 *   - 排程自動跑（每週一早跑、業務週一看週報）
 *   - 跨 run 比對：「上週這個主題出現 3 次、這週又出現 5 次、優先補」
 */

import { useState } from 'react'
import useSWR from 'swr'
import { mutate } from '@/lib/swr/scoped-mutate'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Check, X, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { apiMutate } from '@/lib/swr/api-mutate'

type TopicStatus = 'pending' | 'added_to_rag' | 'declined'

interface RagTopic {
  id: string
  topic_summary: string
  occurrence_count: number
  example_conversation_ids: string[]
  example_questions: string[]
  status: TopicStatus
  notes: string | null
  generated_run_id: string | null
  generated_at: string | null
  created_at: string
  updated_at: string
}

interface AggregateResponse {
  success: boolean
  topicCount?: number
  runId?: string
  reason?: string
  error?: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const STATUS_LABELS: Record<TopicStatus | 'all', string> = {
  all: '全部',
  pending: '待 review',
  added_to_rag: '已補進 RAG',
  declined: '不採納',
}

export function AiRetrospectiveTab() {
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('pending')
  const [running, setRunning] = useState(false)

  const listUrl = `/api/ai/retrospective/topics?status=${statusFilter}`
  const {
    data: resp,
    isLoading,
    error,
  } = useSWR<{ data: RagTopic[] }>(listUrl, fetcher, {
    revalidateOnFocus: false,
  })
  const topics = resp?.data ?? []

  const handleRunRetrospective = async () => {
    if (running) return
    setRunning(true)
    try {
      const res = await fetch('/api/ai/retrospective/aggregate', { method: 'POST' })
      const json = (await res.json()) as AggregateResponse
      if (!res.ok || !json.success) {
        toast.error(json.error || json.reason || '復盤失敗')
        return
      }
      toast.success(`復盤完成、新增 ${json.topicCount ?? 0} 個主題`)
      // refresh list (all status filters)
      await mutate(
        key => typeof key === 'string' && key.startsWith('/api/ai/retrospective/topics'),
        undefined,
        { revalidate: true }
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '復盤失敗')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + Run button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-morandi-primary">對話復盤</h2>
          <p className="text-xs text-morandi-secondary mt-1 leading-relaxed">
            掃全 workspace 速記卡的「AI 答不出來」問題、聚合成主題清單、用來建 RAG 知識庫。
            <br />
            建議每週跑一次、上線初期可隨時跑看累積狀況。
          </p>
        </div>
        <Button onClick={handleRunRetrospective} disabled={running} className="gap-1.5 shrink-0">
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              LLM 跑中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              立刻跑復盤
            </>
          )}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-morandi-muted/20">
        {(['all', 'pending', 'added_to_rag', 'declined'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs border-b-2 -mb-px transition-colors ${
              statusFilter === s
                ? 'border-morandi-gold text-morandi-gold font-medium'
                : 'border-transparent text-morandi-secondary hover:text-morandi-primary'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Topic list */}
      {isLoading && <div className="text-center text-sm text-morandi-muted py-8">載入中...</div>}
      {error && <div className="text-center text-sm text-status-danger py-8">載入失敗、請刷新</div>}
      {!isLoading && topics.length === 0 && (
        <div className="text-center text-sm text-morandi-muted py-12 border border-dashed border-morandi-muted/30 rounded-xl">
          {statusFilter === 'pending'
            ? '沒有待 review 的主題。按右上「立刻跑復盤」掃描所有速記卡產生新主題。'
            : `沒有 ${STATUS_LABELS[statusFilter]} 的主題`}
        </div>
      )}

      {!isLoading && topics.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-24" />
              <col />
              <col className="w-20" />
              <col className="w-32" />
              <col className="w-44" />
            </colgroup>
            <thead>
              <tr className="bg-morandi-container/30 text-morandi-secondary text-xs">
                <th className="text-left font-medium px-3 py-2">狀態</th>
                <th className="text-left font-medium px-3 py-2">主題</th>
                <th className="text-right font-medium px-3 py-2">對話數</th>
                <th className="text-left font-medium px-3 py-2">產生時間</th>
                <th className="text-right font-medium px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {topics.map(t => (
                <TopicRow key={t.id} topic={t} onChanged={() => void mutate(listUrl)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TopicRow({ topic, onChanged }: { topic: RagTopic; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(topic.notes ?? '')
  const [busy, setBusy] = useState(false)

  const handleStatusChange = async (status: TopicStatus) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiMutate<{ success: boolean }>(
        `/api/ai/retrospective/topics/${topic.id}`,
        {
          method: 'PATCH',
          body: { status },
          invalidate: ['/api/ai/retrospective/topics'],
        }
      )
      if (!res.ok || !res.data?.success) {
        toast.error('更新失敗')
        return
      }
      toast.success(
        status === 'added_to_rag'
          ? '已標為「已補進 RAG」'
          : status === 'declined'
            ? '已標為「不採納」'
            : '已重置為待 review'
      )
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const handleSaveNotes = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiMutate<{ success: boolean }>(
        `/api/ai/retrospective/topics/${topic.id}`,
        {
          method: 'PATCH',
          body: { notes: notesDraft || null },
          invalidate: ['/api/ai/retrospective/topics'],
        }
      )
      if (!res.ok || !res.data?.success) {
        toast.error('儲存失敗')
        return
      }
      toast.success('已儲存補充說明')
      setEditingNotes(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const statusColor =
    topic.status === 'added_to_rag'
      ? 'bg-status-success-bg text-status-success border-status-success/30'
      : topic.status === 'declined'
        ? 'bg-morandi-muted/20 text-morandi-muted border-morandi-muted/30'
        : 'bg-status-warning-bg text-status-warning border-status-warning/30'

  return (
    <>
      <tr className="border-t border-border hover:bg-morandi-container/20 transition-colors">
        <td className="px-3 py-2 align-top">
          <span
            className={`inline-block text-[0.65rem] px-2 py-0.5 rounded-full border ${statusColor}`}
          >
            {STATUS_LABELS[topic.status]}
          </span>
        </td>
        <td className="px-3 py-2 align-top">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-left text-morandi-primary hover:text-morandi-gold flex items-start gap-1.5"
          >
            <span className="text-morandi-muted mt-0.5 shrink-0">{expanded ? '▾' : '▸'}</span>
            <span className="leading-snug">{topic.topic_summary}</span>
          </button>
        </td>
        <td className="px-3 py-2 align-top text-right text-morandi-secondary">
          {topic.occurrence_count}
        </td>
        <td className="px-3 py-2 align-top text-xs text-morandi-muted">
          {topic.generated_at
            ? new Date(topic.generated_at).toLocaleString('zh-TW', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : '—'}
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex gap-1.5 justify-end">
            {topic.status === 'pending' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleStatusChange('added_to_rag')}
                  className="h-7 text-xs gap-1 border-status-success/30 text-status-success hover:bg-status-success-bg"
                >
                  <Check className="w-3 h-3" />
                  已補進 RAG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleStatusChange('declined')}
                  className="h-7 text-xs gap-1 text-morandi-muted hover:bg-morandi-muted/10"
                >
                  <X className="w-3 h-3" />
                  不採納
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void handleStatusChange('pending')}
                className="h-7 text-xs"
              >
                重置
              </Button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-t border-border bg-morandi-container/10">
          <td className="hidden md:table-cell" />
          <td colSpan={4} className="px-3 py-3 space-y-3">
            {/* 範例原話 */}
            {topic.example_questions.length > 0 && (
              <div>
                <p className="text-xs text-morandi-muted mb-1">
                  範例原話（{topic.example_questions.length}）
                </p>
                <ul className="space-y-1 pl-4 border-l-2 border-morandi-muted/20">
                  {topic.example_questions.map((q, i) => (
                    <li key={i} className="text-xs text-morandi-primary">
                      「{q}」
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 補充說明 */}
            {!editingNotes ? (
              <div className="flex items-start gap-2">
                <p className="text-xs text-morandi-secondary flex-1">
                  {topic.notes ? (
                    <>
                      <span className="text-morandi-muted">補充：</span>
                      {topic.notes}
                    </>
                  ) : (
                    <span className="text-morandi-muted italic">尚無補充說明</span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setNotesDraft(topic.notes ?? '')
                    setEditingNotes(true)
                  }}
                  className="text-morandi-muted hover:text-morandi-primary shrink-0"
                  title="編輯補充"
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  placeholder="補充說明（如『已寫進 KB 飯店推薦條目』）"
                  className="w-full h-16 text-xs px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={2000}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingNotes(false)}
                    disabled={busy}
                    className="h-7 text-xs"
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={busy}
                    className="h-7 text-xs gap-1"
                  >
                    {busy ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    儲存
                  </Button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
