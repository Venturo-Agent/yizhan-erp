'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { DailyItinerary } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

interface RecommendationsSectionProps {
  day: DailyItinerary
  dayIndex: number
  addRecommendation: (dayIndex: number) => void
  updateRecommendation: (dayIndex: number, recIndex: number, value: string) => void
  removeRecommendation: (dayIndex: number, recIndex: number) => void
}

export function RecommendationsSection({
  day,
  dayIndex,
  addRecommendation,
  updateRecommendation,
  removeRecommendation,
}: RecommendationsSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-morandi-primary">
          {COMP_EDITOR_LABELS.LABEL_7651}
        </label>
        <Button onClick={() => addRecommendation(dayIndex)} size="xs" variant="secondary">
          + 新增推薦
        </Button>
      </div>
      {day.recommendations?.map((rec: string, recIndex: number) => (
        <div key={recIndex} className="flex gap-2">
          <input
            type="text"
            value={rec}
            onChange={e => updateRecommendation(dayIndex, recIndex, e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-sm bg-card"
            placeholder={COMP_EDITOR_LABELS.天神商圈購物}
          />
          <button
            onClick={() => removeRecommendation(dayIndex, recIndex)}
            className="px-2 text-morandi-red hover:text-morandi-red/80 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
