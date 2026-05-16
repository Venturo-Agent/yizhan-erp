'use client'

import React from 'react'
import { Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DailyItinerary } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

interface MealsSectionProps {
  day: DailyItinerary
  dayIndex: number
  updateDailyItinerary: (index: number, field: string, value: unknown) => void
  onOpenRestaurantSelector: (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => void
}

export function MealsSection({
  day,
  dayIndex,
  updateDailyItinerary,
  onOpenRestaurantSelector,
}: MealsSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-morandi-primary flex items-center gap-2">
          <Utensils size="0.875em" />
          {COMP_EDITOR_LABELS.LABEL_9126}
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* 早餐 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-morandi-primary">
              {COMP_EDITOR_LABELS.LABEL_1347}
            </label>
            <Button
              type="button"
              onClick={() => onOpenRestaurantSelector(dayIndex, 'breakfast')}
              size="xs"
              variant="ghost"
              className="h-5 px-1.5 text-[0.625rem] text-morandi-gold hover:text-morandi-gold-hover"
            >
              {COMP_EDITOR_LABELS.LABEL_9094}
            </Button>
          </div>
          <input
            type="text"
            value={day.meals?.breakfast || ''}
            onChange={e =>
              updateDailyItinerary(dayIndex, 'meals', {
                ...day.meals,
                breakfast: e.target.value,
              })
            }
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder={COMP_EDITOR_LABELS.飯店內早餐}
          />
        </div>

        {/* 午餐 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-morandi-primary">
              {COMP_EDITOR_LABELS.午餐}
            </label>
            <Button
              type="button"
              onClick={() => onOpenRestaurantSelector(dayIndex, 'lunch')}
              size="xs"
              variant="ghost"
              className="h-5 px-1.5 text-[0.625rem] text-morandi-gold hover:text-morandi-gold-hover"
            >
              {COMP_EDITOR_LABELS.LABEL_9094}
            </Button>
          </div>
          <input
            type="text"
            value={day.meals?.lunch || ''}
            onChange={e =>
              updateDailyItinerary(dayIndex, 'meals', { ...day.meals, lunch: e.target.value })
            }
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder={COMP_EDITOR_LABELS.博多拉麵_1000}
          />
        </div>

        {/* 晚餐 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-morandi-primary">
              {COMP_EDITOR_LABELS.晚餐}
            </label>
            <Button
              type="button"
              onClick={() => onOpenRestaurantSelector(dayIndex, 'dinner')}
              size="xs"
              variant="ghost"
              className="h-5 px-1.5 text-[0.625rem] text-morandi-gold hover:text-morandi-gold-hover"
            >
              {COMP_EDITOR_LABELS.LABEL_9094}
            </Button>
          </div>
          <input
            type="text"
            value={day.meals?.dinner || ''}
            onChange={e =>
              updateDailyItinerary(dayIndex, 'meals', { ...day.meals, dinner: e.target.value })
            }
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder={COMP_EDITOR_LABELS.長腳蟹自助餐}
          />
        </div>
      </div>
    </div>
  )
}
