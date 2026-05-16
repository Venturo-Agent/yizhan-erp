'use client'

import React, { useState } from 'react'
import { Move } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DailyImage } from '../types'
import { ThreeDPhotoWall } from '@/components/ui/3d-photo-wall'
import { ImageGrid } from './daily-images/ImageGrid'
import { ImageUploadZone } from './daily-images/ImageUploadZone'
import { ImagePreviewModal, ImagePositionEditor } from './daily-images/ImagePreviewDialog'
import { useImageUpload } from './daily-images/hooks/useImageUpload'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface DailyImagesUploaderProps {
  dayIndex: number
  images: (string | DailyImage)[]
  onImagesChange: (images: (string | DailyImage)[]) => void
  allTourImages?: string[]
}

// 工具函數：取得圖片 URL
function getImageUrl(image: string | DailyImage): string {
  return typeof image === 'string' ? image : image.url
}

// 工具函數：建立 DailyImage 物件
function createDailyImage(url: string, position?: string): DailyImage {
  return { url, position: position || 'center' }
}

export function DailyImagesUploader({
  dayIndex,
  images,
  onImagesChange,
  allTourImages = [],
}: DailyImagesUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const { isUploading, uploadProgress, handleMultipleUpload, uploadImageFromUrl } =
    useImageUpload(dayIndex)

  // 處理檔案選擇
  const handleFileSelect = async (files: FileList | File[]) => {
    const newImages = await handleMultipleUpload(files)
    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages])
    }
  }

  // 處理拖曳放置（支援本機檔案和網頁圖片 URL）
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 1. 優先嘗試從瀏覽器拖曳的圖片 URL
    const html = e.dataTransfer.getData('text/html')
    if (html) {
      const imgMatch = html.match(/<img alt=""[^>]+src=["']([^"']+)["']/i)
      if (imgMatch && imgMatch[1]) {
        const imageUrl = imgMatch[1]
        // 跳過 data: URL 和 blob: URL
        if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
          toast.info(COMP_EDITOR_LABELS.正在下載並上傳圖片)
          const uploadedUrl = await uploadImageFromUrl(imageUrl)
          if (uploadedUrl) {
            onImagesChange([...images, createDailyImage(uploadedUrl)])
            toast.success(COMP_EDITOR_LABELS.圖片已上傳)
          } else {
            toast.error(COMP_EDITOR_LABELS.圖片上傳失敗)
          }
          return
        }
      }
    }

    // 2. 嘗試從 URL 下載並上傳
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif']
      const lowerUrl = url.toLowerCase()
      const isImageUrl =
        imageExtensions.some(ext => lowerUrl.includes(ext)) ||
        lowerUrl.includes('image') ||
        lowerUrl.includes('photo') ||
        lowerUrl.includes('unsplash') ||
        lowerUrl.includes('imgur') ||
        lowerUrl.includes('pexels') ||
        lowerUrl.includes('pixabay') ||
        lowerUrl.includes('googleusercontent')

      if (isImageUrl) {
        toast.info(COMP_EDITOR_LABELS.正在下載並上傳圖片)
        const uploadedUrl = await uploadImageFromUrl(url)
        if (uploadedUrl) {
          onImagesChange([...images, createDailyImage(uploadedUrl)])
          toast.success(COMP_EDITOR_LABELS.圖片已上傳)
        } else {
          toast.error(COMP_EDITOR_LABELS.圖片上傳失敗)
        }
        return
      }
    }

    // 3. 處理本機檔案
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const realImageFiles = Array.from(files).filter(
        file => file.type.startsWith('image/') && file.size > 0
      )
      if (realImageFiles.length > 0) {
        handleFileSelect(realImageFiles)
        return
      }
    }

    // 4. 嘗試任何 URL（可能是圖片）
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      toast.info(COMP_EDITOR_LABELS.正在嘗試下載並上傳)
      const uploadedUrl = await uploadImageFromUrl(url)
      if (uploadedUrl) {
        onImagesChange([...images, createDailyImage(uploadedUrl)])
        toast.success(COMP_EDITOR_LABELS.圖片已上傳)
      } else {
        toast.error(COMP_EDITOR_LABELS.無法下載或上傳圖片)
      }
      return
    }

    toast.error(COMP_EDITOR_LABELS.無法識別拖曳的內容_請嘗試直接上傳檔案)
  }

  // 刪除圖片
  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  // 更新圖片位置
  const handleUpdatePosition = (index: number, position: string) => {
    const newImages = images.map((img, i) => {
      if (i !== index) return img
      const url = getImageUrl(img)
      return createDailyImage(url, position)
    })
    onImagesChange(newImages)
    setEditingIndex(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {COMP_EDITOR_LABELS.LABEL_6290}
          </label>
          <p className="text-xs text-morandi-secondary mt-1">
            點擊縮圖可預覽，點擊 <Move size="0.75em" className="inline" />{' '}
            {COMP_EDITOR_LABELS.LABEL_7764}
          </p>
        </div>
        <span className="text-xs text-morandi-secondary">{images.length} 張</span>
      </div>

      {/* 上傳區域 + 縮圖網格 */}
      <div>
        {/* 縮圖網格 */}
        <ImageGrid
          images={images}
          onImagesChange={onImagesChange}
          onRemoveImage={handleRemoveImage}
          onEditImage={setEditingIndex}
          onPreviewImage={setPreviewIndex}
        />

        {/* 上傳區域 */}
        <ImageUploadZone
          images={images}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isDragOver={isDragOver}
          onDragOver={setIsDragOver}
          onFileSelect={handleFileSelect}
          onDrop={handleDrop}
        />
      </div>

      {/* 位置編輯 Modal */}
      {editingIndex !== null && (
        <Dialog open onOpenChange={() => setEditingIndex(null)}>
          <DialogContent level={1} className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{COMP_EDITOR_LABELS.LABEL_636}</DialogTitle>
            </DialogHeader>
            <ImagePositionEditor
              image={images[editingIndex]}
              onSave={position => handleUpdatePosition(editingIndex, position)}
              onClose={() => setEditingIndex(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 預覽 - 如果有整個行程的照片就顯示照片牆，否則顯示單張預覽 */}
      {previewIndex !== null &&
        (allTourImages.length >= 4 ? (
          <ThreeDPhotoWall images={allTourImages} onClose={() => setPreviewIndex(null)} />
        ) : (
          <ImagePreviewModal
            images={images}
            currentIndex={previewIndex}
            onClose={() => setPreviewIndex(null)}
            onNavigate={setPreviewIndex}
          />
        ))}
    </div>
  )
}
