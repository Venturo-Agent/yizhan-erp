'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyImagesUploader } from '../DailyImagesUploader'
import { DayTitleSection } from './DayTitleSection'
import { ActivitiesSection } from './ActivitiesSection'
import { MealsSection } from './MealsSection'
import { AccommodationSection } from './AccommodationSection'
import { RecommendationsSection } from './RecommendationsSection'
import { DayCardProps } from './types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

export function DayCard({
  day,
  dayIndex,
  dayLabel,
  data,
  isCollapsed = false,
  onToggleCollapse,
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
}: DayCardProps) {
  // 圖片上傳狀態
  const [uploadingActivityImage, setUploadingActivityImage] = useState<{
    dayIndex: number
    actIndex: number
  } | null>(null)
  const [activityDragOver, setActivityDragOver] = useState<{
    dayIndex: number
    actIndex: number
  } | null>(null)

  // 包裝上傳函數，加入 loading 狀態管理
  const handleImageUploadWithLoading = async (dIdx: number, aIdx: number, file: File) => {
    setUploadingActivityImage({ dayIndex: dIdx, actIndex: aIdx })
    try {
      await handleActivityImageUpload(dIdx, aIdx, file)
    } finally {
      setUploadingActivityImage(null)
    }
  }

  return (
    <div
      id={`day-${dayIndex}`}
      className={cn(
        'border border-morandi-container rounded-xl bg-gradient-to-br from-morandi-container/20 via-card to-morandi-container/10 shadow-sm transition-all',
        isCollapsed ? 'p-4' : 'p-6 space-y-5'
      )}
    >
      {/* Day 標籤與控制按鈕 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* 摺疊/展開按鈕 */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 rounded transition-colors text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50"
              title={isCollapsed ? COMP_EDITOR_LABELS.展開 : COMP_EDITOR_LABELS.摺疊}
            >
              <ChevronRight
                size="1.125em"
                className={cn('transition-transform duration-200', !isCollapsed && 'rotate-90')}
              />
            </button>
          )}
          {/* 上下箭頭排序按鈕 */}
          {swapDailyItinerary && data.dailyItinerary.length > 1 && (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => swapDailyItinerary(dayIndex, dayIndex - 1)}
                disabled={dayIndex === 0}
                className={`p-0.5 rounded transition-colors ${
                  dayIndex === 0
                    ? 'text-morandi-container cursor-not-allowed'
                    : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
                }`}
                title={COMP_EDITOR_LABELS.上移}
              >
                <ChevronUp size="1em" />
              </button>
              <button
                type="button"
                onClick={() => swapDailyItinerary(dayIndex, dayIndex + 1)}
                disabled={dayIndex === data.dailyItinerary.length - 1}
                className={`p-0.5 rounded transition-colors ${
                  dayIndex === data.dailyItinerary.length - 1
                    ? 'text-morandi-container cursor-not-allowed'
                    : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
                }`}
                title={COMP_EDITOR_LABELS.下移}
              >
                <ChevronDown size="1em" />
              </button>
            </div>
          )}
          <span
            className={`px-3 py-1 text-white text-sm font-bold rounded-full ${
              day.isAlternative ? 'bg-morandi-secondary' : 'bg-morandi-gold'
            }`}
          >
            {dayLabel}
          </span>
          {day.isAlternative && (
            <span className="px-2 py-0.5 bg-morandi-container text-morandi-secondary text-xs rounded-full">
              {COMP_EDITOR_LABELS.LABEL_1234}
            </span>
          )}
          <span className="text-sm text-morandi-primary truncate max-w-[18.75rem]">
            {day.title || COMP_EDITOR_LABELS.尚未設定行程標題}
          </span>
          {/* 摺疊時顯示的統計 */}
          {isCollapsed && (
            <span className="text-xs text-morandi-secondary">
              ({day.activities?.length || 0} 個景點)
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* 建議方案 checkbox - 不顯示在第一天 */}
          {dayIndex > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={day.isAlternative || false}
                onChange={e => updateDailyItinerary(dayIndex, 'isAlternative', e.target.checked)}
                className="h-4 w-4 text-morandi-gold focus:ring-morandi-gold border-morandi-container rounded"
              />
              <span className="text-sm text-morandi-primary">{COMP_EDITOR_LABELS.LABEL_1234}</span>
            </label>
          )}
          {dayIndex === data.dailyItinerary.length - 1 && (
            <button
              onClick={() => removeDailyItinerary(dayIndex)}
              className="text-morandi-red hover:text-morandi-red/80 text-sm font-medium transition-colors"
            >
              {COMP_EDITOR_LABELS.DELETE_3496}
            </button>
          )}
        </div>
      </div>

      {/* 可摺疊的內容區域 */}
      {!isCollapsed && (
        <>
          {/* 行程標題 */}
          <DayTitleSection
            day={day}
            dayIndex={dayIndex}
            updateDailyItinerary={updateDailyItinerary}
          />

          {/* 特別安排 (highlight) */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.LABEL_1304}
              <span className="text-xs text-morandi-secondary ml-2">
                {COMP_EDITOR_LABELS.SHIFT_ENTER_HINT}
              </span>
            </label>
            <textarea
              value={day.highlight || ''}
              onChange={e => {
                updateDailyItinerary(dayIndex, 'highlight', e.target.value)
                // 自動調整高度
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              onKeyDown={e => {
                // 只有 Shift+Enter 才換行，單獨 Enter 不換行（保持原有行為）
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                }
              }}
              ref={el => {
                // 初始化時調整高度
                if (el && day.highlight) {
                  el.style.height = 'auto'
                  el.style.height = `${el.scrollHeight}px`
                }
              }}
              className="w-full px-3 py-2 border rounded-lg resize-none overflow-hidden min-h-[2.625rem]"
              rows={1}
              placeholder={COMP_EDITOR_LABELS.特別安排_由布院_金麟湖_日本_OL_人氣_NO_1_散策地}
            />
          </div>

          {/* Luxury 模板專用：地點標籤 */}
          {data.coverStyle === 'luxury' && (
            <div>
              <label className="block text-sm font-medium text-morandi-primary mb-1">
                <span className="inline-flex items-center gap-2">
                  {COMP_EDITOR_LABELS.LABEL_7097}
                  <span className="px-1.5 py-0.5 text-[0.625rem] bg-morandi-secondary/20 text-morandi-secondary rounded">
                    Luxury 專用
                  </span>
                </span>
              </label>
              <input
                type="text"
                value={day.locationLabel || ''}
                onChange={e => updateDailyItinerary(dayIndex, 'locationLabel', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={COMP_EDITOR_LABELS.如_京都_大阪_由布院_顯示在_Luxury_模板的每日卡片上}
              />
            </div>
          )}

          {/* 活動 */}
          <ActivitiesSection
            day={day}
            dayIndex={dayIndex}
            addActivity={addActivity}
            updateActivity={updateActivity}
            removeActivity={removeActivity}
            reorderActivities={reorderActivities}
            updateDailyItinerary={updateDailyItinerary}
            onOpenAttractionSelector={onOpenAttractionSelector}
            handleActivityImageUpload={handleImageUploadWithLoading}
            handleExternalImageUpload={handleExternalImageUpload}
            uploadingActivityImage={uploadingActivityImage}
            activityDragOver={activityDragOver}
            setActivityDragOver={setActivityDragOver}
            onOpenPositionEditor={onOpenPositionEditor}
          />

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_EDITOR_LABELS.LABEL_3951}
            </label>
            <textarea
              value={day.description || ''}
              onChange={e => updateDailyItinerary(dayIndex, 'description', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder={COMP_EDITOR_LABELS.集合於台灣桃園國際機場}
            />
          </div>

          {/* 推薦行程 */}
          <RecommendationsSection
            day={day}
            dayIndex={dayIndex}
            addRecommendation={addRecommendation}
            updateRecommendation={updateRecommendation}
            removeRecommendation={removeRecommendation}
          />

          {/* 餐食 */}
          <MealsSection
            day={day}
            dayIndex={dayIndex}
            updateDailyItinerary={updateDailyItinerary}
            onOpenRestaurantSelector={onOpenRestaurantSelector}
          />

          {/* 住宿 */}
          <AccommodationSection
            day={day}
            dayIndex={dayIndex}
            data={data}
            updateDailyItinerary={updateDailyItinerary}
            onOpenHotelSelector={onOpenHotelSelector}
            isLockedByQuote={isAccommodationLockedByQuote}
          />

          {/* 每日圖片 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.showDailyImages === true}
                  onChange={e => {
                    updateDailyItinerary(dayIndex, 'showDailyImages', e.target.checked)
                  }}
                  className="h-4 w-4 text-morandi-gold focus:ring-morandi-gold border-morandi-container rounded"
                />
                <span className="text-sm font-medium text-morandi-primary">
                  {COMP_EDITOR_LABELS.LABEL_6290}
                </span>
              </label>
              {day.showDailyImages === true && (day.images?.length || 0) > 0 && (
                <span className="text-xs text-morandi-secondary">{day.images?.length} 張</span>
              )}
            </div>
            {day.showDailyImages === true && (
              <DailyImagesUploader
                dayIndex={dayIndex}
                images={day.images || []}
                onImagesChange={newImages => {
                  updateDailyItinerary(dayIndex, 'images', newImages)
                }}
                allTourImages={
                  data.dailyItinerary?.flatMap(d =>
                    (d.images || []).map(img => (typeof img === 'string' ? img : img.url))
                  ) || []
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
