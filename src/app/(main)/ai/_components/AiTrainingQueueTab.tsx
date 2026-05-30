'use client'

/**
 * AI Hub - Training Queue tab
 *
 * 待訓練清單（William 2026-05-28 拍板「白痴起點 + 訓練飛輪」）：
 *   AI 在「資料庫沒這項料 → 轉接顧問」場景、自動 call record_knowledge_gap tool
 *   把客戶問題寫進 ai_knowledge_gaps（pending）。本 tab 列清單、業務 review 後標
 *   trained / declined / duplicated、補料進 KB → AI 從白痴變聰明的飛輪。
 *
 * 流程：
 *   1. 客戶問「日本北海道有什麼景點？」
 *   2. AI 沒料 → 回「我們的 AI 還沒被訓練過、轉接顧問」+ call record_knowledge_gap
 *   3. 本表多一筆 status='pending'
 *   4. 業務在這頁 review → 補料到 attractions / KB → 標 'trained'
 *   5. 下次相同問題、AI 答得出來（注入命中 → 不再 call tool）
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X, Edit, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { apiMutate } from '@/lib/swr/api-mutate'
import {
  useAiKnowledgeGaps,
  invalidateAiKnowledgeGaps,
  type AiKnowledgeGap as KnowledgeGap,
  type KnowledgeGapStatus as GapStatus,
} from '@/data'

type FilterStatus = GapStatus | 'all'

const STATUS_LABELS: Record<FilterStatus, string> = {
  all: '全部',
  pending: '待 review',
  trained: '已訓練',
  declined: '不採納',
  duplicated: '已合併',
}

export function AiTrainingQueueTab() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending')

  // 紅線 F：讀資料走 entity hook、不散刻 useSWR。filter 走 server-side .eq()
  const filter = statusFilter === 'all' ? undefined : { status: statusFilter }
  const { items: gaps, loading: isLoading, error } = useAiKnowledgeGaps({ filter })

  return (
    <div className="p-6 space-y-6">
      {/* Header 說明 */}
      <div>
        <h2 className="text-lg font-semibold text-morandi-primary">待訓練清單</h2>
        <p className="text-xs text-morandi-secondary mt-1 leading-relaxed">
          AI 在「資料庫沒這項料」時、會自動把客戶問題記在這裡、業務補料進知識庫後標「已訓練」、 AI
          下次就會答了。
          <br />
          這是「白痴 AI 變聰明」的飛輪 — 別讓有價值的問題隨對話蒸發。
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-morandi-muted/20">
        {(['pending', 'trained', 'declined', 'duplicated', 'all'] as const).map(s => (
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

      {/* List */}
      {isLoading && <div className="text-center text-sm text-morandi-muted py-8">載入中...</div>}
      {error && <div className="text-center text-sm text-status-danger py-8">載入失敗、請刷新</div>}
      {!isLoading && gaps.length === 0 && (
        <div className="text-center text-sm text-morandi-muted py-12 border border-dashed border-morandi-muted/30 rounded-xl">
          {statusFilter === 'pending'
            ? '太好了、目前沒有 AI 答不出的問題待 review。'
            : `沒有「${STATUS_LABELS[statusFilter]}」的紀錄`}
        </div>
      )}

      {!isLoading && gaps.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-20" />
              <col className="w-40" />
              <col />
              <col className="w-32" />
              <col className="w-44" />
            </colgroup>
            <thead>
              <tr className="bg-morandi-container/30 text-morandi-secondary text-xs">
                <th className="text-left font-medium px-3 py-2">狀態</th>
                <th className="text-left font-medium px-3 py-2">主題</th>
                <th className="text-left font-medium px-3 py-2">客戶原話</th>
                <th className="text-left font-medium px-3 py-2">問題時間</th>
                <th className="text-right font-medium px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g: KnowledgeGap) => (
                <GapRow key={g.id} gap={g} onChanged={() => void invalidateAiKnowledgeGaps()} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function GapRow({ gap, onChanged }: { gap: KnowledgeGap; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(gap.notes ?? '')
  const [busy, setBusy] = useState(false)

  const handleStatusChange = async (status: GapStatus) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiMutate<{ success: boolean }>(`/api/ai/training-queue/${gap.id}`, {
        method: 'PATCH',
        body: { status },
      })
      if (!res.ok || !res.data?.success) {
        toast.error('更新失敗')
        return
      }
      toast.success(
        status === 'trained'
          ? '已標為「已訓練」'
          : status === 'declined'
            ? '已標為「不採納」'
            : status === 'duplicated'
              ? '已標為「重複」'
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
      const res = await apiMutate<{ success: boolean }>(`/api/ai/training-queue/${gap.id}`, {
        method: 'PATCH',
        body: { notes: notesDraft || null },
      })
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
    gap.status === 'trained'
      ? 'bg-status-success-bg text-status-success border-status-success/30'
      : gap.status === 'declined'
        ? 'bg-morandi-muted/20 text-morandi-muted border-morandi-muted/30'
        : gap.status === 'duplicated'
          ? 'bg-status-info-bg text-status-info border-status-info/30'
          : 'bg-status-warning-bg text-status-warning border-status-warning/30'

  return (
    <>
      <tr className="border-t border-border hover:bg-morandi-container/20 transition-colors">
        <td className="px-3 py-2 align-top">
          <span
            className={`inline-block text-[0.65rem] px-2 py-0.5 rounded-full border ${statusColor}`}
          >
            {STATUS_LABELS[gap.status]}
          </span>
        </td>
        <td className="px-3 py-2 align-top">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-left text-morandi-primary hover:text-morandi-gold flex items-start gap-1.5"
          >
            <span className="text-morandi-muted mt-0.5 shrink-0">{expanded ? '▾' : '▸'}</span>
            <span className="leading-snug">
              {gap.topic_hint || <span className="text-morandi-muted italic">無主題</span>}
            </span>
          </button>
        </td>
        <td className="px-3 py-2 align-top">
          <span className="text-morandi-primary text-xs line-clamp-2 leading-snug">
            「{gap.question_text}」
          </span>
        </td>
        <td className="px-3 py-2 align-top text-xs text-morandi-muted">
          {gap.created_at
            ? new Date(gap.created_at).toLocaleString('zh-TW', {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : '—'}
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex gap-1.5 justify-end flex-wrap">
            {gap.status === 'pending' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleStatusChange('trained')}
                  className="h-7 text-xs gap-1 border-status-success/30 text-status-success hover:bg-status-success-bg"
                >
                  <Check className="w-3 h-3" />
                  已訓練
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
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleStatusChange('duplicated')}
                  className="h-7 text-xs gap-1 text-status-info hover:bg-status-info-bg"
                  title="跟既有主題重複、合併標記"
                >
                  <Copy className="w-3 h-3" />
                  合併
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
            {/* 客戶 + AI 回應對照 */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-morandi-muted mb-1">客戶原話</p>
                <p className="text-xs text-morandi-primary leading-snug pl-3 border-l-2 border-morandi-muted/20">
                  「{gap.question_text}」
                </p>
                {gap.customer_name && (
                  <p className="text-[0.65rem] text-morandi-muted mt-1">
                    來自：{gap.customer_name}
                    {gap.external_user_id && (
                      <span className="ml-1 font-mono">
                        （{gap.external_user_id.slice(0, 12)}…）
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-morandi-muted mb-1">AI 怎麼回的</p>
                {gap.ai_response ? (
                  <p className="text-xs text-morandi-secondary leading-snug pl-3 border-l-2 border-morandi-muted/20 whitespace-pre-wrap">
                    {gap.ai_response}
                  </p>
                ) : (
                  <p className="text-xs text-morandi-muted italic">（未記錄）</p>
                )}
              </div>
            </div>

            {/* 補充說明 */}
            {!editingNotes ? (
              <div className="flex items-start gap-2">
                <p className="text-xs text-morandi-secondary flex-1">
                  {gap.notes ? (
                    <>
                      <span className="text-morandi-muted">補充：</span>
                      {gap.notes}
                    </>
                  ) : (
                    <span className="text-morandi-muted italic">
                      尚無補充說明（譬如：「已補進景點表的清邁條目」）
                    </span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setNotesDraft(gap.notes ?? '')
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
                  placeholder="補充說明（譬如：『已補進景點表的清邁夜市條目』）"
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
