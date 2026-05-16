'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { alert } from '@/lib/ui/alert-dialog'
import { ImagePositionEditor, ImagePositionSettings } from '../image-position-editor'
import { logger } from '@/lib/utils/logger'
import { useImageUploader } from './useImageUploader'
import { DropZone } from './DropZone'
import { ImagePreview } from './ImagePreview'
import { IMAGE_UPLOADER_LABELS } from './constants/labels'

// 導出新組件




interface ImageUploaderProps {
  /** 當前圖片 URL */
  value?: string | null
  /** 圖片變更回調 */
  onChange: (url: string) => void
  /** 位置設定（選填） */
  position?: ImagePositionSettings | null
  /** 位置變更回調（選填） */
  onPositionChange?: (position: ImagePositionSettings) => void
  /** Storage bucket 名稱 */
  bucket?: string
  /** 檔名前綴 */
  filePrefix?: string
  /** 最大檔案大小 (bytes)，預設 5MB */
  maxSize?: number
  /** 預覽寬高比，預設 16/9 */
  aspectRatio?: number
  /** 預覽高度 */
  previewHeight?: string
  /** 是否顯示位置調整按鈕 */
  showPositionEditor?: boolean
  /** 是否顯示刪除按鈕 */
  showDeleteButton?: boolean
  /** 自訂 className */
  className?: string
  /** 佔位文字 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 統一的圖片上傳組件
 * 支援：拖曳上傳、點擊上傳、預覽、位置調整
 */
export function ImageUploader({
  value,
  onChange,
  position,
  onPositionChange,
  bucket = 'city-backgrounds',
  filePrefix = 'upload',
  maxSize = 5 * 1024 * 1024,
  aspectRatio = 16 / 9,
  previewHeight = '120px',
  showPositionEditor = true,
  showDeleteButton = true,
  className,
  placeholder = '拖曳圖片到此處，或點擊上傳',
  disabled = false,
}: ImageUploaderProps) {
  const {
    uploading,
    isDragOver,
    showEditor,
    setShowEditor,
    fileInputRef,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDelete,
    handleClick,
    handlePositionConfirm,
  } = useImageUploader({
    value,
    onChange,
    position,
    onPositionChange,
    bucket,
    filePrefix,
    maxSize,
  })

  return (
    <div className={cn('space-y-2', className)}>
      {/* 隱藏的 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* 上傳區域 / 預覽 */}
      {value ? (
        <ImagePreview
          value={value}
          position={position}
          uploading={uploading}
          isDragOver={isDragOver}
          previewHeight={previewHeight}
          showPositionEditor={showPositionEditor}
          showDeleteButton={showDeleteButton}
          onPositionChange={onPositionChange}
          onDragOver={e => handleDragOver(e, disabled)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, disabled)}
          onUploadClick={() => handleClick(disabled, uploading)}
          onPositionClick={() => setShowEditor(true)}
          onDelete={handleDelete}
        />
      ) : (
        <DropZone
          uploading={uploading}
          isDragOver={isDragOver}
          disabled={disabled}
          previewHeight={previewHeight}
          placeholder={placeholder}
          maxSize={maxSize}
          onClick={() => handleClick(disabled, uploading)}
          onDragOver={e => handleDragOver(e, disabled)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, disabled)}
        />
      )}

      {/* 位置調整編輯器 */}
      {showPositionEditor && value && (
        <ImagePositionEditor
          open={showEditor}
          onClose={() => setShowEditor(false)}
          imageSrc={value}
          currentPosition={position}
          onConfirm={handlePositionConfirm}
          aspectRatio={aspectRatio}
          title={IMAGE_UPLOADER_LABELS.LABEL_318}
        />
      )}
    </div>
  )
}

/**
 * 多圖上傳組件
 * 用於每日行程圖片等需要多張圖片的場景
 */
interface MultiImageUploaderProps {
  /** 當前圖片 URL 列表 */
  value: string[]
  /** 圖片變更回調 */
  onChange: (urls: string[]) => void
  /** 最大圖片數量 */
  maxCount?: number
  /** Storage bucket 名稱 */
  bucket?: string
  /** 檔名前綴 */
  filePrefix?: string
  /** 最大檔案大小 (bytes) */
  maxSize?: number
  /** 預覽高度 */
  previewHeight?: string
  /** 自訂 className */
  className?: string
  /** 是否禁用 */
  disabled?: boolean
}

function _MultiImageUploader({
  value = [],
  onChange,
  maxCount = 10,
  bucket = 'city-backgrounds',
  filePrefix = 'multi',
  maxSize = 5 * 1024 * 1024,
  previewHeight = '80px',
  className,
  disabled = false,
}: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 上傳檔案
  const uploadFile = async (file: File): Promise<string | null> => {
    if (file.size > maxSize) {
      void alert(`檔案太大！請選擇小於 ${Math.round(maxSize / 1024 / 1024)}MB 的圖片`, 'warning')
      return null
    }

    if (!file.type.startsWith('image/')) {
      return null
    }

    try {
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${filePrefix}_${timestamp}_${randomStr}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
      return urlData.publicUrl
    } catch (error) {
      logger.error('上傳失敗:', error)
      return null
    }
  }

  // 處理多檔案選擇
  const handleFilesSelect = async (files: FileList) => {
    if (value.length >= maxCount) {
      void alert(`最多只能上傳 ${maxCount} 張圖片`, 'warning')
      return
    }

    const remainingSlots = maxCount - value.length
    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    setUploading(true)
    const newUrls: string[] = []

    for (const file of filesToUpload) {
      const url = await uploadFile(file)
      if (url) {
        newUrls.push(url)
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls])
    }

    setUploading(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      void handleFilesSelect(files)
    }
    event.target.value = ''
  }

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        void handleFilesSelect(files)
      }
    },
    [disabled, value.length, maxCount]
  )

  const handleRemove = async (index: number) => {
    const urlToRemove = value[index]
    const newUrls = value.filter((_, i) => i !== index)
    onChange(newUrls)

    // 嘗試刪除 storage 中的圖片
    const fileName = urlToRemove.match(new RegExp(`${bucket}/([^?]+)`))?.[1]
    if (fileName?.startsWith(filePrefix)) {
      try {
        await supabase.storage.from(bucket).remove([fileName])
      } catch (err) {
        logger.error('刪除圖片失敗:', err)
      }
    }
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* 已上傳的圖片 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden border border-morandi-container"
              style={{ width: previewHeight, height: previewHeight }}
            >
              <img src={url} alt={`圖片 ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-status-danger rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size="0.75em" className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上傳區域 */}
      {value.length < maxCount && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 px-4',
            isDragOver
              ? 'border-morandi-gold bg-morandi-gold/10'
              : 'border-morandi-container hover:border-morandi-gold/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{ height: previewHeight }}
        >
          {uploading ? (
            <Loader2 size="1.125em" className="animate-spin text-morandi-gold" />
          ) : (
            <>
              <Upload size="1.125em" className="text-morandi-secondary" />
              <span className="text-sm text-morandi-secondary">
                拖曳或點擊上傳 ({value.length}/{maxCount})
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
