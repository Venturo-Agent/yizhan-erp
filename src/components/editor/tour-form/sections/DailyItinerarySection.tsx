'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { TourFormData, ItineraryStyleType } from '../types'
import { AttractionSelector } from '../../attraction-selector'
import { useTemplates, getTemplateColor } from '@/app/(main)/tours/[code]/_itinerary/_hooks/useTemplates'
import {
} from '@/components/ui/select'
import { FolderPlus, Loader2 } from 'lucide-react'

const HotelSelector = dynamic(() => import('../../HotelSelector').then(m => m.HotelSelector), {
  loading: () => (
    <div className="flex justify-center p-8">
      <Loader2 className="animate-spin" />
    </div>
  ),
  ssr: false,
})

const RestaurantSelector = dynamic(
  () => import('../../RestaurantSelector').then(m => m.RestaurantSelector),
  {
    loading: () => (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    ),
    ssr: false,
  }
)
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ImagePositionEditor } from '@/components/ui/image-position-editor'
import { calculateDayLabels } from './daily-itinerary'
import { DayList } from './daily-itinerary/DayList'
import { useDailyItinerary } from './daily-itinerary/hooks/useDailyItinerary'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface DailyItinerarySectionProps {
  data: TourFormData
  updateField: (field: string, value: unknown) => void
  addDailyItinerary: () => void
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
  reorderActivities?: (dayIndex: number, activities: unknown[]) => void
  addDayImage: (dayIndex: number) => void
  updateDayImage: (dayIndex: number, imageIndex: number, value: string) => void
  removeDayImage: (dayIndex: number, imageIndex: number) => void
  addRecommendation: (dayIndex: number) => void
  updateRecommendation: (dayIndex: number, recIndex: number, value: string) => void
  removeRecommendation: (dayIndex: number, recIndex: number) => void
  isAccommodationLockedByQuote?: boolean // 有關聯報價單時鎖定住宿編輯
}

export function DailyItinerarySection({
  data,
  updateField,
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
  isAccommodationLockedByQuote,
}: DailyItinerarySectionProps) {
  // 計算所有天的標籤
  const dayLabels = calculateDayLabels(data.dailyItinerary || [])

  // 從資料庫載入模板
  const { dailyTemplates, loading: _templatesLoading } = useTemplates()

  // 使用自定義 Hook 管理所有狀態和邏輯
  const {
    showAttractionSelector,
    showHotelSelector,
    showRestaurantSelector,
    currentDayIndex,
    activityPositionEditor,
    saveToLibraryDialog,
    libraryImageName,
    isSavingToLibrary,
    existingAttractionIds,
    setShowAttractionSelector,
    setShowHotelSelector,
    setShowRestaurantSelector,
    setCurrentDayIndex,
    setCurrentMealSelector,
    setActivityPositionEditor,
    setSaveToLibraryDialog,
    setLibraryImageName,
    handleOpenAttractionSelector,
    handleOpenHotelSelector,
    handleOpenRestaurantSelector,
    handleSelectAttractions,
    handleSelectHotels,
    handleSelectRestaurants,
    handleActivityImageUpload,
    handleExternalImageUpload,
    handleSaveToLibrary,
  } = useDailyItinerary({
    data,
    updateDailyItinerary,
    updateActivity,
    addActivity,
  })

  // 行程風格選項
  const _itineraryStyleOptions = useMemo(() => {
    return dailyTemplates.map(template => ({
      value: template.id as ItineraryStyleType,
      label: template.name,
      description: template.description || '',
      color: getTemplateColor(template.id),
      previewImage: template.preview_image_url,
    }))
  }, [dailyTemplates])

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex justify-between items-center border-b-2 border-morandi-gold pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-morandi-primary">
            {COMP_EDITOR_LABELS.LABEL_7217}
          </h2>
          {(() => {
            const total = data.dailyItinerary?.length || 0
            const mainDays = data.dailyItinerary?.filter(d => !d.isAlternative).length || 0
            const alternatives = total - mainDays

            if (alternatives > 0) {
              return (
                <span className="px-2 py-0.5 bg-morandi-container text-morandi-secondary text-xs rounded-full">
                  {mainDays} 天 + {alternatives} 建議方案
                </span>
              )
            }
            return (
              <span className="px-2 py-0.5 bg-morandi-container text-morandi-secondary text-xs rounded-full">
                {total} 天
              </span>
            )
          })()}
        </div>
        <div className="flex items-center gap-3"></div>
      </div>

      {/* 每日卡片列表 */}
      <DayList
        data={data}
        dayLabels={dayLabels}
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
        onOpenAttractionSelector={handleOpenAttractionSelector}
        onOpenHotelSelector={handleOpenHotelSelector}
        onOpenRestaurantSelector={handleOpenRestaurantSelector}
        handleActivityImageUpload={handleActivityImageUpload}
        handleExternalImageUpload={handleExternalImageUpload}
        onOpenPositionEditor={(dIdx, aIdx) => {
          setActivityPositionEditor({ isOpen: true, dayIndex: dIdx, actIndex: aIdx })
        }}
      />

      {/* 景點選擇器 */}
      <AttractionSelector
        isOpen={showAttractionSelector}
        onClose={() => {
          setShowAttractionSelector(false)
          setCurrentDayIndex(-1)
        }}
        tourCountries={data.countries}
        tourCountryName={data.country}
        onSelect={handleSelectAttractions}
        dayTitle={currentDayIndex >= 0 ? data.dailyItinerary[currentDayIndex]?.title : ''}
        existingIds={existingAttractionIds}
      />

      {/* 飯店選擇器 */}
      <HotelSelector
        isOpen={showHotelSelector}
        onClose={() => {
          setShowHotelSelector(false)
          setCurrentDayIndex(-1)
        }}
        tourCountryName={data.country}
        onSelect={handleSelectHotels}
      />

      {/* 餐廳選擇器 */}
      <RestaurantSelector
        isOpen={showRestaurantSelector}
        onClose={() => {
          setShowRestaurantSelector(false)
          setCurrentMealSelector(null)
        }}
        tourCountryName={data.country}
        onSelect={handleSelectRestaurants}
        includeMichelin={true}
      />

      {/* 儲存到圖庫確認對話框 */}
      <Dialog
        open={saveToLibraryDialog?.isOpen ?? false}
        onOpenChange={open => {
          if (!open) {
            setSaveToLibraryDialog(null)
            setLibraryImageName('')
          }
        }}
      >
        <DialogContent level={1} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus size="1.25em" className="text-morandi-gold" />
              {COMP_EDITOR_LABELS.儲存到圖庫}
            </DialogTitle>
            <DialogDescription>{COMP_EDITOR_LABELS.SAVING_183}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {saveToLibraryDialog?.publicUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-morandi-container">
                <img
                  src={saveToLibraryDialog.publicUrl}
                  alt={COMP_EDITOR_LABELS.預覽}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_EDITOR_LABELS.LABEL_3237}
              </label>
              <Input
                value={libraryImageName}
                onChange={e => setLibraryImageName(e.target.value)}
                placeholder={COMP_EDITOR_LABELS.輸入圖片名稱}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSaveToLibraryDialog(null)
                setLibraryImageName('')
              }}
              disabled={isSavingToLibrary}
            >
              {COMP_EDITOR_LABELS.LABEL_1066}
            </Button>
            <Button variant="soft-gold"
              type="button"
              onClick={handleSaveToLibrary}
              disabled={isSavingToLibrary}
 
            >
              {isSavingToLibrary ? (
                <>
                  <Loader2 size="1em" className="mr-2 animate-spin" />
                  {COMP_EDITOR_LABELS.儲存中}
                </>
              ) : (
                COMP_EDITOR_LABELS.儲存到圖庫
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 景點圖片位置調整器 */}
      {activityPositionEditor &&
        (() => {
          const activity =
            data.dailyItinerary?.[activityPositionEditor.dayIndex]?.activities?.[
              activityPositionEditor.actIndex
            ]
          if (!activity?.image) return null

          return (
            <ImagePositionEditor
              open={activityPositionEditor.isOpen}
              onClose={() => setActivityPositionEditor(null)}
              imageSrc={activity.image}
              currentPosition={activity.imagePosition}
              onConfirm={settings => {
                updateActivity(
                  activityPositionEditor.dayIndex,
                  activityPositionEditor.actIndex,
                  'imagePosition',
                  JSON.stringify(settings)
                )
              }}
              aspectRatio={16 / 9}
              title={COMP_EDITOR_LABELS.調整景點圖片}
            />
          )
        })()}
    </div>
  )
}
