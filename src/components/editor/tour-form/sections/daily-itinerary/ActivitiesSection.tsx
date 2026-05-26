'use client'

import React, { useRef, useState, useEffect } from 'react'
import { List, LayoutGrid, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createAttraction } from '@/data'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Activity, DailyItinerary } from '../../types'
import { SortableActivityItem } from './SortableActivityItem'
import { SortableActivityGridItem } from './SortableActivityGridItem'
import { logger } from '@/lib/utils/logger'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'
import { DAILY_ITINERARY_LABELS } from './constants/labels'

interface ActivitiesSectionProps {
  day: DailyItinerary
  dayIndex: number
  addActivity: (dayIndex: number) => void
  updateActivity: (dayIndex: number, actIndex: number, field: string, value: string) => void
  removeActivity: (dayIndex: number, actIndex: number) => void
  reorderActivities?: (dayIndex: number, activities: Activity[]) => void
  updateDailyItinerary: (index: number, field: string, value: unknown) => void
  onOpenAttractionSelector: (dayIndex: number) => void
  handleActivityImageUpload: (dayIndex: number, actIndex: number, file: File) => void
  handleExternalImageUpload?: (
    dayIndex: number,
    actIndex: number,
    imageUrl: string
  ) => Promise<void>
  uploadingActivityImage: { dayIndex: number; actIndex: number } | null
  activityDragOver: { dayIndex: number; actIndex: number } | null
  setActivityDragOver: (value: { dayIndex: number; actIndex: number } | null) => void
  onOpenPositionEditor: (dayIndex: number, actIndex: number) => void
}

export function ActivitiesSection({
  day,
  dayIndex,
  addActivity,
  updateActivity,
  removeActivity,
  reorderActivities,
  updateDailyItinerary,
  onOpenAttractionSelector,
  handleActivityImageUpload,
  handleExternalImageUpload,
  uploadingActivityImage,
  activityDragOver,
  setActivityDragOver,
  onOpenPositionEditor,
}: ActivitiesSectionProps) {
  // 視圖模式
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const activityFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // 活動摺疊狀態（預設全部收合）
  const activity_count = day.activities?.length || 0
  const [collapsed_activities, set_collapsed_activities] = useState<Set<number>>(
    () => new Set(Array.from({ length: activity_count }, (_, i) => i))
  )

  // 當活動數量變化時，新增的活動預設收合
  useEffect(() => {
    set_collapsed_activities(prev => {
      if (activity_count > prev.size || activity_count === 0) {
        // 新增了活動，把新的也加入收合集合（但展開最新一個方便編輯）
        const new_set = new Set(prev)
        // 如果是新增活動（數量增加），展開最後一個
        if (activity_count > 0 && activity_count > prev.size) {
          for (let i = 0; i < activity_count - 1; i++) {
            new_set.add(i)
          }
          new_set.delete(activity_count - 1)
        }
        return new_set
      }
      return prev
    })
  }, [activity_count])

  const all_activities_collapsed =
    collapsed_activities.size === activity_count && activity_count > 0
  const all_activities_expanded = collapsed_activities.size === 0

  const toggle_activity_collapse = (act_index: number) => {
    set_collapsed_activities(prev => {
      const new_set = new Set(prev)
      if (new_set.has(act_index)) {
        new_set.delete(act_index)
      } else {
        new_set.add(act_index)
      }
      return new_set
    })
  }

  const collapse_all_activities = () => {
    set_collapsed_activities(new Set(Array.from({ length: activity_count }, (_, i) => i)))
  }

  const expand_all_activities = () => {
    set_collapsed_activities(new Set())
  }

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 將景點存到資料庫
  // Phase A.6（5/20）：改用 entity hook createAttraction、內建 invalidateAttractions
  // 紅線 F：寫入後 SWR cache 真的失效、library/attractions 列表 + ResourcePanel 同步更新
  const handleSaveToDatabase = async (activity: Activity, _dayIndex: number, actIndex: number) => {
    try {
      const created = await createAttraction({
        name: activity.title,
        description: activity.description || undefined,
        images: activity.image ? [activity.image] : [],
        is_active: true,
        display_order: 0,
        country_id: 'unknown', // 預設值、可在景點管理中修改
      })

      // 更新活動的 attraction_id 為新建立的資料庫 ID
      if (created?.id) {
        updateActivity(dayIndex, actIndex, 'attraction_id', created.id)
        toast.success(`已將「${activity.title}」存到景點資料庫`)
      }
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.儲存景點失敗, error)
      toast.error(COMP_EDITOR_LABELS.儲存失敗_請稍後再試)
    }
  }

  // 處理拖曳結束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activities = day.activities || []
    const oldIndex = activities.findIndex((_, i) => `activity-${dayIndex}-${i}` === active.id)
    const newIndex = activities.findIndex((_, i) => `activity-${dayIndex}-${i}` === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newActivities = arrayMove(activities, oldIndex, newIndex)
      if (reorderActivities) {
        reorderActivities(dayIndex, newActivities)
      } else {
        updateDailyItinerary(dayIndex, 'activities', newActivities)
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-morandi-primary">
            {COMP_EDITOR_LABELS.LABEL_2716}
          </label>
          {/* 視圖切換按鈕 */}
          <div className="flex items-center bg-morandi-container/50 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-card shadow-sm text-morandi-primary'
                  : 'text-morandi-secondary hover:text-morandi-primary'
              }`}
              title={COMP_EDITOR_LABELS.列表模式}
            >
              <List size="0.875em" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-card shadow-sm text-morandi-primary'
                  : 'text-morandi-secondary hover:text-morandi-primary'
              }`}
              title={COMP_EDITOR_LABELS.網格預覽_快速排序}
            >
              <LayoutGrid size="0.875em" />
            </button>
          </div>
          <span className="text-xs text-morandi-secondary">
            {viewMode === 'grid'
              ? COMP_EDITOR_LABELS.拖曳調整順序
              : COMP_EDITOR_LABELS.拖曳_可調整順序}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activity_count > 1 && (
            <>
              <button
                type="button"
                onClick={collapse_all_activities}
                disabled={all_activities_collapsed}
                className={`flex items-center gap-0.5 px-1.5 py-1 text-[0.625rem] rounded transition-colors ${
                  all_activities_collapsed
                    ? 'text-morandi-muted cursor-not-allowed'
                    : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
                }`}
              >
                <ChevronsDownUp size="0.75em" />
                {DAILY_ITINERARY_LABELS.COLLAPSE_ACTIVITIES}
              </button>
              <button
                type="button"
                onClick={expand_all_activities}
                disabled={all_activities_expanded}
                className={`flex items-center gap-0.5 px-1.5 py-1 text-[0.625rem] rounded transition-colors ${
                  all_activities_expanded
                    ? 'text-morandi-muted cursor-not-allowed'
                    : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
                }`}
              >
                <ChevronsUpDown size="0.75em" />
                {DAILY_ITINERARY_LABELS.EXPAND_ACTIVITIES}
              </button>
            </>
          )}
          <Button onClick={() => onOpenAttractionSelector(dayIndex)} size="xs" variant="soft-gold">
            {COMP_EDITOR_LABELS.SELECT_1031}
          </Button>
          <Button onClick={() => addActivity(dayIndex)} size="xs" variant="secondary">
            + 手動新增
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={day.activities?.map((_, i) => `activity-${dayIndex}-${i}`) || []}
          strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
        >
          {viewMode === 'grid' ? (
            /* 網格預覽模式 */
            <div className="grid grid-cols-5 gap-3 p-3 bg-morandi-container/20 rounded-xl">
              {day.activities?.map((activity: Activity, actIndex: number) => (
                <SortableActivityGridItem
                  key={`activity-${dayIndex}-${actIndex}`}
                  activity={activity}
                  actIndex={actIndex}
                  dayIndex={dayIndex}
                />
              ))}
            </div>
          ) : (
            /* 列表編輯模式 */
            <div className="space-y-2">
              {day.activities?.map((activity: Activity, actIndex: number) => {
                const isActivityUploading =
                  uploadingActivityImage?.dayIndex === dayIndex &&
                  uploadingActivityImage?.actIndex === actIndex
                const isActivityDragOver =
                  activityDragOver?.dayIndex === dayIndex && activityDragOver?.actIndex === actIndex

                return (
                  <SortableActivityItem
                    key={`activity-${dayIndex}-${actIndex}`}
                    activity={activity}
                    actIndex={actIndex}
                    dayIndex={dayIndex}
                    is_collapsed={collapsed_activities.has(actIndex)}
                    on_toggle_collapse={() => toggle_activity_collapse(actIndex)}
                    updateActivity={updateActivity}
                    removeActivity={removeActivity}
                    handleActivityImageUpload={handleActivityImageUpload}
                    handleExternalImageUpload={handleExternalImageUpload}
                    isActivityUploading={isActivityUploading}
                    isActivityDragOver={isActivityDragOver}
                    setActivityDragOver={setActivityDragOver}
                    activityFileInputRefs={activityFileInputRefs}
                    onOpenPositionEditor={onOpenPositionEditor}
                    onSaveToDatabase={handleSaveToDatabase}
                  />
                )
              })}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  )
}
