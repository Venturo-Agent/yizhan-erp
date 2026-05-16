'use client'
/**
 * DailyScheduleEditor - 簡易模式每日行程編輯器
 */

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import type { DailyScheduleItem } from './types'

interface DailyScheduleEditorProps {
  dailySchedule: DailyScheduleItem[]
  startDate: string | null
  onUpdateDay: (index: number, field: string, value: string | boolean) => void
  getPreviousAccommodation: (index: number) => string
}

export function DailyScheduleEditor({
  dailySchedule,
  startDate,
  onUpdateDay,
  getPreviousAccommodation,
}: DailyScheduleEditorProps) {
  const t = useTranslations('tour')
  return (
    <div className="space-y-3">
      {dailySchedule.map((day, idx) => {
        const isFirst = idx === 0
        const isLast = idx === dailySchedule.length - 1
        let dateLabel = ''
        if (startDate) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + idx)
          dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
        }
        return (
          <div key={idx} className="p-3 rounded-lg border border-morandi-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-morandi-gold/15 text-morandi-gold text-xs font-bold px-2 py-0.5 rounded">
                Day {day.day}
              </span>
              {dateLabel && <span className="text-xs text-morandi-secondary">({dateLabel})</span>}
            </div>
            <Input
              value={day.route || ''}
              onChange={e => onUpdateDay(idx, 'route', e.target.value)}
              placeholder={
                isFirst
                  ? t('itineraryArriveDestination')
                  : isLast
                    ? t('itineraryReturnTaiwan')
                    : t('itineraryDayTitle')
              }
              className="h-8 text-sm mb-2"
            />
            {/* 表格式餐食（三欄） */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* 早餐 */}
              <div className="relative">
                <Input
                  value={
                    day.hotelBreakfast
                      ? t('itineraryHotelBreakfast')
                      : day.meals.breakfast || ''
                  }
                  onChange={e => onUpdateDay(idx, 'meals.breakfast', e.target.value)}
                  placeholder={t('itineraryBreakfast')}
                  className="h-8 text-xs pl-7"
                  disabled={day.hotelBreakfast}
                />
                {!isFirst && (
                  <input
                    type="checkbox"
                    checked={day.hotelBreakfast}
                    onChange={e => onUpdateDay(idx, 'hotelBreakfast', e.target.checked)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded border-border text-morandi-gold focus:ring-morandi-gold cursor-pointer"
                    title={t('itineraryHotelBreakfast')}
                  />
                )}
              </div>
              {/* 午餐 */}
              <div className="relative">
                <Input
                  value={
                    day.lunchSelf ? t('itineraryFreeService') : day.meals.lunch || ''
                  }
                  onChange={e => onUpdateDay(idx, 'meals.lunch', e.target.value)}
                  placeholder={t('itineraryLunch')}
                  className="h-8 text-xs pl-7"
                  disabled={day.lunchSelf}
                />
                <input
                  type="checkbox"
                  checked={day.lunchSelf || false}
                  onChange={e => onUpdateDay(idx, 'lunchSelf', e.target.checked)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded border-border text-morandi-gold focus:ring-morandi-gold cursor-pointer"
                  title={t('itineraryFreeService')}
                />
              </div>
              {/* 晚餐 */}
              <div className="relative">
                <Input
                  value={day.dinnerSelf ? '敬請自理' : day.meals.dinner || ''}
                  onChange={e => onUpdateDay(idx, 'meals.dinner', e.target.value)}
                  placeholder={t('itineraryDinner')}
                  className="h-8 text-xs pl-7"
                  disabled={day.dinnerSelf}
                />
                <input
                  type="checkbox"
                  checked={day.dinnerSelf || false}
                  onChange={e => onUpdateDay(idx, 'dinnerSelf', e.target.checked)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded border-border text-morandi-gold focus:ring-morandi-gold cursor-pointer"
                  title={t('itineraryFreeService')}
                />
              </div>
            </div>
            {/* 住宿（獨立一行） */}
            {!isLast && (
              <div className="relative mt-1.5">
                <Input
                  value={
                    day.sameAsPrevious
                      ? `續住 (${getPreviousAccommodation(idx) || ''})`
                      : day.accommodation || ''
                  }
                  onChange={e => onUpdateDay(idx, 'accommodation', e.target.value)}
                  placeholder={t('itineraryHotelAccommodation')}
                  className="h-8 text-xs pl-7"
                  disabled={day.sameAsPrevious}
                />
                {idx > 0 && (
                  <input
                    type="checkbox"
                    checked={day.sameAsPrevious}
                    onChange={e => onUpdateDay(idx, 'sameAsPrevious', e.target.checked)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded border-border text-morandi-gold focus:ring-morandi-gold cursor-pointer"
                    title={t('itineraryContinueStay')}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
