'use client'

/**
 * AI 行程助理對話框
 *
 * 流程：
 * 1. 掃 canvas 找到可補強的地方（local，不用 API）
 * 2. 業務勾選想生成的項目
 * 3. 一次 MiniMax call → 回傳所有勾選項目的生成內容
 * 4. 業務確認 → 套用到 canvas
 *
 * 成本設計：整個流程一次 API call，abab6.5s-chat 約 0.05-0.1 台幣
 */

import * as React from 'react'
import { Sparkles, X, ChevronRight, Check } from 'lucide-react'
import type { Canvas } from '@/components/canvas-renderer/types'
import {
  analyzeCanvasForAi,
  compressCanvasForAi,
  type AiSuggestion,
  type AiPatch,
} from './canvas-utils'

const TOOLBAR_BG = '#2D1F18'
const COPPER = '#C85A38'

type DialogStep = 'select' | 'generating' | 'review'

interface AiAssistDialogProps {
  code: string
  canvas: Canvas
  onApply: (patches: AiPatch[]) => void
  onClose: () => void
}

export function AiAssistDialog({ code, canvas, onApply, onClose }: AiAssistDialogProps) {
  const suggestions = React.useMemo(() => analyzeCanvasForAi(canvas), [canvas])

  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(suggestions.map(s => s.id))
  )
  const [step, setStep] = React.useState<DialogStep>('select')
  const [patches, setPatches] = React.useState<AiPatch[]>([])
  const [accepted, setAccepted] = React.useState<Set<string>>(new Set())
  const [error, setError] = React.useState<string | null>(null)

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

  const handleGenerate = async () => {
    const chosen = suggestions.filter(s => selected.has(s.id))
    if (!chosen.length) return

    setStep('generating')
    setError(null)

    try {
      const res = await fetch(`/api/tours/${encodeURIComponent(code)}/ai-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_summary: compressCanvasForAi(canvas),
          requests: chosen.map(s => ({
            id: s.id,
            label: s.label,
            instruction: s.instruction,
            target: s.target,
          })),
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `API 錯誤 ${res.status}`)
      }

      const data = (await res.json()) as { patches: AiPatch[] }
      const result = data.patches ?? []
      setPatches(result)
      setAccepted(new Set(result.map(p => p.id)))
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失敗，請稍後再試')
      setStep('select')
    }
  }

  const handleApply = () => {
    onApply(patches.filter(p => accepted.has(p.id)))
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
          width: 520,
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
          {step === 'select' && (
            <SelectStep
              suggestions={suggestions}
              selected={selected}
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

          {step === 'select' && suggestions.length > 0 && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={selected.size === 0}
              style={btnStyle('primary', selected.size === 0)}
            >
              開始生成
              <ChevronRight size={14} />
            </button>
          )}

          {step === 'review' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={accepted.size === 0}
              style={btnStyle('success', accepted.size === 0)}
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

function SelectStep({
  suggestions,
  selected,
  error,
  onToggle,
}: {
  suggestions: AiSuggestion[]
  selected: Set<string>
  error: string | null
  onToggle: (id: string) => void
}) {
  if (suggestions.length === 0) {
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
        <Sparkles size={28} color="#ccc" style={{ display: 'block', margin: '0 auto 12px' }} />
        行程內容已相當完整
        <br />
        目前沒有 AI 可協助補充的項目。
      </div>
    )
  }

  return (
    <>
      <p style={{ fontSize: 13, color: '#777', marginBottom: 16, lineHeight: 1.7 }}>
        AI 分析後，找到以下可以補強的地方。勾選想生成的項目，點「開始生成」。
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
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(s.id)}
                style={{ marginTop: 2, accentColor: COPPER, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2D1F18' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{s.description}</div>
              </div>
            </label>
          )
        })}
      </div>
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
  return (
    <>
      <p style={{ fontSize: 13, color: '#777', marginBottom: 16, lineHeight: 1.7 }}>
        以下是 AI 生成的內容，確認後點「套用」寫入行程。
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
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(patch.id)}
                  style={{ accentColor: COPPER, marginTop: 1 }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#2D1F18' }}>
                  {patch.label}
                </span>
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
