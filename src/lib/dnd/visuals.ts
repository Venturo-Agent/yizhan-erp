import type { CSSProperties } from 'react'
import { CSS, type Transform } from '@dnd-kit/utilities'

export interface DragVisualState {
  transform: Transform | null
  transition?: string
  isDragging: boolean
}

export function getDragStyle({
  transform,
  transition,
  isDragging,
}: DragVisualState): CSSProperties {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
}
