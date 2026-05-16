'use client'

/**
 * 拜訪 timeline — 列出客戶所有拜訪紀錄、按日期 desc。
 */

import { Edit, Trash2, Calendar, FileAudio } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CisVisit, CisVisitStage } from '@/types/cis.types'
import { CIS_VISIT_STAGE_OPTIONS } from '@/types/cis.types'

interface Props {
  visits: CisVisit[]
  onEdit: (v: CisVisit) => void
  onDelete: (v: CisVisit) => void
}

const STAGE_LABEL: Record<CisVisitStage, string> = Object.fromEntries(
  CIS_VISIT_STAGE_OPTIONS.map(o => [o.value, o.label])
) as Record<CisVisitStage, string>

const STAGE_COLOR: Record<CisVisitStage, string> = {
  discovery: 'bg-morandi-muted/20 text-morandi-secondary',
  audit: 'bg-status-warning-bg text-status-warning',
  positioning: 'bg-morandi-gold/15 text-morandi-gold',
  design: 'bg-status-info-bg text-status-info',
  rollout: 'bg-status-success-bg text-status-success',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function brandCardSummary(v: CisVisit): string[] {
  const out: string[] = []
  const c = v.brand_card || {}
  if (c.brand_keywords?.length) out.push(`品牌：${c.brand_keywords.slice(0, 3).join('、')}`)
  if (c.emotional_keywords?.length)
    out.push(`情感：${c.emotional_keywords.slice(0, 3).join('、')}`)
  if (c.value_proposition?.trim()) out.push(`主張：${c.value_proposition}`)
  if (c.priority_needs?.must_do?.length)
    out.push(`必做：${c.priority_needs.must_do.slice(0, 3).join('、')}`)
  return out
}

export function VisitTimeline({ visits, onEdit, onDelete }: Props) {
  const t = useTranslations('cis')
  if (!visits.length) {
    return (
      <div className="text-center text-sm text-morandi-secondary py-8 border border-dashed border-morandi-muted/30 rounded-md">
        {t('visitEmptyState')}
      </div>
    )
  }

  return (
    <ol className="relative space-y-4 ml-3 border-l border-morandi-muted/30 pl-5">
      {visits.map(v => {
        const summary = brandCardSummary(v)
        return (
          <li key={v.id} className="relative">
            <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-morandi-gold/60 ring-4 ring-background" />

            <div className="rounded-md border border-morandi-muted/20 bg-card p-3 hover:border-morandi-gold/30 transition-colors">
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Calendar size={14} className="text-morandi-secondary" />
                  <span className="text-sm font-medium text-morandi-primary">
                    {formatDate(v.visited_at)}
                  </span>
                  <span
                    className={`text-[0.588rem] px-1.5 py-0.5 rounded ${STAGE_COLOR[v.stage]}`}
                  >
                    {STAGE_LABEL[v.stage]}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(v)}
                    className="p-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                    title={t('visitEdit')}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(v)}
                    className="p-1 text-morandi-secondary hover:text-status-danger hover:bg-status-danger-bg rounded transition-colors"
                    title={t('visitDelete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </header>

              {v.summary?.trim() && (
                <p className="mt-2 text-sm text-morandi-primary whitespace-pre-wrap">
                  {v.summary}
                </p>
              )}

              {v.audio_url && (
                <div className="mt-2 flex items-center gap-2 text-xs text-morandi-secondary">
                  <FileAudio size={12} className="shrink-0" />
                  <audio
                    src={v.audio_url}
                    controls
                    preload="none"
                    className="flex-1 max-w-md h-8"
                  />
                </div>
              )}

              {summary.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-morandi-secondary">
                  {summary.map(s => (
                    <li key={s}>· {s}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
