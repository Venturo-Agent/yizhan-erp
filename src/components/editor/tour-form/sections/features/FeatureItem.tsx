import React from 'react'
import { Feature } from '../../types'
import { Loader2, X, Plus, GripVertical } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

const TAG_COLOR_OPTIONS = [
  { value: '#2C5F4D', label: COMP_EDITOR_LABELS.深綠 },
  { value: '#C69C6D', label: COMP_EDITOR_LABELS.金色 },
  { value: '#8F4F4F', label: COMP_EDITOR_LABELS.酒紅 },
  { value: '#636E72', label: COMP_EDITOR_LABELS.灰色 },
  { value: '#2D3436', label: COMP_EDITOR_LABELS.深灰 },
  { value: '#0984e3', label: COMP_EDITOR_LABELS.藍色 },
]

interface FeatureItemProps {
  feature: Feature
  index: number
  isDraggingFeature: boolean
  isDragOverFeature: boolean
  uploadingImage: { featureIndex: number; imageIndex: number } | null
  draggedImage: { featureIndex: number; imageIndex: number } | null
  dragOverImage: { featureIndex: number; imageIndex: number } | null
  fileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>
  onUpdateFeature: (index: number, field: string, value: string | string[]) => void
  onRemoveFeature: (index: number) => void
  onFeatureDragStart: (index: number) => void
  onFeatureDragEnd: () => void
  onFeatureDragOver: (e: React.DragEvent, index: number) => void
  onFeatureDrop: (index: number) => void
  onImageUpload: (featureIndex: number, imageIndex: number, file: File) => void
  onMultipleImageUpload: (featureIndex: number, files: FileList) => void
  onRemoveImage: (featureIndex: number, imageIndex: number) => void
  onImageDragStart: (featureIndex: number, imageIndex: number) => void
  onImageDragOver: (e: React.DragEvent, featureIndex: number, imageIndex: number) => void
  onImageDrop: (featureIndex: number, targetIndex: number) => void
  onImageDragEnd: () => void
}

export function FeatureItem({
  feature,
  index,
  isDraggingFeature,
  isDragOverFeature,
  uploadingImage,
  draggedImage,
  dragOverImage,
  fileInputRefs,
  onUpdateFeature,
  onRemoveFeature,
  onFeatureDragStart,
  onFeatureDragEnd,
  onFeatureDragOver,
  onFeatureDrop,
  onImageUpload,
  onMultipleImageUpload,
  onRemoveImage,
  onImageDragStart,
  onImageDragOver,
  onImageDrop,
  onImageDragEnd,
}: FeatureItemProps) {
  const images = feature.images || []

  return (
    <div
      onDragOver={e => onFeatureDragOver(e, index)}
      onDrop={() => onFeatureDrop(index)}
      className={`p-4 border-2 rounded-lg space-y-3 transition-all ${
        isDraggingFeature
          ? 'opacity-50 scale-[0.98] border-morandi-gold bg-morandi-gold/10'
          : isDragOverFeature
            ? 'border-morandi-gold bg-morandi-gold/5'
            : 'border-morandi-container bg-morandi-container/20'
      }`}
    >
      {/* 標題列 */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div
            draggable
            onDragStart={() => onFeatureDragStart(index)}
            onDragEnd={onFeatureDragEnd}
            className="cursor-move text-morandi-secondary hover:text-morandi-primary transition-colors p-1 -m-1 rounded hover:bg-morandi-container/50"
            title={COMP_EDITOR_LABELS.拖曳排序}
          >
            <GripVertical size="1.125em" />
          </div>
          <span className="text-sm font-medium text-morandi-secondary">
            {COMP_EDITOR_LABELS.特色} {index + 1}
          </span>
        </div>
        <button
          onClick={() => onRemoveFeature(index)}
          className="text-status-danger hover:text-status-danger/80 text-sm transition-colors"
        >
          {COMP_EDITOR_LABELS.DELETE}
        </button>
      </div>

      {/* 標籤文字 + 顏色 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_1694}
          </label>
          <input
            type="text"
            value={feature.tag || ''}
            onChange={e => onUpdateFeature(index, 'tag', e.target.value)}
            className="w-full px-3 py-2 border border-morandi-container rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 focus:border-morandi-gold"
            placeholder={COMP_EDITOR_LABELS.如_Gastronomy_Discovery}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_5949}
          </label>
          <div className="flex gap-1.5 items-center h-[2.625rem]">
            {TAG_COLOR_OPTIONS.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => onUpdateFeature(index, 'tagColor', color.value)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  feature.tagColor === color.value
                    ? 'border-morandi-gold scale-110 ring-2 ring-morandi-gold/30'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 標題 */}
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {COMP_EDITOR_LABELS.TITLE}
        </label>
        <input
          type="text"
          value={feature.title}
          onChange={e => onUpdateFeature(index, 'title', e.target.value)}
          className="w-full px-3 py-2 border border-morandi-container rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 focus:border-morandi-gold"
          placeholder={COMP_EDITOR_LABELS.溫泉飯店體驗}
        />
      </div>

      {/* 描述 */}
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {COMP_EDITOR_LABELS.LABEL_3951}
        </label>
        <input
          type="text"
          value={feature.description}
          onChange={e => onUpdateFeature(index, 'description', e.target.value)}
          className="w-full px-3 py-2 border border-morandi-container rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 focus:border-morandi-gold"
          placeholder={COMP_EDITOR_LABELS.保證入住阿蘇溫泉飯店_享受日式溫泉文化}
        />
      </div>

      {/* 特色圖片 */}
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-2">
          {COMP_EDITOR_LABELS.SELECT_4656}
        </label>
        <div className="flex flex-wrap gap-2">
          {/* 已上傳的圖片 */}
          {images.map((imageUrl, imgIndex) => {
            const isUploading =
              uploadingImage?.featureIndex === index && uploadingImage?.imageIndex === imgIndex
            const isDragging =
              draggedImage?.featureIndex === index && draggedImage?.imageIndex === imgIndex
            const isDragOver =
              dragOverImage?.featureIndex === index && dragOverImage?.imageIndex === imgIndex

            return (
              <div
                key={imgIndex}
                draggable={!isUploading}
                onDragStart={() => onImageDragStart(index, imgIndex)}
                onDragOver={e => onImageDragOver(e, index, imgIndex)}
                onDrop={() => onImageDrop(index, imgIndex)}
                onDragEnd={onImageDragEnd}
                className={`relative w-16 h-16 rounded-lg overflow-hidden cursor-move group transition-all ${
                  isDragging ? 'opacity-50 scale-95' : ''
                } ${isDragOver ? 'ring-2 ring-morandi-gold ring-offset-2' : ''}`}
              >
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-morandi-container/30">
                    <Loader2 size="1em" className="text-morandi-secondary animate-spin" />
                  </div>
                ) : (
                  <>
                    <img
                      src={imageUrl}
                      alt={`特色圖片 ${imgIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <GripVertical
                        size="1em"
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[0.625rem] px-1 rounded">
                      {imgIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onRemoveImage(index, imgIndex)
                      }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 hover:bg-status-danger rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title={COMP_EDITOR_LABELS.移除圖片}
                    >
                      <X size="0.625em" />
                    </button>
                  </>
                )}
              </div>
            )
          })}

          {/* 新增圖片按鈕 */}
          {images.length < 4 && (
            <div
              className="relative w-16 h-16 rounded-lg border-2 border-dashed border-morandi-container bg-morandi-container/20 hover:border-morandi-gold/50 overflow-hidden transition-colors"
              onDragOver={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={e => {
                e.preventDefault()
                e.stopPropagation()
                if (draggedImage) return
                const files = e.dataTransfer.files
                if (files && files.length > 0) {
                  if (files.length === 1) {
                    const file = files[0]
                    if (file.type.startsWith('image/')) {
                      onImageUpload(index, images.length, file)
                    }
                  } else {
                    onMultipleImageUpload(index, files)
                  }
                }
              }}
            >
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-morandi-container/30 transition-colors">
                {uploadingImage?.featureIndex === index &&
                uploadingImage?.imageIndex >= images.length ? (
                  <Loader2 size="1em" className="text-morandi-secondary animate-spin" />
                ) : (
                  <Plus size="1.25em" className="text-morandi-secondary/50" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={el => {
                    fileInputRefs.current[`feature-${index}-new`] = el
                  }}
                  onChange={e => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      if (files.length === 1) {
                        onImageUpload(index, images.length, files[0])
                      } else {
                        onMultipleImageUpload(index, files)
                      }
                    }
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* 圖片數量提示 */}
        <p className="text-xs text-morandi-secondary/60 mt-2">
          {images.length === 0 && COMP_EDITOR_LABELS.尚未上傳圖片}
          {images.length === 1 && COMP_EDITOR_LABELS._1_張圖片會滿版顯示}
          {images.length === 2 && COMP_EDITOR_LABELS._2_張圖片會左右並排}
          {images.length === 3 && COMP_EDITOR_LABELS._3_張圖片會_1_大_2_小}
          {images.length === 4 && COMP_EDITOR_LABELS._4_張圖片會_2x2_網格}
        </p>
      </div>
    </div>
  )
}
