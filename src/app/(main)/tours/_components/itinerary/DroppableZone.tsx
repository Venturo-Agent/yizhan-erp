'use client'

import { useDroppable } from '@dnd-kit/core'

type DropZoneAcceptType = 'attraction' | 'hotel' | 'restaurant'

interface DroppableZoneProps {
  id: string
  acceptType: DropZoneAcceptType
  children: React.ReactNode
  className?: string
}

export function DroppableZone({ id, acceptType, children, className }: DroppableZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { acceptType },
  })

  const draggedType = active?.data.current?.type as string | undefined
  // 景點卡片（itinerary-attraction）也算 attraction 類型
  const normalizedType = draggedType === 'itinerary-attraction' ? 'attraction' : draggedType
  const isCompatible = normalizedType === acceptType
  const showHighlight = isOver && isCompatible
  const showReject = isOver && draggedType !== undefined && !isCompatible

  const highlightStyles: Record<DropZoneAcceptType, string> = {
    attraction: 'ring-2 ring-morandi-gold bg-morandi-gold/15 shadow-md',
    hotel: 'ring-2 ring-morandi-gold bg-morandi-gold/15 shadow-md',
    restaurant: 'ring-2 ring-morandi-gold bg-morandi-gold/15 shadow-md',
  }

  return (
    <div
      ref={setNodeRef}
      className={`${className || ''} transition-all duration-150 ${
        showHighlight ? highlightStyles[acceptType] : ''
      }${showReject ? ' ring-1 ring-morandi-red/40' : ''}`}
    >
      {children}
    </div>
  )
}
