'use client'

import React from 'react'
import { Upload, X, Crop, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImagePositionSettings, getImagePositionStyle } from '../image-position-editor'
import { IMAGE_UPLOADER_LABELS } from './constants/labels'

interface ImagePreviewProps {
  value: string
  position?: ImagePositionSettings | null
  uploading: boolean
  isDragOver: boolean
  previewHeight: string
  showPositionEditor: boolean
  showDeleteButton: boolean
  onPositionChange?: (position: ImagePositionSettings) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onUploadClick: () => void
  onPositionClick: () => void
  onDelete: () => void
}

export function ImagePreview({
  value,
  position,
  uploading,
  isDragOver,
  previewHeight,
  showPositionEditor,
  showDeleteButton,
  onPositionChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
  onPositionClick,
  onDelete,
}: ImagePreviewProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'relative rounded-lg overflow-hidden border-2 group transition-all',
        isDragOver ? 'border-morandi-gold bg-morandi-gold/20' : 'border-morandi-gold'
      )}
      style={{ height: previewHeight }}
    >
      <img
        src={value}
        alt={IMAGE_UPLOADER_LABELS.PREVIEW}
        className="w-full h-full object-cover"
        style={getImagePositionStyle(position)}
      />

      {/* 拖放提示 */}
      {isDragOver && (
        <div className="absolute inset-0 bg-morandi-gold/30 flex items-center justify-center">
          <div className="bg-card/90 px-4 py-2 rounded-lg text-sm font-medium text-morandi-primary">
            {IMAGE_UPLOADER_LABELS.LABEL_2938}
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {/* 更換圖片 */}
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="p-2 bg-card/90 hover:bg-card rounded-full text-morandi-primary transition-colors"
          title={IMAGE_UPLOADER_LABELS.LABEL_1707}
        >
          {uploading ? (
            <Loader2 size="1.125em" className="animate-spin" />
          ) : (
            <Upload size="1.125em" />
          )}
        </button>

        {/* 位置調整 */}
        {showPositionEditor && onPositionChange && (
          <button
            type="button"
            onClick={onPositionClick}
            className="p-2 bg-card/90 hover:bg-card rounded-full text-morandi-primary transition-colors"
            title={IMAGE_UPLOADER_LABELS.LABEL_9042}
          >
            <Crop size="1.125em" />
          </button>
        )}

        {/* 刪除 */}
        {showDeleteButton && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 bg-card/90 hover:bg-status-danger-bg rounded-full text-status-danger transition-colors"
            title={IMAGE_UPLOADER_LABELS.DELETE_7426}
          >
            <X size="1.125em" />
          </button>
        )}
      </div>

      {/* 上傳中遮罩 */}
      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 size="1.5em" className="animate-spin text-white" />
        </div>
      )}
    </div>
  )
}
