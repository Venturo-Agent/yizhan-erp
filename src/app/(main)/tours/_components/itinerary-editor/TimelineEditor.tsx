'use client'
/**
 * TimelineEditor - 時間軸模式編輯器
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AttractionSelector } from '@/components/editor/attraction-selector'
import type { DailyScheduleItem, SimpleActivity } from './types'

interface TimelineEditorProps {
  dailySchedule: DailyScheduleItem[]
  selectedDayIndex: number
  startDate: string | null
  tourCountryName?: string // 行程國家名稱，用於景點庫篩選
  onSelectDay: (index: number) => void
  onUpdateDay: (index: number, field: string, value: string | boolean) => void
  onAddActivity: (dayIndex: number) => void
  onRemoveActivity: (dayIndex: number, activityIndex: number) => void
  onUpdateActivity: (
    dayIndex: number,
    activityIndex: number,
    field: keyof SimpleActivity,
    value: string
  ) => void
  onAddActivitiesFromAttractions?: (
    dayIndex: number,
    attractions: { name: string; id?: string }[]
  ) => void
  getPreviousAccommodation: (index: number) => string
}

export function TimelineEditor({
  dailySchedule,
  selectedDayIndex,
  startDate,
  tourCountryName = '',
  onSelectDay,
  onUpdateDay,
  onAddActivity,
  onRemoveActivity,
  onUpdateActivity,
  onAddActivitiesFromAttractions,
  getPreviousAccommodation,
}: TimelineEditorProps) {
  const t = useTranslations('tour')
  const [isAttractionSelectorOpen, setIsAttractionSelectorOpen] = useState(false)

  const day = dailySchedule[selectedDayIndex]
  if (!day) return null

  const idx = selectedDayIndex

  // 已選景點 ID（用於標記已選過的）
  const existingAttractionIds = (day.activities || [])
    .map(a => a.attractionId)
    .filter((id): id is string => !!id)
  let dateLabel = ''
  if (startDate) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + idx)
    const weekdays = [
      t('dailyScheduleWeekdaySun'),
      t('dailyScheduleWeekdayMon'),
      t('dailyScheduleWeekdayTue'),
      t('dailyScheduleWeekdayWed'),
      t('dailyScheduleWeekdayThu'),
      t('dailyScheduleWeekdayFri'),
      t('dailyScheduleWeekdaySat'),
    ]
    dateLabel = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`
  }

  return (
    <div className="flex flex-col h-full">
      {/* 天數分頁 Tab */}
      <div className="flex gap-1 mb-4 pb-3 border-b border-morandi-container overflow-x-auto">
        {dailySchedule.map((d, i) => {
          const isSelected = selectedDayIndex === i
          const hasActivities = d.activities && d.activities.length > 0
          return (
            <Button
              key={i}
              type="button"
              variant={isSelected ? 'default' : 'ghost'}
              size="xs"
              onClick={() => onSelectDay(i)}
              className="whitespace-nowrap"
            >
              Day {d.day}
              {hasActivities && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-card' : 'bg-morandi-gold'}`}
                />
              )}
            </Button>
          )
        })}
      </div>

      {/* 選中天的內容 */}
      <div className="flex-1 overflow-y-auto">
        {/* Day 標題資訊 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-morandi-gold">Day {day.day}</span>
            {dateLabel && <span className="text-sm text-morandi-secondary">{dateLabel}</span>}
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="soft-gold"
              type="button"
              size="sm"
              onClick={() => setIsAttractionSelectorOpen(true)}
              className="h-7 px-2 text-xs gap-1"
            >
              <MapPin size={12} />
              {t('dailyScheduleFromAttractionLib')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onAddActivity(idx)}
              className="h-7 px-2 text-xs gap-1"
              variant="secondary"
            >
              <Plus size={12} />
              {t('dailyScheduleAddActivity')}
            </Button>
          </div>
        </div>

        {/* 今日標題 + 餐食 + 住宿 */}
        <div className="border border-border rounded-lg p-3 mb-3 space-y-2">
          {/* 今日標題 */}
          <input
            type="text"
            value={day.route || ''}
            onChange={e => onUpdateDay(idx, 'route', e.target.value)}
            placeholder={
              idx === 0
                ? t('itineraryArriveDestination')
                : idx === dailySchedule.length - 1
                  ? t('itineraryReturnTaiwan')
                  : t('itineraryDayTitle')
            }
            className="w-full h-8 px-3 text-xs border border-border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold"
          />

          {/* 餐食（三欄，勾選框在左側） */}
          <div className="grid grid-cols-3 gap-2">
            {/* 早餐 */}
            <div className="relative">
              <input
                type="text"
                value={
                  day.hotelBreakfast ? t('itineraryHotelBreakfast') : day.meals.breakfast || ''
                }
                onChange={e => onUpdateDay(idx, 'meals.breakfast', e.target.value)}
                placeholder={t('itineraryBreakfast')}
                disabled={day.hotelBreakfast}
                className="w-full h-8 pl-7 pr-3 text-xs border border-border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold disabled:text-morandi-secondary"
              />
              {idx > 0 && (
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
              <input
                type="text"
                value={day.lunchSelf ? t('itineraryFreeService') : day.meals.lunch || ''}
                onChange={e => onUpdateDay(idx, 'meals.lunch', e.target.value)}
                placeholder={t('itineraryLunch')}
                disabled={day.lunchSelf}
                className="w-full h-8 pl-7 pr-3 text-xs border border-border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold disabled:text-morandi-secondary"
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
              <input
                type="text"
                value={day.dinnerSelf ? '敬請自理' : day.meals.dinner || ''}
                onChange={e => onUpdateDay(idx, 'meals.dinner', e.target.value)}
                placeholder={t('itineraryDinner')}
                disabled={day.dinnerSelf}
                className="w-full h-8 pl-7 pr-3 text-xs border border-border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold disabled:text-morandi-secondary"
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

          {/* 住宿（獨立一行，勾選框在左側） */}
          {idx < dailySchedule.length - 1 && (
            <div className="relative">
              <input
                type="text"
                value={
                  day.sameAsPrevious
                    ? `續住 (${getPreviousAccommodation(idx) || ''})`
                    : day.accommodation || ''
                }
                onChange={e => onUpdateDay(idx, 'accommodation', e.target.value)}
                placeholder={t('itineraryHotelAccommodation')}
                disabled={day.sameAsPrevious}
                className="w-full h-8 pl-7 pr-3 text-xs border border-border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold disabled:text-morandi-secondary"
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

        {/* 活動表格 */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* 表頭 */}
          <div className="flex items-center bg-morandi-container/30 text-[0.588rem] text-morandi-secondary font-medium">
            <div className="w-[100px] px-2 py-1.5 text-center border-r border-morandi-container/50">
              {t('dailyScheduleTimeHeader')}
            </div>
            <div className="flex-1 px-2 py-1.5">{t('dailyScheduleActivityHeader')}</div>
          </div>

          {/* 活動列表 */}
          {day.activities && day.activities.length > 0 ? (
            day.activities.map((activity, actIdx) => (
              <div
                key={activity.id}
                className="group flex items-stretch border-t border-morandi-container/50 hover:bg-morandi-gold/5"
              >
                {/* 時間 */}
                <div className="w-[100px] flex items-center justify-center border-r border-morandi-container/50">
                  <input
                    type="text"
                    maxLength={5}
                    value={
                      activity.startTime
                        ? `${activity.startTime.slice(0, 2)}:${activity.startTime.slice(2)}`
                        : ''
                    }
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                      onUpdateActivity(idx, actIdx, 'startTime', val)
                    }}
                    placeholder="09:00"
                    className="w-[42px] px-0.5 py-2 text-xs text-center bg-transparent border-0 focus:outline-none focus:bg-card"
                  />
                  <span className="text-morandi-muted text-[0.588rem]">~</span>
                  <input
                    type="text"
                    maxLength={5}
                    value={
                      activity.endTime
                        ? `${activity.endTime.slice(0, 2)}:${activity.endTime.slice(2)}`
                        : ''
                    }
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                      onUpdateActivity(idx, actIdx, 'endTime', val)
                    }}
                    placeholder="10:30"
                    className="w-[42px] px-0.5 py-2 text-xs text-center bg-transparent border-0 focus:outline-none focus:bg-card"
                  />
                </div>

                {/* 活動名稱 */}
                <div className="flex-1 flex items-center">
                  <textarea
                    value={activity.title}
                    onChange={e => onUpdateActivity(idx, actIdx, 'title', e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                      }
                    }}
                    placeholder={t('dailyScheduleAttractionPlaceholder')}
                    rows={1}
                    className="flex-1 px-2 py-2 text-xs bg-transparent border-0 focus:outline-none focus:bg-card resize-none leading-tight"
                    style={{ minHeight: '32px' }}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveActivity(idx, actIdx)}
                    className="hidden group-hover:block p-1 mr-1 text-morandi-muted hover:text-morandi-red transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-morandi-muted">
              {t('dailyScheduleEmptyHint')}
            </div>
          )}
        </div>
      </div>

      {/* 景點庫選擇器 */}
      <AttractionSelector
        isOpen={isAttractionSelectorOpen}
        onClose={() => setIsAttractionSelectorOpen(false)}
        tourCountryName={tourCountryName}
        dayTitle={day.route || ''}
        existingIds={existingAttractionIds}
        onSelect={attractions => {
          if (onAddActivitiesFromAttractions) {
            onAddActivitiesFromAttractions(
              idx,
              attractions.map(a => ({
                name: a.name,
                id: a.id?.startsWith('manual_') ? undefined : a.id,
              }))
            )
          } else {
            // fallback: 一個一個加
            for (const _attraction of attractions) {
              onAddActivity(idx)
            }
          }
        }}
      />
    </div>
  )
}
