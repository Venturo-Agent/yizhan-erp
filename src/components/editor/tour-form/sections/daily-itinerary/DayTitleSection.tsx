'use client'

import React from 'react'
import { ArrowRight, Minus, Sparkles } from 'lucide-react'
import { DailyItinerary } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

interface DayTitleSectionProps {
  day: DailyItinerary
  dayIndex: number
  updateDailyItinerary: (index: number, field: string, value: unknown) => void
}

export function DayTitleSection({ day, dayIndex, updateDailyItinerary }: DayTitleSectionProps) {
  const insertSymbol = (symbol: string) => {
    const input = document.querySelector(`#title-input-${dayIndex}`) as HTMLInputElement
    if (input) {
      const cursorPos = input.selectionStart || day.title.length
      const newValue = day.title.slice(0, cursorPos) + symbol + day.title.slice(cursorPos)
      updateDailyItinerary(dayIndex, 'title', newValue)
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(cursorPos + symbol.length, cursorPos + symbol.length)
      }, 0)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-morandi-primary">
          {COMP_EDITOR_LABELS.行程標題}
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => insertSymbol(' → ')}
            className="p-1 bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
            title={COMP_EDITOR_LABELS.插入箭頭}
          >
            <ArrowRight size="0.875em" className="text-morandi-primary" />
          </button>
          <button
            type="button"
            onClick={() => insertSymbol(' ⇀ ')}
            className="px-2 py-0.5 text-xs bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
            title={COMP_EDITOR_LABELS.插入鉤箭頭}
          >
            ⇀
          </button>
          <button
            type="button"
            onClick={() => insertSymbol(' · ')}
            className="px-2 py-0.5 text-xs bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
            title={COMP_EDITOR_LABELS.插入間隔點}
          >
            ·
          </button>
          <button
            type="button"
            onClick={() => insertSymbol(' | ')}
            className="p-1 bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
            title={COMP_EDITOR_LABELS.插入直線}
          >
            <Minus size="0.875em" className="text-morandi-primary" />
          </button>
          <button
            type="button"
            onClick={() => insertSymbol(' ⭐ ')}
            className="p-1 bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
            title={COMP_EDITOR_LABELS.插入星號}
          >
            <Sparkles size="0.875em" className="text-morandi-gold" />
          </button>
          <button
            type="button"
            onClick={() => insertSymbol(' ✈ ')}
            className="px-2 py-0.5 text-xs bg-morandi-container hover:bg-morandi-gold/20 rounded transition-colors"
            title={COMP_EDITOR_LABELS.插入飛機}
          >
            ✈
          </button>
        </div>
      </div>
      <input
        id={`title-input-${dayIndex}`}
        type="text"
        value={day.title}
        onChange={e => updateDailyItinerary(dayIndex, 'title', e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        placeholder={COMP_EDITOR_LABELS.台北_福岡空港_由布院_金麟湖_阿蘇溫泉}
      />
    </div>
  )
}
