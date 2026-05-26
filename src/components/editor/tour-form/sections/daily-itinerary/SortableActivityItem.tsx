'use client'

import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TimeInput } from '@/components/ui/time-input'
import {
  GripVertical,
  ImageIcon,
  Loader2,
  X,
  Crop,
  Upload,
  Database,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
} from 'lucide-react'
import { RelatedImagesPreviewer } from '../../../RelatedImagesPreviewer'
import { getImagePositionStyle } from '@/components/ui/image-position-editor'
import { cn } from '@/lib/utils'
import { SortableActivityItemProps } from './types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UnsplashSearch } from '@/components/ui/image-uploader/UnsplashSearch'
import { PexelsPicker } from '@/components/shared/PexelsPicker'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

export function SortableActivityItem({
  activity,
  actIndex,
  dayIndex,
  is_collapsed = false,
  on_toggle_collapse,
  updateActivity,
  removeActivity,
  handleActivityImageUpload,
  handleExternalImageUpload,
  isActivityUploading,
  isActivityDragOver,
  setActivityDragOver,
  activityFileInputRefs,
  onOpenPositionEditor,
  onSaveToDatabase,
}: SortableActivityItemProps) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [isTimelineExpanded, setIsTimelineExpanded] = React.useState(
    // 如果已有時間資料，預設展開
    !!(activity.startTime || activity.endTime)
  )
  const [showUnsplashDialog, setShowUnsplashDialog] = useState(false)
  const [showPexelsDialog, setShowPexelsDialog] = useState(false)

  // 判斷是否可以存到資料庫（手動新增或已修改的景點）
  const canSaveToDb = !activity.attraction_id || activity.attraction_id.startsWith('manual_')

  const handleSaveToDb = async () => {
    if (!onSaveToDatabase || isSaving) return
    setIsSaving(true)
    try {
      await onSaveToDatabase(activity, dayIndex, actIndex)
    } finally {
      setIsSaving(false)
    }
  }
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `activity-${dayIndex}-${actIndex}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  const activityInputKey = `activity-${dayIndex}-${actIndex}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card/90 rounded-lg border border-morandi-container',
        is_collapsed ? 'px-3 py-2' : 'p-3'
      )}
    >
      {/* 摺疊時：只顯示標題行 */}
      {is_collapsed ? (
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-5 cursor-grab active:cursor-grabbing text-morandi-secondary/50 hover:text-morandi-secondary flex-shrink-0"
          >
            <GripVertical size="1em" />
          </div>
          {on_toggle_collapse && (
            <button
              type="button"
              onClick={on_toggle_collapse}
              className="p-0.5 rounded text-morandi-secondary hover:text-morandi-primary transition-colors flex-shrink-0"
            >
              <ChevronRight size="0.875em" />
            </button>
          )}
          {activity.image && (
            <img
              src={activity.image}
              alt=""
              className="w-6 h-6 rounded object-cover flex-shrink-0"
              style={getImagePositionStyle(activity.imagePosition)}
            />
          )}
          <span className="text-sm text-morandi-primary truncate flex-1">
            {activity.title || COMP_EDITOR_LABELS.景點名稱}
          </span>
          {(activity.startTime || activity.endTime) && (
            <span className="text-[0.625rem] text-morandi-secondary flex-shrink-0">
              {activity.startTime || '--:--'}~{activity.endTime || '--:--'}
            </span>
          )}
          <button
            onClick={() => removeActivity(dayIndex, actIndex)}
            className="px-1 py-0.5 text-status-danger hover:text-status-danger/80 text-xs transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            {/* 拖曳把手 + 摺疊按鈕 */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                {...attributes}
                {...listeners}
                className="flex items-center justify-center w-6 cursor-grab active:cursor-grabbing text-morandi-secondary/50 hover:text-morandi-secondary"
              >
                <GripVertical size="1.125em" />
              </div>
              {on_toggle_collapse && (
                <button
                  type="button"
                  onClick={on_toggle_collapse}
                  className="p-0.5 rounded text-morandi-secondary hover:text-morandi-primary transition-colors"
                >
                  <ChevronRight size="0.875em" className="rotate-90" />
                </button>
              )}
            </div>

            {/* 圖片區域 */}
            <div
              className={`relative w-24 h-24 flex-shrink-0 rounded-lg border-2 border-dashed overflow-hidden transition-colors ${
                isActivityDragOver
                  ? 'border-morandi-gold bg-morandi-gold/10'
                  : activity.image
                    ? 'border-transparent'
                    : 'border-morandi-container bg-morandi-container/20'
              }`}
              onDragOver={e => {
                e.preventDefault()
                e.stopPropagation()
                setActivityDragOver({ dayIndex, actIndex })
              }}
              onDragLeave={e => {
                e.preventDefault()
                e.stopPropagation()
                setActivityDragOver(null)
              }}
              onDrop={e => {
                e.preventDefault()
                e.stopPropagation()
                setActivityDragOver(null)
                const file = e.dataTransfer.files?.[0]
                if (file && file.type.startsWith('image/')) {
                  handleActivityImageUpload(dayIndex, actIndex, file)
                }
              }}
            >
              {activity.image ? (
                <>
                  <img
                    src={activity.image}
                    alt={activity.title || COMP_EDITOR_LABELS.活動圖片}
                    className="w-full h-full object-cover cursor-pointer"
                    style={getImagePositionStyle(activity.imagePosition)}
                    onClick={() => onOpenPositionEditor(dayIndex, actIndex)}
                    title={COMP_EDITOR_LABELS.點擊調整顯示位置}
                  />
                  {/* 位置調整按鈕 */}
                  <button
                    type="button"
                    onClick={() => onOpenPositionEditor(dayIndex, actIndex)}
                    className="absolute bottom-1 left-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                    title={COMP_EDITOR_LABELS.調整顯示位置}
                  >
                    <Crop size="0.625em" />
                  </button>
                  {/* 移除按鈕 */}
                  <button
                    type="button"
                    onClick={() => updateActivity(dayIndex, actIndex, 'image', '')}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                    title={COMP_EDITOR_LABELS.移除圖片}
                  >
                    <X size="0.75em" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-morandi-container/30 transition-colors">
                  {isActivityUploading ? (
                    <Loader2 size="1.25em" className="text-morandi-secondary animate-spin" />
                  ) : (
                    <>
                      <ImageIcon size="1.25em" className="text-morandi-secondary/50 mb-1" />
                      <span className="text-[0.625rem] text-morandi-secondary/50">
                        {COMP_EDITOR_LABELS.LABEL_1807}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={el => {
                      activityFileInputRefs.current[activityInputKey] = el
                    }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleActivityImageUpload(dayIndex, actIndex, file)
                      }
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 文字區域 */}
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={activity.title}
                onChange={e => updateActivity(dayIndex, actIndex, 'title', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder={COMP_EDITOR_LABELS.景點名稱}
              />
              <textarea
                value={activity.description}
                onChange={e => updateActivity(dayIndex, actIndex, 'description', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
                placeholder={COMP_EDITOR_LABELS.描述_選填}
              />

              {/* 時間軸展開區塊 */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                    isTimelineExpanded || activity.startTime || activity.endTime
                      ? 'text-morandi-gold bg-morandi-gold/10'
                      : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
                  }`}
                >
                  <Clock size="0.75em" />
                  <span>{COMP_EDITOR_LABELS.時間軸}</span>
                  {isTimelineExpanded ? <ChevronUp size="0.75em" /> : <ChevronDown size="0.75em" />}
                  {(activity.startTime || activity.endTime) && !isTimelineExpanded && (
                    <span className="ml-1 text-morandi-gold">
                      {activity.startTime || '--:--'} ~ {activity.endTime || '--:--'}
                    </span>
                  )}
                </button>

                {/* 時間輸入區塊 */}
                {isTimelineExpanded && (
                  <div className="mt-2 p-3 bg-morandi-container/20 rounded-lg border border-morandi-container/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-morandi-primary whitespace-nowrap">
                          {COMP_EDITOR_LABELS.LABEL_3517}
                        </label>
                        <TimeInput
                          value={
                            activity.startTime
                              ? `${activity.startTime.slice(0, 2)}:${activity.startTime.slice(2)}`
                              : ''
                          }
                          onChange={v => {
                            const value = v.replace(':', '')
                            updateActivity(dayIndex, actIndex, 'startTime', value)
                          }}
                          className="px-2 py-1 text-sm w-24"
                        />
                      </div>
                      <span className="text-morandi-secondary">~</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-morandi-primary whitespace-nowrap">
                          {COMP_EDITOR_LABELS.LABEL_7820}
                        </label>
                        <TimeInput
                          value={
                            activity.endTime
                              ? `${activity.endTime.slice(0, 2)}:${activity.endTime.slice(2)}`
                              : ''
                          }
                          onChange={v => {
                            const value = v.replace(':', '')
                            updateActivity(dayIndex, actIndex, 'endTime', value)
                          }}
                          className="px-2 py-1 border rounded text-sm w-24"
                        />
                      </div>
                      {/* 清除時間按鈕 */}
                      {(activity.startTime || activity.endTime) && (
                        <button
                          type="button"
                          onClick={() => {
                            updateActivity(dayIndex, actIndex, 'startTime', '')
                            updateActivity(dayIndex, actIndex, 'endTime', '')
                          }}
                          className="text-xs text-morandi-secondary hover:text-status-danger transition-colors"
                        >
                          {COMP_EDITOR_LABELS.CLEAR}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部操作區 */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-morandi-container/50">
            <div className="flex items-center gap-2">
              {/* 上傳圖片 */}
              <button
                type="button"
                onClick={() => activityFileInputRefs.current[activityInputKey]?.click()}
                disabled={isActivityUploading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50 rounded transition-colors disabled:opacity-50"
              >
                <Upload size="0.75em" />
                {COMP_EDITOR_LABELS.UPLOAD}
              </button>
              {/* Unsplash */}
              <button
                type="button"
                onClick={() => setShowUnsplashDialog(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50 rounded transition-colors"
              >
                <Search size="0.75em" />
                Unsplash
              </button>
              {/* Pexels */}
              <button
                type="button"
                onClick={() => setShowPexelsDialog(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-status-success hover:text-status-success hover:bg-status-success/10 rounded transition-colors"
              >
                <Search size="0.75em" />
                Pexels
              </button>
              {/* 相關圖片預覽 */}
              {activity.title && (
                <RelatedImagesPreviewer
                  activityTitle={activity.title}
                  currentImageUrl={activity.image}
                  onSelectImage={imageUrl => updateActivity(dayIndex, actIndex, 'image', imageUrl)}
                  className="flex-1"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 存到資料庫按鈕 - 只有手動新增的景點顯示 */}
              {canSaveToDb && onSaveToDatabase && activity.title && (
                <button
                  type="button"
                  onClick={handleSaveToDb}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-morandi-blue hover:text-morandi-blue/80 hover:bg-morandi-blue/10 rounded transition-colors disabled:opacity-50"
                  title={COMP_EDITOR_LABELS.將此景點儲存到景點資料庫}
                >
                  {isSaving ? (
                    <Loader2 size="0.75em" className="animate-spin" />
                  ) : (
                    <Database size="0.75em" />
                  )}
                  存到資料庫
                </button>
              )}
              <button
                onClick={() => removeActivity(dayIndex, actIndex)}
                className="px-2 py-1 text-status-danger hover:text-status-danger/80 text-xs transition-colors"
              >
                ✕ 刪除
              </button>
            </div>
          </div>

          {/* Unsplash 搜尋對話框 */}
          <Dialog open={showUnsplashDialog} onOpenChange={setShowUnsplashDialog}>
            <DialogContent level={2} className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search size="1.125em" />
                  Unsplash 免費圖庫
                </DialogTitle>
              </DialogHeader>
              <UnsplashSearch
                onSelect={async url => {
                  setShowUnsplashDialog(false)
                  if (handleExternalImageUpload) {
                    await handleExternalImageUpload(dayIndex, actIndex, url)
                  } else {
                    updateActivity(dayIndex, actIndex, 'image', url)
                  }
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Pexels 搜尋對話框 */}
          <Dialog open={showPexelsDialog} onOpenChange={setShowPexelsDialog}>
            <DialogContent level={2} className="max-w-4xl max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search size="1.125em" />
                  Pexels 免費圖庫
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
                <PexelsPicker
                  onSelectImage={async url => {
                    setShowPexelsDialog(false)
                    if (handleExternalImageUpload) {
                      await handleExternalImageUpload(dayIndex, actIndex, url)
                    } else {
                      updateActivity(dayIndex, actIndex, 'image', url)
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
