'use client'

import React from 'react'
import { GripVertical, X, Move, ZoomIn } from 'lucide-react'
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
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DailyImage } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

// 工具函數：取得圖片 URL
function getImageUrl(image: string | DailyImage): string {
  return typeof image === 'string' ? image : image.url
}

// 工具函數：取得圖片 position
function getImagePosition(image: string | DailyImage): string {
  return typeof image === 'string' ? 'center' : image.position || 'center'
}

// 可拖曳的縮圖組件
function SortableImageItem({
  image,
  index,
  onRemove,
  onEdit,
  onPreview,
}: {
  image: string | DailyImage
  index: number
  onRemove: () => void
  onEdit: () => void
  onPreview: () => void
}) {
  const imageUrl = getImageUrl(image)
  const imagePosition = getImagePosition(image)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: imageUrl,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-video rounded-lg overflow-hidden border border-morandi-container bg-morandi-container/20"
    >
      <img
        src={imageUrl}
        alt={`圖片 ${index + 1}`}
        className="w-full h-full object-cover cursor-pointer"
        style={{ objectPosition: imagePosition }}
        onClick={onPreview}
      />
      {/* 拖曳把手 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 bg-black/50 hover:bg-black/70 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size="0.875em" className="text-white" />
      </div>
      {/* 序號標籤 */}
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-white text-xs font-medium">
        {index + 1}
      </div>
      {/* 調整位置按鈕 */}
      <button
        type="button"
        onClick={onEdit}
        className="absolute bottom-1 right-8 p-1 bg-black/50 hover:bg-morandi-gold rounded text-white opacity-0 group-hover:opacity-100 transition-all"
        title={COMP_EDITOR_LABELS.調整顯示位置}
      >
        <Move size="0.875em" />
      </button>
      {/* 刪除按鈕 */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-status-danger rounded text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size="0.875em" />
      </button>
      {/* 預覽按鈕 */}
      <button
        type="button"
        onClick={onPreview}
        className="absolute bottom-1 right-1 p-1 bg-black/50 hover:bg-morandi-gold rounded text-white opacity-0 group-hover:opacity-100 transition-all"
        title={COMP_EDITOR_LABELS.預覽大圖}
      >
        <ZoomIn size="0.875em" />
      </button>
    </div>
  )
}

interface ImageGridProps {
  images: (string | DailyImage)[]
  onImagesChange: (images: (string | DailyImage)[]) => void
  onRemoveImage: (index: number) => void
  onEditImage: (index: number) => void
  onPreviewImage: (index: number) => void
}

export function ImageGrid({
  images,
  onImagesChange,
  onRemoveImage,
  onEditImage,
  onPreviewImage,
}: ImageGridProps) {
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

  // 取得所有圖片的 URL 作為 sortable items
  const imageUrls = images.map(getImageUrl)

  // 處理拖曳排序結束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = imageUrls.findIndex(url => url === active.id)
    const newIndex = imageUrls.findIndex(url => url === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newImages = arrayMove(images, oldIndex, newIndex)
      onImagesChange(newImages)
    }
  }

  if (images.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {images.map((image, index) => (
            <SortableImageItem
              key={getImageUrl(image)}
              image={image}
              index={index}
              onRemove={() => onRemoveImage(index)}
              onEdit={() => onEditImage(index)}
              onPreview={() => onPreviewImage(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
