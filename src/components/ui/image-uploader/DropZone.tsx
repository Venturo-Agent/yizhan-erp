'use client'

import React from 'react'
import { Loader2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IMAGE_UPLOADER_LABELS } from './constants/labels'

interface DropZoneProps {
  uploading: boolean
  isDragOver: boolean
  disabled: boolean
  previewHeight: string
  placeholder: string
  maxSize: number
  onClick: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function DropZone({
  uploading,
  isDragOver,
  disabled,
  previewHeight,
  placeholder,
  maxSize,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: DropZoneProps) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'border-2 border-dashed rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-2',
        isDragOver
          ? 'border-morandi-gold bg-morandi-gold/10'
          : 'border-morandi-container hover:border-morandi-gold/50 hover:bg-morandi-container/30',
        disabled && 'opacity-50 cursor-not-allowed',
        uploading && 'pointer-events-none'
      )}
      style={{ height: previewHeight }}
    >
      {uploading ? (
        <>
          <Loader2 size="1.5em" className="animate-spin text-morandi-gold" />
          <span className="text-sm text-morandi-secondary">
            {IMAGE_UPLOADER_LABELS.UPLOADING_2213}
          </span>
        </>
      ) : (
        <>
          <ImageIcon size="1.5em" className="text-morandi-secondary" />
          <span className="text-sm text-morandi-secondary text-center px-4">{placeholder}</span>
          <span className="text-xs text-morandi-secondary/70">
            最大 {Math.round(maxSize / 1024 / 1024)}MB
          </span>
        </>
      )}
    </div>
  )
}
