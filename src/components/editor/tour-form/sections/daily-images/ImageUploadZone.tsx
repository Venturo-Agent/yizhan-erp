'use client'

import React, { useRef } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { DailyImage } from '../../types'
import { DAILY_IMAGES_LABELS } from './constants/labels'

// 工具函數：建立 DailyImage 物件
function _createDailyImage(url: string, position?: string): DailyImage {
  return { url, position: position || 'center' }
}

interface ImageUploadZoneProps {
  images: (string | DailyImage)[]
  isUploading: boolean
  uploadProgress: number
  isDragOver: boolean
  onDragOver: (isDragOver: boolean) => void
  onFileSelect: (files: FileList | File[]) => void
  onDrop: (e: React.DragEvent) => void
}

export function ImageUploadZone({
  images,
  isUploading,
  uploadProgress,
  isDragOver,
  onDragOver,
  onFileSelect,
  onDrop,
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 處理檔案選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files)
    }
    e.target.value = ''
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${
        isDragOver
          ? 'border-morandi-gold bg-morandi-gold/10'
          : 'border-morandi-container bg-morandi-container/10'
      }`}
      onDragOver={e => {
        e.preventDefault()
        e.stopPropagation()
        onDragOver(true)
      }}
      onDragLeave={e => {
        e.preventDefault()
        e.stopPropagation()
        onDragOver(false)
      }}
      onDrop={onDrop}
    >
      {/* 上傳按鈕區 */}
      <div
        className={`flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-morandi-container/20 rounded-lg transition-colors ${
          images.length > 0 ? 'border-t border-morandi-container/50 mt-2 pt-4' : ''
        }`}
        onClick={() => {
          fileInputRef.current?.click()
        }}
      >
        {isUploading ? (
          <>
            <Loader2 size="2em" className="text-morandi-gold animate-spin mb-2" />
            <span className="text-sm text-morandi-secondary">上傳中... {uploadProgress}%</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg [background:var(--btn-primary-bg)] [color:var(--btn-primary-fg)] [border-color:var(--btn-primary-border)] border font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]">
              <Plus size="1.125em" />
              <span className="text-sm font-medium">{DAILY_IMAGES_LABELS.UPLOADING_5213}</span>
            </div>
            <span className="text-xs text-morandi-secondary mt-2">
              {DAILY_IMAGES_LABELS.LABEL_3185}
            </span>
          </>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
