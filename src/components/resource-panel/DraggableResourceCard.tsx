'use client'

import React, { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { MapPin, Building2, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResourceItem, ResourceType } from './types'

const PENDING_VERIFY_LABEL = '⚠ 待驗證'

interface DraggableResourceCardProps {
  resource: ResourceItem
  onEdit?: (resource: ResourceItem) => void
}

export function DraggableResourceCard({ resource, onEdit }: DraggableResourceCardProps) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const hasMoved = useRef(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resource-${resource.type}-${resource.id}`,
    data: {
      type: resource.type,
      resourceId: resource.id,
      resourceName: resource.name,
      dataVerified: resource.data_verified ?? true,
    },
  })

  const isUnverified = resource.data_verified === false

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size="0.875em" className="text-status-success" />,
    hotel: <Building2 size="0.875em" className="text-status-info" />,
    restaurant: <UtensilsCrossed size="0.875em" className="text-status-warning" />,
  }

  // 追蹤是否真的移動了（超過 5px 才算拖曳）
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    hasMoved.current = false
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x)
      const dy = Math.abs(e.clientY - dragStartPos.current.y)
      if (dx > 5 || dy > 5) {
        hasMoved.current = true
      }
    }
  }

  // 處理點擊：只有沒移動過才觸發編輯
  const handleClick = () => {
    if (!hasMoved.current) {
      onEdit?.(resource)
    }
    dragStartPos.current = null
    hasMoved.current = false
  }

  // 合併自定義 handler 和 dnd-kit 的 listeners
  const mergedOnPointerDown = (e: React.PointerEvent) => {
    handlePointerDown(e)
    // 調用 dnd-kit 的 onPointerDown
    ;(listeners?.onPointerDown as ((e: React.PointerEvent) => void) | undefined)?.(e)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      onPointerDown={mergedOnPointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-card cursor-grab select-none',
        'hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg z-50 cursor-grabbing',
        // 未驗證 = 警示邊框
        isUnverified ? 'border-status-warning/50 bg-status-warning-bg' : 'border-border'
      )}
    >
      {/* 縮圖 */}
      {resource.images?.[0] ? (
        <img
          src={resource.images[0]}
          alt={resource.name}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div
          className={cn(
            'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
            isUnverified ? 'bg-morandi-gold/10' : 'bg-muted'
          )}
        >
          {iconMap[resource.type]}
        </div>
      )}
      {/* 名稱和分類 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{resource.name}</p>
        {isUnverified ? (
          <p className="text-[0.625rem] text-status-warning truncate">{PENDING_VERIFY_LABEL}</p>
        ) : (
          <p className="text-[0.625rem] text-muted-foreground truncate">
            {resource.category || resource.city_name || ''}
          </p>
        )}
      </div>
    </div>
  )
}
