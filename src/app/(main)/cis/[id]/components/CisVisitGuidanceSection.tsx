'use client'

/**
 * 拜訪引導對話區塊
 *
 * 根據當前拜訪階段顯示建議問題清單
 */

import { Lightbulb } from 'lucide-react'
import { CIS_GUIDANCE_QUESTIONS } from '../../constants/labels'
import type { CisVisitStage } from '@/types/cis.types'
import { CIS_VISIT_STAGE_OPTIONS } from '@/types/cis.types'

interface CisVisitGuidanceSectionProps {
  stage: CisVisitStage
}

export function CisVisitGuidanceSection({ stage }: CisVisitGuidanceSectionProps) {
  const stageIdx = CIS_VISIT_STAGE_OPTIONS.findIndex(o => o.value === stage)
  const guidance = CIS_GUIDANCE_QUESTIONS[stageIdx]

  if (!guidance) return null

  return (
    <section className="rounded-md bg-morandi-gold/8 border border-morandi-gold/20 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-morandi-gold mb-2">
        <Lightbulb size={14} />
        {guidance.stage} — 建議問題
      </div>
      <ul className="space-y-1 text-xs text-morandi-primary">
        {guidance.questions.map((q, i) => (
          <li key={i} className="leading-relaxed">
            · {q}
          </li>
        ))}
      </ul>
    </section>
  )
}
