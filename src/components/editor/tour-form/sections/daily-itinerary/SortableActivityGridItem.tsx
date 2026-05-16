'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ImageIcon } from 'lucide-react'
import { SortableActivityGridItemProps } from './types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

export function SortableActivityGridItem({
  activity,
  actIndex,
  dayIndex,
}: SortableActivityGridItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `activity-${dayIndex}-${actIndex}`,
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
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-lg overflow-hidden border border-morandi-container bg-morandi-container/20 cursor-grab active:cursor-grabbing group"
    >
      {activity.image ? (
        <img
          src={activity.image}
          alt={activity.title || COMP_EDITOR_LABELS.活動圖片}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-morandi-container/30">
          <ImageIcon size="1.5em" className="text-morandi-secondary/40" />
        </div>
      )}
      {/* 序號標籤 */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs font-bold">
        {actIndex + 1}
      </div>
      {/* 標題 */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white text-xs font-medium truncate">
          {activity.title || COMP_EDITOR_LABELS.未命名景點}
        </p>
      </div>
      {/* 拖曳提示 */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <GripVertical size="1.25em" className="text-white" />
      </div>
    </div>
  )
}
