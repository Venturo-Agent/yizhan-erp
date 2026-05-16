'use client'

import React, { useState } from 'react'
import { ChevronsUpDown, ChevronsDownUp } from 'lucide-react'
import { DailyItinerary, TourFormData, Activity } from '../../types'
import { DayCard } from './DayCard'
import { DAILY_ITINERARY_LABELS } from './constants/labels'

interface DayListProps {
  data: TourFormData
  dayLabels: string[]
  isAccommodationLockedByQuote?: boolean // 有關聯報價單時鎖定住宿編輯
  updateDailyItinerary: (
    index: number,
    field: string | Record<string, unknown>,
    value?: unknown
  ) => void
  removeDailyItinerary: (index: number) => void
  swapDailyItinerary?: (fromIndex: number, toIndex: number) => void
  addActivity: (dayIndex: number) => void
  updateActivity: (dayIndex: number, actIndex: number, field: string, value: string) => void
  removeActivity: (dayIndex: number, actIndex: number) => void
  reorderActivities?: (dayIndex: number, activities: Activity[]) => void
  addRecommendation: (dayIndex: number) => void
  updateRecommendation: (dayIndex: number, recIndex: number, value: string) => void
  removeRecommendation: (dayIndex: number, recIndex: number) => void
  updateField: (field: string, value: unknown) => void
  onOpenAttractionSelector: (dayIndex: number) => void
  onOpenHotelSelector: (dayIndex: number) => void
  onOpenRestaurantSelector: (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => void
  handleActivityImageUpload: (dayIndex: number, actIndex: number, file: File) => Promise<void>
  handleExternalImageUpload?: (
    dayIndex: number,
    actIndex: number,
    imageUrl: string
  ) => Promise<void>
  onOpenPositionEditor: (dayIndex: number, actIndex: number) => void
}

export function DayList({
  data,
  dayLabels,
  isAccommodationLockedByQuote = false,
  updateDailyItinerary,
  removeDailyItinerary,
  swapDailyItinerary,
  addActivity,
  updateActivity,
  removeActivity,
  reorderActivities,
  addRecommendation,
  updateRecommendation,
  removeRecommendation,
  updateField,
  onOpenAttractionSelector,
  onOpenHotelSelector,
  onOpenRestaurantSelector,
  handleActivityImageUpload,
  handleExternalImageUpload,
  onOpenPositionEditor,
}: DayListProps) {
  // 管理每天的摺疊狀態（預設全部收合）
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(
    () => new Set(Array.from({ length: data.dailyItinerary?.length || 0 }, (_, i) => i))
  )

  // 計算是否全部摺疊或全部展開
  const totalDays = data.dailyItinerary?.length || 0
  const allCollapsed = collapsedDays.size === totalDays && totalDays > 0
  const allExpanded = collapsedDays.size === 0

  // 切換單天的摺疊狀態
  const toggleDayCollapse = (dayIndex: number) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex)
      } else {
        newSet.add(dayIndex)
      }
      return newSet
    })
  }

  // 全部摺疊
  const collapseAll = () => {
    const allIndices = new Set(Array.from({ length: totalDays }, (_, i) => i))
    setCollapsedDays(allIndices)
  }

  // 全部展開
  const expandAll = () => {
    setCollapsedDays(new Set())
  }

  return (
    <div className="space-y-4">
      {/* 全部摺疊/展開按鈕 */}
      {totalDays > 1 && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={collapseAll}
            disabled={allCollapsed}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              allCollapsed
                ? 'text-morandi-muted cursor-not-allowed'
                : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
            }`}
          >
            <ChevronsDownUp size="0.875em" />
            {DAILY_ITINERARY_LABELS.LABEL_7366}
          </button>
          <button
            type="button"
            onClick={expandAll}
            disabled={allExpanded}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              allExpanded
                ? 'text-morandi-muted cursor-not-allowed'
                : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
            }`}
          >
            <ChevronsUpDown size="0.875em" />
            {DAILY_ITINERARY_LABELS.LABEL_2347}
          </button>
        </div>
      )}

      {/* 每日行程卡片 */}
      {data.dailyItinerary?.map((day: DailyItinerary, dayIndex: number) => (
        <DayCard
          key={dayIndex}
          day={day}
          dayIndex={dayIndex}
          dayLabel={dayLabels[dayIndex]}
          data={data}
          isCollapsed={collapsedDays.has(dayIndex)}
          onToggleCollapse={() => toggleDayCollapse(dayIndex)}
          isAccommodationLockedByQuote={isAccommodationLockedByQuote}
          updateDailyItinerary={updateDailyItinerary}
          removeDailyItinerary={removeDailyItinerary}
          swapDailyItinerary={swapDailyItinerary}
          addActivity={addActivity}
          updateActivity={updateActivity}
          removeActivity={removeActivity}
          reorderActivities={reorderActivities}
          addRecommendation={addRecommendation}
          updateRecommendation={updateRecommendation}
          removeRecommendation={removeRecommendation}
          updateField={updateField}
          onOpenAttractionSelector={onOpenAttractionSelector}
          onOpenHotelSelector={onOpenHotelSelector}
          onOpenRestaurantSelector={onOpenRestaurantSelector}
          handleActivityImageUpload={handleActivityImageUpload}
          handleExternalImageUpload={handleExternalImageUpload}
          onOpenPositionEditor={onOpenPositionEditor}
        />
      ))}
    </div>
  )
}
