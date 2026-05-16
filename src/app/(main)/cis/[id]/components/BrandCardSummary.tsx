'use client'

/**
 * 品牌資料卡聚合視圖
 *
 * 把多次拜訪累積到的 BrandCard 合併成一張總卡。
 * 重複欄位：array 取 union、字串取最近一次填的（visited_at desc）。
 */

import type { BrandCard, CisVisit } from '@/types/cis.types'

const PAGE_LABELS = {
  NOT_COLLECTED: '尚未收集',
} as const

interface Props {
  visits: CisVisit[]
}

function uniqueArray(arr: (string | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((x): x is string => !!x?.trim())))
}

function mergeBrandCards(visits: CisVisit[]): BrandCard {
  const sorted = [...visits].sort(
    (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
  )

  const merged: BrandCard = {
    travel_types: uniqueArray(sorted.flatMap(v => v.brand_card?.travel_types || [])),
    brand_keywords: uniqueArray(sorted.flatMap(v => v.brand_card?.brand_keywords || [])),
    emotional_keywords: uniqueArray(
      sorted.flatMap(v => v.brand_card?.emotional_keywords || [])
    ),
    touchpoints: uniqueArray(sorted.flatMap(v => v.brand_card?.touchpoints || [])),
    priority_needs: {
      must_do: uniqueArray(sorted.flatMap(v => v.brand_card?.priority_needs?.must_do || [])),
      suggested: uniqueArray(
        sorted.flatMap(v => v.brand_card?.priority_needs?.suggested || [])
      ),
      optional: uniqueArray(
        sorted.flatMap(v => v.brand_card?.priority_needs?.optional || [])
      ),
    },
  }

  // 字串欄位：取最近一次填過的
  for (const v of sorted) {
    if (!merged.value_proposition && v.brand_card?.value_proposition?.trim()) {
      merged.value_proposition = v.brand_card.value_proposition
    }
    if (!merged.differentiation && v.brand_card?.differentiation?.trim()) {
      merged.differentiation = v.brand_card.differentiation
    }
    if (!merged.visual_hints?.color_tone && v.brand_card?.visual_hints?.color_tone?.trim()) {
      merged.visual_hints = { ...merged.visual_hints, color_tone: v.brand_card.visual_hints.color_tone }
    }
    if (!merged.visual_hints?.style && v.brand_card?.visual_hints?.style?.trim()) {
      merged.visual_hints = { ...merged.visual_hints, style: v.brand_card.visual_hints.style }
    }
  }

  return merged
}

export function BrandCardSummary({ visits }: Props) {
  const card = mergeBrandCards(visits)

  const sections: { title: string; render: () => React.ReactNode }[] = [
    {
      title: '品牌關鍵詞',
      render: () => <Chips items={card.brand_keywords} tone="gold" />,
    },
    {
      title: '情感關鍵詞',
      render: () => <Chips items={card.emotional_keywords} tone="rose" />,
    },
    {
      title: '價值主張',
      render: () => <Quote text={card.value_proposition} />,
    },
    {
      title: '競爭差異',
      render: () => <Quote text={card.differentiation} />,
    },
    {
      title: '客戶接觸點',
      render: () => <Chips items={card.touchpoints} tone="blue" />,
    },
    {
      title: '視覺暗示',
      render: () =>
        card.visual_hints?.color_tone || card.visual_hints?.style ? (
          <div className="flex gap-2 flex-wrap text-xs text-morandi-primary">
            {card.visual_hints?.color_tone && (
              <span className="px-2 py-0.5 rounded bg-morandi-muted/15">
                色調：{card.visual_hints.color_tone}
              </span>
            )}
            {card.visual_hints?.style && (
              <span className="px-2 py-0.5 rounded bg-morandi-muted/15">
                風格：{card.visual_hints.style}
              </span>
            )}
          </div>
        ) : (
          <Empty />
        ),
    },
  ]

  const needs = card.priority_needs

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(s => (
          <div key={s.title} className="space-y-1.5">
            <div className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
              {s.title}
            </div>
            <div>{s.render()}</div>
          </div>
        ))}
      </div>

      {(needs?.must_do?.length || needs?.suggested?.length || needs?.optional?.length) && (
        <div className="space-y-1.5 border-t border-morandi-muted/20 pt-4">
          <div className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
            CIS 衍生項目（彙整）
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NeedColumn title="必做" items={needs?.must_do} accent="text-status-danger" />
            <NeedColumn title="建議" items={needs?.suggested} accent="text-morandi-gold" />
            <NeedColumn title="可選" items={needs?.optional} accent="text-morandi-secondary" />
          </div>
        </div>
      )}
    </div>
  )
}

function Chips({ items, tone }: { items?: string[]; tone: 'gold' | 'rose' | 'blue' }) {
  if (!items?.length) return <Empty />
  const cls =
    tone === 'gold'
      ? 'bg-morandi-gold/15 text-morandi-gold'
      : tone === 'rose'
        ? 'bg-status-warning-bg text-status-warning'
        : 'bg-morandi-muted/15 text-morandi-secondary'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(t => (
        <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>
          {t}
        </span>
      ))}
    </div>
  )
}

function Quote({ text }: { text?: string }) {
  if (!text?.trim()) return <Empty />
  return (
    <blockquote className="text-sm text-morandi-primary border-l-2 border-morandi-gold/40 pl-3 py-0.5">
      {text}
    </blockquote>
  )
}

function NeedColumn({
  title,
  items,
  accent,
}: {
  title: string
  items?: string[]
  accent: string
}) {
  return (
    <div className="space-y-1">
      <div className={`text-xs font-medium ${accent}`}>{title}</div>
      {items?.length ? (
        <ul className="space-y-0.5">
          {items.map(i => (
            <li key={i} className="text-xs text-morandi-primary">
              · {i}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-morandi-secondary">—</div>
      )}
    </div>
  )
}

function Empty() {
  return <span className="text-xs text-morandi-secondary">{PAGE_LABELS.NOT_COLLECTED}</span>
}
