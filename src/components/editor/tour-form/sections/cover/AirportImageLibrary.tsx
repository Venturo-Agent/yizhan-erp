'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useAirportImages, createAirportImage, deleteAirportImage } from '@/data'
import { ImageUploader } from '@/components/ui/image-uploader'
import { UnsplashSearch } from '@/components/ui/image-uploader/UnsplashSearch'
import { PexelsPicker } from '@/components/shared/PexelsPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, Upload, Search, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import type { AirportImage } from '@/stores/types'
import type { ImagePositionSettings } from '@/components/ui/image-position-editor'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

const COMPONENT_LABELS = {
  SELECTED_COVER_HINT: '已選封面（hover 顯示調整按鈕）',
  OR_FROM_GALLERY: '或從圖庫搜尋',
} as const

interface AirportImageLibraryProps {
  airportCode: string
  selectedImage?: string
  onImageSelect: (url: string) => void
  onImageUpload: (url: string) => void
  position?: ImagePositionSettings
  onPositionChange?: (pos: ImagePositionSettings) => void
}

export function AirportImageLibrary({
  airportCode,
  selectedImage,
  onImageSelect,
  onImageUpload,
  position,
  onPositionChange,
}: AirportImageLibraryProps) {
  const { user } = useAuthStore()
  const { items: allImages, loading } = useAirportImages()
  const create = createAirportImage
  const deleteImage = deleteAirportImage

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showUnsplashDialog, setShowUnsplashDialog] = useState(false)
  const [showPexelsDialog, setShowPexelsDialog] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageLabel, setNewImageLabel] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // 過濾出該機場的圖片
  const airportImages = useMemo(() => {
    if (!airportCode) return []
    return allImages
      .filter(img => img.airport_code === airportCode)
      .sort((a, b) => a.display_order - b.display_order)
  }, [allImages, airportCode])

  // 處理上傳新圖片（Dialog 內）
  const handleUploadComplete = useCallback((url: string) => {
    setNewImageUrl(url)
  }, [])

  // 🎯 直接上傳 → 自動存到 airport_images 表
  const _handleDirectUpload = useCallback(
    async (url: string) => {
      logger.log('[AirportImageLibrary] 🎯 直接上傳，自動存到圖片庫')
      logger.log('[AirportImageLibrary] - url:', url)
      logger.log('[AirportImageLibrary] - airportCode:', airportCode)

      if (!url || !airportCode) {
        // 沒有 airportCode 時，直接設定封面（舊行為）
        onImageUpload(url)
        return
      }

      try {
        const newImage: Partial<AirportImage> = {
          airport_code: airportCode,
          image_url: url,
          label: null,
          is_default: airportImages.length === 0,
          display_order: airportImages.length,
          uploaded_by: user?.id || null,
          workspace_id: user?.workspace_id || null,
        }

        logger.log('[AirportImageLibrary] 📤 自動存到 airport_images:', newImage)
        await create(newImage as Omit<AirportImage, 'id' | 'created_at' | 'updated_at'>)
        logger.log('[AirportImageLibrary] ✅ 存檔成功')

        // 同時更新封面
        onImageUpload(url)
        logger.log('[AirportImageLibrary] 🎉 直接上傳完成！')
      } catch (error) {
        logger.error('[AirportImageLibrary] ❌ 存到圖片庫失敗:', error)
        // 失敗時仍然設定封面
        onImageUpload(url)
      }
    },
    [airportCode, airportImages.length, user, create, onImageUpload]
  )

  // 儲存新圖片到圖片庫
  const handleSaveNewImage = useCallback(async () => {
    logger.log('[AirportImageLibrary] 🎯 開始儲存圖片到圖片庫')
    logger.log('[AirportImageLibrary] - newImageUrl:', newImageUrl)
    logger.log('[AirportImageLibrary] - airportCode:', airportCode)
    logger.log('[AirportImageLibrary] - newImageLabel:', newImageLabel)

    if (!newImageUrl || !airportCode) {
      logger.warn('[AirportImageLibrary] ❌ 缺少必要參數，取消儲存')
      return
    }

    setIsUploading(true)
    try {
      const newImage: Partial<AirportImage> = {
        airport_code: airportCode,
        image_url: newImageUrl,
        label: newImageLabel || null,
        is_default: airportImages.length === 0,
        display_order: airportImages.length,
        uploaded_by: user?.id || null,
        workspace_id: user?.workspace_id || null,
      }

      logger.log('[AirportImageLibrary] 📤 呼叫 create():', newImage)
      await create(newImage as Omit<AirportImage, 'id' | 'created_at' | 'updated_at'>)
      logger.log('[AirportImageLibrary] ✅ create() 成功')

      setNewImageUrl('')
      setNewImageLabel('')
      setShowAddDialog(false)

      logger.log('[AirportImageLibrary] 📢 呼叫 onImageUpload:', newImageUrl)
      onImageUpload(newImageUrl)
      logger.log('[AirportImageLibrary] 🎉 儲存完成！')
    } catch (error) {
      logger.error('[AirportImageLibrary] ❌ 儲存圖片失敗:', error)
    } finally {
      setIsUploading(false)
    }
  }, [newImageUrl, newImageLabel, airportCode, airportImages.length, user, create, onImageUpload])

  // 刪除圖片
  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      try {
        await deleteImage(imageId)
      } catch (error) {
        logger.error(COMP_EDITOR_LABELS.刪除圖片失敗, error)
      }
    },
    [deleteImage]
  )

  if (!airportCode) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-morandi-primary">
          {COMP_EDITOR_LABELS.封面圖片}
        </label>
        <div className="text-sm text-morandi-secondary p-4 bg-morandi-container/30 rounded-lg text-center">
          {COMP_EDITOR_LABELS.SELECT_6587}
        </div>
        <ImageUploader
          value={selectedImage}
          onChange={onImageUpload}
          position={position}
          onPositionChange={onPositionChange}
          bucket="city-backgrounds"
          filePrefix="itinerary"
          previewHeight="112px"
          aspectRatio={16 / 9}
          placeholder={COMP_EDITOR_LABELS.或直接上傳圖片}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-morandi-primary">
          {COMP_EDITOR_LABELS.封面圖片}{' '}
          <span className="text-morandi-secondary font-normal">({airportCode})</span>
        </label>
        <Button
          type="button"
          size="sm"
          variant="soft-gold"
          onClick={() => setShowAddDialog(true)}
          className="h-7 px-2 text-xs"
        >
          <Plus size="0.875em" className="mr-1" />
          {COMP_EDITOR_LABELS.新增}
        </Button>
      </div>

      {/* 🎯 已選封面 - 可調整位置 */}
      {selectedImage && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-[0.6875rem] text-morandi-secondary mb-2">
            <span>{COMPONENT_LABELS.SELECTED_COVER_HINT}</span>
          </div>
          <ImageUploader
            value={selectedImage}
            onChange={onImageUpload}
            position={position}
            onPositionChange={onPositionChange}
            bucket="city-backgrounds"
            filePrefix={`airport/${airportCode}`}
            previewHeight="140px"
            aspectRatio={16 / 9}
            placeholder=""
            showPositionEditor={true}
          />
        </div>
      )}

      {/* 圖片網格 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-morandi-gold" />
        </div>
      ) : airportImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {airportImages.map(image => (
            <div
              key={image.id}
              role="button"
              tabIndex={0}
              onClick={() => onImageSelect(image.image_url)}
              onKeyDown={e => e.key === 'Enter' && onImageSelect(image.image_url)}
              className={cn(
                'relative group overflow-hidden rounded-lg border-2 transition-all aspect-video cursor-pointer',
                selectedImage === image.image_url
                  ? 'border-morandi-gold ring-2 ring-morandi-gold/30'
                  : 'border-morandi-container hover:border-morandi-gold/50'
              )}
            >
              <img
                src={image.image_url}
                alt={image.label || COMP_EDITOR_LABELS.封面圖片}
                className="w-full h-full object-cover"
              />

              {image.label && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <p className="text-white text-[0.625rem] truncate">{image.label}</p>
                </div>
              )}

              {selectedImage === image.image_url && (
                <div className="absolute top-1 right-1 bg-morandi-gold text-white text-[0.625rem] px-1.5 py-0.5 rounded">
                  ✓
                </div>
              )}

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  handleDeleteImage(image.id)
                }}
                className="absolute top-1 left-1 bg-status-danger/80 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size="0.75em" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-morandi-secondary p-4 bg-morandi-container/30 rounded-lg text-center">
          {COMP_EDITOR_LABELS.EMPTY_3148}
        </div>
      )}

      {/* 移除三個入口，統一用「新增」按鈕 */}

      {/* 新增圖片對話框 - 整合上傳 + Unsplash + Pexels */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent level={2} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {COMP_EDITOR_LABELS.ADD_6489} {airportCode}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 上傳區 */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-morandi-primary mb-2">
                <Upload size="0.875em" />
                上傳圖片
              </div>
              <ImageUploader
                value={newImageUrl}
                onChange={handleUploadComplete}
                bucket="city-backgrounds"
                filePrefix={`airport/${airportCode}`}
                previewHeight="100px"
                aspectRatio={16 / 9}
                placeholder={COMP_EDITOR_LABELS.上傳圖片}
              />
            </div>

            {/* 或分隔線 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-morandi-container" />
              <span className="text-xs text-morandi-secondary">
                {COMPONENT_LABELS.OR_FROM_GALLERY}
              </span>
              <div className="flex-1 h-px bg-morandi-container" />
            </div>

            {/* Unsplash + Pexels 按鈕 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="soft-gold"
                onClick={() => {
                  setShowAddDialog(false)
                  setShowUnsplashDialog(true)
                }}
                className="h-16 border-dashed border-2 hover:border-morandi-gold/50 hover:bg-morandi-gold/5"
              >
                <div className="flex flex-col items-center gap-1">
                  <Search size="1.125em" className="text-morandi-secondary" />
                  <span className="text-xs">Unsplash</span>
                </div>
              </Button>
              <Button
                type="button"
                variant="soft-gold"
                onClick={() => {
                  setShowAddDialog(false)
                  setShowPexelsDialog(true)
                }}
                className="h-16 border-dashed border-2 hover:border-morandi-green/50 hover:bg-morandi-green/100/5"
              >
                <div className="flex flex-col items-center gap-1">
                  <Search size="1.125em" className="text-morandi-secondary" />
                  <span className="text-xs">Pexels</span>
                </div>
              </Button>
            </div>

            {/* 標籤和按鈕 */}
            {newImageUrl && (
              <>
                <div>
                  <label className="block text-sm font-medium text-morandi-primary mb-1">
                    {COMP_EDITOR_LABELS.LABEL_9093}
                  </label>
                  <Input
                    value={newImageLabel}
                    onChange={e => setNewImageLabel(e.target.value)}
                    placeholder={COMP_EDITOR_LABELS.如_春季_夏季_寺廟}
                    className="h-9"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="soft-gold"
                    onClick={() => {
                      setShowAddDialog(false)
                      setNewImageUrl('')
                      setNewImageLabel('')
                    }}
                    className="flex-1"
                  >
                    {COMP_EDITOR_LABELS.取消}
                  </Button>
                  <Button
                    variant="morandi-gold"
                    type="button"
                    onClick={handleSaveNewImage}
                    disabled={!newImageUrl || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <Loader2 size="0.875em" className="animate-spin" />
                    ) : (
                      <>
                        <CheckSquare size="0.875em" />
                        {COMP_EDITOR_LABELS.加入圖片庫}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsplash 搜尋對話框 */}
      <Dialog open={showUnsplashDialog} onOpenChange={setShowUnsplashDialog}>
        <DialogContent level={2} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search size="1.125em" />
              Unsplash 免費圖庫
            </DialogTitle>
          </DialogHeader>

          <UnsplashSearch
            onSelect={url => {
              onImageUpload(url)
              setShowUnsplashDialog(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Pexels 搜尋對話框 */}
      <Dialog open={showPexelsDialog} onOpenChange={setShowPexelsDialog}>
        <DialogContent level={2} className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search size="1.125em" />
              Pexels 免費圖庫
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
            <PexelsPicker
              onSelectImage={url => {
                onImageUpload(url)
                setShowPexelsDialog(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
