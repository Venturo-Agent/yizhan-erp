'use client'

/**
 * 拜訪紀錄 Dialog — 五階段引導對話 + 錄音上傳 + AI 分析。
 *
 * 設計取自 vault A 第六章「品牌資料卡」schema：
 *   travel_types, brand_keywords, emotional_keywords, value_proposition,
 *   touchpoints, differentiation, priority_needs, visual_hints
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'

import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type {
  BrandCard,
  CisVisit,
  CisVisitStage,
  CreateCisVisitData,
} from '@/types/cis.types'
import { CIS_VISIT_STAGE_OPTIONS } from '@/types/cis.types'

import { Field } from './CisVisitFormField'
import { CisVisitAudioSection } from './CisVisitAudioSection'
import { CisVisitGuidanceSection } from './CisVisitGuidanceSection'
import { CisVisitBrandCardSection } from './CisVisitBrandCardSection'

// ─── Helpers ─────────────────────────────────────────────

function nowLocalIsoMinutes(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function arrToText(arr?: string[] | null) {
  return arr?.length ? arr.join('、') : ''
}

function textToArr(text: string): string[] {
  return text
    .split(/[,，、\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

// ─── FormState ───────────────────────────────────────────

interface FormState {
  visited_at: string
  stage: CisVisitStage
  summary: string
  audio_url: string
  brand_keywords_text: string
  emotional_keywords_text: string
  value_proposition: string
  differentiation: string
  touchpoints_text: string
  must_do_text: string
  suggested_text: string
  optional_text: string
  color_tone: string
  visual_style: string
}

function buildEmpty(clientHasVisits: boolean): FormState {
  return {
    visited_at: nowLocalIsoMinutes(),
    stage: clientHasVisits ? 'positioning' : 'discovery',
    summary: '',
    audio_url: '',
    brand_keywords_text: '',
    emotional_keywords_text: '',
    value_proposition: '',
    differentiation: '',
    touchpoints_text: '',
    must_do_text: '',
    suggested_text: '',
    optional_text: '',
    color_tone: '',
    visual_style: '',
  }
}

function fromVisit(v: CisVisit | null): FormState {
  if (!v) return buildEmpty(false)
  const c: BrandCard = v.brand_card || {}
  const dt = v.visited_at ? v.visited_at.slice(0, 16) : nowLocalIsoMinutes()
  return {
    visited_at: dt,
    stage: v.stage,
    summary: v.summary || '',
    audio_url: v.audio_url || '',
    brand_keywords_text: arrToText(c.brand_keywords),
    emotional_keywords_text: arrToText(c.emotional_keywords),
    value_proposition: c.value_proposition || '',
    differentiation: c.differentiation || '',
    touchpoints_text: arrToText(c.touchpoints),
    must_do_text: arrToText(c.priority_needs?.must_do),
    suggested_text: arrToText(c.priority_needs?.suggested),
    optional_text: arrToText(c.priority_needs?.optional),
    color_tone: c.visual_hints?.color_tone || '',
    visual_style: c.visual_hints?.style || '',
  }
}

// ─── Props ───────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  clientId: string
  initialVisit: CisVisit | null
  onSubmit: (data: CreateCisVisitData) => Promise<void>
}

// ─── Component ───────────────────────────────────────────

export function CisVisitDialog({
  open,
  onOpenChange,
  mode,
  clientId,
  initialVisit,
  onSubmit,
}: Props) {
  const t = useTranslations('cis')
  const [form, setForm] = useState<FormState>(buildEmpty(false))
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (open) setForm(fromVisit(initialVisit))
  }, [open, initialVisit])

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const isBusy = submitting || uploading || analyzing

  const handleAnalyze = async () => {
    if (!form.summary.trim()) {
      toast.error(t('aiToastNoSummary'))
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/cis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: form.summary }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(`${t('aiToastFailed')}：${body.error || res.statusText}`)
        return
      }
      const { brand_card, mode: aiMode } = (await res.json()) as {
        brand_card: BrandCard
        mode: string
      }
      setForm(prev => ({
        ...prev,
        brand_keywords_text:
          prev.brand_keywords_text || arrToText(brand_card.brand_keywords),
        emotional_keywords_text:
          prev.emotional_keywords_text || arrToText(brand_card.emotional_keywords),
        value_proposition: prev.value_proposition || brand_card.value_proposition || '',
        touchpoints_text: prev.touchpoints_text || arrToText(brand_card.touchpoints),
        must_do_text: prev.must_do_text || arrToText(brand_card.priority_needs?.must_do),
        suggested_text: prev.suggested_text || arrToText(brand_card.priority_needs?.suggested),
        optional_text: prev.optional_text || arrToText(brand_card.priority_needs?.optional),
      }))
      toast.success(t('aiToastFilled'))
      if (aiMode !== 'llm') {
        toast(t('aiToastHeuristicMode'), { duration: 5000 })
      }
    } catch {
      toast.error(t('aiToastFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const brand_card: BrandCard = {
        brand_keywords: textToArr(form.brand_keywords_text),
        emotional_keywords: textToArr(form.emotional_keywords_text),
        value_proposition: form.value_proposition.trim() || undefined,
        differentiation: form.differentiation.trim() || undefined,
        touchpoints: textToArr(form.touchpoints_text),
        priority_needs: {
          must_do: textToArr(form.must_do_text),
          suggested: textToArr(form.suggested_text),
          optional: textToArr(form.optional_text),
        },
        visual_hints: {
          color_tone: form.color_tone.trim() || undefined,
          style: form.visual_style.trim() || undefined,
        },
      }

      const payload: CreateCisVisitData = {
        client_id: clientId,
        visited_at: new Date(form.visited_at).toISOString(),
        stage: form.stage,
        summary: form.summary.trim() || null,
        brand_card,
        audio_url: form.audio_url.trim() || null,
      }

      await onSubmit(payload)
      toast.success(mode === 'create' ? t('visitToastCreateSuccess') : t('visitToastUpdateSuccess'))
      onOpenChange(false)
    } catch {
      toast.error(t('visitToastSaveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={() => onOpenChange(false)} disabled={isBusy}>
        {t('btnCancel')}
      </Button>
      <Button onClick={handleSubmit} disabled={isBusy}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {submitting ? t('btnSaving') : t('btnSave')}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={v => (!isBusy ? onOpenChange(v) : undefined)}
      title={mode === 'create' ? t('visitAddTitle') : t('visitEditTitle')}
      onSubmit={handleSubmit}
      loading={isBusy}
      footer={customFooter}
      maxWidth="3xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
      <div className="grid gap-5 py-2">
        {/* 拜訪資訊 */}
        <section className="grid gap-3">
          <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
            {t('visitSectionMeta')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('visitLabelVisitedAt')}>
              <Input
                type="datetime-local"
                value={form.visited_at}
                onChange={e => update('visited_at', e.target.value)}
                disabled={isBusy}
              />
            </Field>
            <Field label={t('visitLabelStage')}>
              <select
                value={form.stage}
                onChange={e => update('stage', e.target.value as CisVisitStage)}
                disabled={isBusy}
                className="h-9 px-2 rounded-md border border-morandi-muted/40 bg-background text-sm text-morandi-primary focus:outline-none focus:ring-1 focus:ring-morandi-gold/40"
              >
                {CIS_VISIT_STAGE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* 錄音上傳 */}
        <CisVisitAudioSection
          clientId={clientId}
          visitId={initialVisit?.id ?? null}
          audioUrl={form.audio_url}
          disabled={submitting || analyzing}
          onAudioChange={url => update('audio_url', url)}
          onUploadingChange={setUploading}
        />

        {/* 引導對話 */}
        <CisVisitGuidanceSection stage={form.stage} />

        {/* 拜訪總結 + AI 分析 */}
        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
              {t('visitSectionSummary')}
            </h3>
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={handleAnalyze}
              disabled={isBusy || !form.summary.trim()}
            >
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles size={14} className="mr-1" />
              )}
              {analyzing ? t('aiBtnAnalyzing') : t('aiBtnAnalyze')}
            </Button>
          </div>
          <Textarea
            value={form.summary}
            onChange={e => update('summary', e.target.value)}
            placeholder={t('visitPlaceholderSummary')}
            disabled={isBusy}
            rows={4}
          />
        </section>

        {/* 品牌資料卡 */}
        <CisVisitBrandCardSection
          fields={{
            brand_keywords_text: form.brand_keywords_text,
            emotional_keywords_text: form.emotional_keywords_text,
            value_proposition: form.value_proposition,
            differentiation: form.differentiation,
            touchpoints_text: form.touchpoints_text,
            color_tone: form.color_tone,
            visual_style: form.visual_style,
            must_do_text: form.must_do_text,
            suggested_text: form.suggested_text,
            optional_text: form.optional_text,
          }}
          disabled={isBusy}
          onChange={update}
        />
      </div>
    </FormDialog>
  )
}
