'use client'

/**
 * AI 行程展示助理對話框（工單6：一鍵 UX + AI 主動反問三類亮點）
 *
 * 流程（William 親口）：
 * 1. highlight：系統主動反問「本次行程特別安排？」三類勾選（入住 / 特色景點 / 餐廳）
 * 2.（勾選後）按類掃 canvas 找「有料」候選 → 升級成 spotlight（結構改動、累積進 workingCanvas）
 *    沒料的類別 → 明確告知業務「本次略過」（不開天窗、不亂編 = 賣點命脈零幻覺底線）
 * 3. select：對升級後的 workingCanvas 跑 analyzeCanvasForAi（含新 spotlight 的 lead 潤色 + 既有空白）
 *    業務勾選想生成的項目
 * 4. generating：一次 MiniMax call → 回傳所有勾選項目的生成內容（含後端零幻覺護欄 warn 標記）
 * 5. review：業務逐項複核 → 套用：workingCanvas（含升級）+ AI patches 一起回給頁面
 *
 * 成本設計：整個流程一次 API call，abab6.5s-chat 約 0.05-0.1 台幣
 *
 * 防連點 / 失敗還原：「開始生成」disabled={loading}；API 失敗 → 顯示 error + 不污染 canvas
 * （onApply 才動真 canvas、生成失敗時頁面 canvas 完全沒被改、天然還原）
 */

import * as React from 'react'
import { Sparkles, X, ChevronRight, Check, BedDouble, MapPin, UtensilsCrossed } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Canvas } from '@/components/canvas-renderer/types'
import {
  analyzeCanvasForAi,
  compressCanvasForAi,
  promoteHighlightCandidate,
  scanAttractionHighlightCandidates,
  scanHotelHighlightCandidates,
  scanRestaurantHighlightCandidates,
  type AiSuggestion,
  type AiPatch,
  type HighlightCandidate,
} from './canvas-utils'

const TOOLBAR_BG = '#2D1F18'
const COPPER = '#C85A38'

type DialogStep = 'highlight' | 'select' | 'generating' | 'review'

// 三類亮點：入住（飯店）・特色景點・餐廳
type HighlightKind = 'hotel' | 'attraction' | 'restaurant'

interface AiAssistDialogProps {
  code: string
  canvas: Canvas
  /**
   * 套用：workingCanvas = 已含「亮點升級」的結構改動的 canvas（沒升級就 === 原 canvas）；
   * patches = AI 文案 patch（套在 workingCanvas 上）。頁面端先套 workingCanvas、再依序套 patches
   */
  onApply: (workingCanvas: Canvas, patches: AiPatch[]) => void
  onClose: () => void
}

interface HighlightCategoryMeta {
  kind: HighlightKind
  label: string
  hint: string
  icon: React.ReactNode
  scan: (canvas: Canvas) => HighlightCandidate[]
}

// 排印：三類描述句末不收句號、分隔「・」貼緊
const HIGHLIGHT_CATEGORIES: HighlightCategoryMeta[] = [
  {
    kind: 'hotel',
    label: '安排入住',
    hint: '把特色住宿抬成亮點・有料才生',
    icon: <BedDouble size={17} />,
    scan: scanHotelHighlightCandidates,
  },
  {
    kind: 'attraction',
    label: '安排特色景點',
    hint: '把有料景點抬成亮點・潤色介紹',
    icon: <MapPin size={17} />,
    scan: scanAttractionHighlightCandidates,
  },
  {
    kind: 'restaurant',
    label: '安排餐廳',
    hint: '把特色餐食抬成亮點・有料才生',
    icon: <UtensilsCrossed size={17} />,
    scan: scanRestaurantHighlightCandidates,
  },
]

// 略過告知：哪些類別勾了但沒料、要明確跟業務講「本次略過」
interface SkipNotice {
  kind: HighlightKind
  label: string
}

export function AiAssistDialog({ code, canvas, onApply, onClose }: AiAssistDialogProps) {
  // workingCanvas = 反問步驟升級亮點後的 canvas（select / generate 都基於它）
  const [workingCanvas, setWorkingCanvas] = React.useState<Canvas>(canvas)
  const [step, setStep] = React.useState<DialogStep>('highlight')

  // 反問步驟：三類勾選（預設都不勾、由業務主動點）
  const [checkedKinds, setCheckedKinds] = React.useState<Set<HighlightKind>>(new Set())
  // 升級後沒料被略過的類別、進 select 步驟時展示給業務看
  const [skipped, setSkipped] = React.useState<SkipNotice[]>([])
  // 這次升級了幾塊（給 select 步驟提示用）
  const [promotedCount, setPromotedCount] = React.useState(0)

  // select 步驟：基於 workingCanvas 重新掃空白 + 亮點潤色建議
  const suggestions = React.useMemo(() => analyzeCanvasForAi(workingCanvas), [workingCanvas])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const [patches, setPatches] = React.useState<AiPatch[]>([])
  const [accepted, setAccepted] = React.useState<Set<string>>(new Set())
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const toggleKind = (kind: HighlightKind) =>
    setCheckedKinds(prev => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAccept = (id: string) =>
    setAccepted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // ── 反問步驟「下一步」：按勾選類別升級亮點、決定哪些沒料略過 ──
  const handleHighlightNext = () => {
    let next = canvas // 永遠從原始 canvas 重算（避免重複按造成累積升級）
    const skip: SkipNotice[] = []
    let promoted = 0

    for (const cat of HIGHLIGHT_CATEGORIES) {
      if (!checkedKinds.has(cat.kind)) continue
      const candidates = cat.scan(next)
      if (candidates.length === 0) {
        // 沒料 → 明確記下「本次略過」、不亂編
        skip.push({ kind: cat.kind, label: cat.label })
        continue
      }
      for (const c of candidates) {
        next = promoteHighlightCandidate(next, c)
        promoted += 1
      }
    }

    setWorkingCanvas(next)
    setSkipped(skip)
    setPromotedCount(promoted)

    // 升級後重新掃建議、預設全勾（包含剛升級出來的 spotlight lead 潤色）
    const nextSuggestions = analyzeCanvasForAi(next)
    setSelected(new Set(nextSuggestions.map(s => s.id)))
    setError(null)
    setStep('select')
  }

  const handleGenerate = async () => {
    const chosen = suggestions.filter(s => selected.has(s.id))
    if (!chosen.length || loading) return

    setStep('generating')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tours/${encodeURIComponent(code)}/ai-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_summary: compressCanvasForAi(workingCanvas),
          requests: chosen.map(s => ({
            id: s.id,
            label: s.label,
            instruction: s.instruction,
            target: s.target,
            source_material: s.source_material,
          })),
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `AI 服務回應錯誤 ${res.status}`)
      }

      const data = (await res.json()) as { patches: AiPatch[] }
      const result = data.patches ?? []
      setPatches(result)
      setAccepted(new Set(result.map(p => p.id)))
      setStep('review')
    } catch (err) {
      // 失敗還原：退回 select 步驟、顯示 error；canvas 完全沒被動（onApply 才動真 canvas）
      setError(err instanceof Error ? err.message : '生成失敗，請稍後再試')
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    // 套用：把升級後的 workingCanvas + 勾選的 AI patch 一起回頁面
    onApply(
      workingCanvas,
      patches.filter(p => accepted.has(p.id))
    )
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: 540,
          maxWidth: '90vw',
          maxHeight: '82vh',
          background: '#FDFAF6',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: TOOLBAR_BG,
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={17} color={COPPER} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>AI 行程助理</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 'highlight' && <HighlightStep checked={checkedKinds} onToggle={toggleKind} />}
          {step === 'select' && (
            <SelectStep
              suggestions={suggestions}
              selected={selected}
              skipped={skipped}
              promotedCount={promotedCount}
              error={error}
              onToggle={toggleSelect}
            />
          )}
          {step === 'generating' && <GeneratingStep />}
          {step === 'review' && (
            <ReviewStep patches={patches} accepted={accepted} onToggle={toggleAccept} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e8e0d4',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#FDFAF6',
            flexShrink: 0,
          }}
        >
          <button type="button" onClick={onClose} style={btnStyle('ghost')}>
            取消
          </button>

          {step === 'highlight' && (
            <button type="button" onClick={handleHighlightNext} style={btnStyle('primary')}>
              下一步
              <ChevronRight size={14} />
            </button>
          )}

          {step === 'select' && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={selected.size === 0 || loading}
              style={btnStyle('primary', selected.size === 0 || loading)}
            >
              開始生成
              <ChevronRight size={14} />
            </button>
          )}

          {step === 'review' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={accepted.size === 0 && patches.length > 0}
              style={btnStyle('success', accepted.size === 0 && patches.length > 0)}
            >
              <Check size={14} />
              套用（{accepted.size} 項）
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function HighlightStep({
  checked,
  onToggle,
}: {
  checked: Set<HighlightKind>
  onToggle: (kind: HighlightKind) => void
}) {
  return (
    <>
      <p style={{ fontSize: 14, color: '#2D1F18', fontWeight: 600, marginBottom: 6 }}>
        本次行程有什麼特別安排？
      </p>
      <p style={{ fontSize: 13, color: '#777', marginBottom: 16, lineHeight: 1.7 }}>
        勾選想凸顯的亮點類別、AI
        會把「有料」的項目抬成特色介紹。沒有可用內容的類別會自動略過、不亂編
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {HIGHLIGHT_CATEGORIES.map(cat => {
          const on = checked.has(cat.kind)
          return (
            <label
              key={cat.kind}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: 8,
                border: `1.5px solid ${on ? COPPER : '#e8e0d4'}`,
                background: on ? '#FEF3EE' : '#fff',
                cursor: 'pointer',
              }}
            >
              <Checkbox
                checked={on}
                onCheckedChange={() => onToggle(cat.kind)}
                style={{ flexShrink: 0 }}
              />
              <span style={{ color: on ? COPPER : '#9a8c7d', display: 'flex', flexShrink: 0 }}>
                {cat.icon}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2D1F18' }}>{cat.label}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{cat.hint}</div>
              </div>
            </label>
          )
        })}
      </div>
      <p style={{ fontSize: 12, color: '#bbb', marginTop: 14, lineHeight: 1.6 }}>
        都不勾也可以・直接「下一步」只做基本文案補強（封面副標・每日概述・費用清單）
      </p>
    </>
  )
}

function SelectStep({
  suggestions,
  selected,
  skipped,
  promotedCount,
  error,
  onToggle,
}: {
  suggestions: AiSuggestion[]
  selected: Set<string>
  skipped: SkipNotice[]
  promotedCount: number
  error: string | null
  onToggle: (id: string) => void
}) {
  return (
    <>
      {/* 升級結果摘要：升了幾塊亮點 */}
      {promotedCount > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            background: '#FEF3EE',
            border: `1px solid ${COPPER}33`,
            borderRadius: 6,
            fontSize: 13,
            color: '#9a4a2c',
            lineHeight: 1.6,
          }}
        >
          已把 {promotedCount} 項有料內容抬成特色亮點・下方可一併讓 AI 潤色介紹文案
        </div>
      )}

      {/* 沒料略過告知（命脈底線：明確講、不靜默、不亂編） */}
      {skipped.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            background: '#FBF1DA',
            border: '1px solid #E8D6A8',
            borderRadius: 6,
            fontSize: 13,
            color: '#8A5A00',
            lineHeight: 1.7,
          }}
        >
          {skipped.map(s => s.label).join('・')}
          ：目前沒有可用的內容、本次略過
          <div style={{ fontSize: 12, color: '#a98a4a', marginTop: 4 }}>
            這些項目需先在行程分頁補上描述或圖片・系統不會替您編造
          </div>
        </div>
      )}

      {suggestions.length === 0 ? (
        <div
          style={{
            color: '#888',
            fontSize: 14,
            textAlign: 'center',
            padding: '32px 0',
            lineHeight: 1.7,
          }}
        >
          <Sparkles size={28} color="#ccc" style={{ display: 'block', margin: '0 auto 12px' }} />
          目前沒有 AI 可協助補充的項目
          <br />
          行程內容已相當完整
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#777', marginBottom: 16, lineHeight: 1.7 }}>
            勾選想生成的項目、點「開始生成」一次完成
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestions.map(s => {
              const on = selected.has(s.id)
              return (
                <label
                  key={s.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${on ? COPPER : '#e8e0d4'}`,
                    background: on ? '#FEF3EE' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => onToggle(s.id)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2D1F18' }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{s.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: '#FFF0F0',
            borderRadius: 6,
            fontSize: 13,
            color: '#B00',
          }}
        >
          {error}
        </div>
      )}
    </>
  )
}

function GeneratingStep() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
      <Sparkles size={32} color={COPPER} style={{ display: 'block', margin: '0 auto 16px' }} />
      <div style={{ fontSize: 14, marginBottom: 6 }}>AI 正在生成文案⋯</div>
      <div style={{ fontSize: 12, color: '#bbb' }}>約需 5-10 秒</div>
    </div>
  )
}

function ReviewStep({
  patches,
  accepted,
  onToggle,
}: {
  patches: AiPatch[]
  accepted: Set<string>
  onToggle: (id: string) => void
}) {
  if (patches.length === 0) {
    return (
      <div
        style={{
          color: '#888',
          fontSize: 14,
          textAlign: 'center',
          padding: '40px 0',
          lineHeight: 1.7,
        }}
      >
        AI 這次沒有產出可套用的內容
        <br />
        可返回調整勾選項目再試一次
      </div>
    )
  }
  return (
    <>
      <p style={{ fontSize: 13, color: '#777', marginBottom: 16, lineHeight: 1.7 }}>
        以下是 AI 生成的內容、確認後點「套用」寫入行程
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {patches.map(patch => {
          const on = accepted.has(patch.id)
          return (
            <div
              key={patch.id}
              style={{
                border: `1.5px solid ${on ? COPPER : '#e8e0d4'}`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 14px',
                  background: on ? '#FEF3EE' : '#f8f5f0',
                  cursor: 'pointer',
                }}
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={() => onToggle(patch.id)}
                  style={{ marginTop: 1 }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#2D1F18' }}>
                  {patch.label}
                </span>
                {patch.warn && (
                  <span
                    title="AI 產出疑似冒出料源沒有的專有名詞 / 數字、請仔細核對再套用"
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#8A5A00',
                      background: '#FBF1DA',
                      border: '1px solid #E8D6A8',
                      borderRadius: 4,
                      padding: '1px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⚠ 請核對
                  </span>
                )}
              </label>
              <div
                style={{
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#444',
                  lineHeight: 1.75,
                  background: '#fff',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {patch.generated}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Button style helper ───────────────────────────────────────

function btnStyle(variant: 'ghost' | 'primary' | 'success', disabled = false): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: 6,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: variant === 'ghost' ? 400 : 500,
    opacity: disabled ? 0.45 : 1,
    transition: 'opacity 0.15s',
  }
  if (variant === 'ghost')
    return { ...base, background: '#fff', border: '1px solid #ccc', color: '#555' }
  if (variant === 'primary') return { ...base, background: COPPER, border: 'none', color: '#fff' }
  return { ...base, background: '#2D6A4F', border: 'none', color: '#fff' }
}
