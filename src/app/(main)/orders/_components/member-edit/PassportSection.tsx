'use client'
/**
 * PassportSection - 護照圖片編輯區塊
 */

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Upload, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { syncPassportImageToMembers } from '@/lib/utils/sync-passport-image'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'
import { deletePassportImage } from '@/lib/passport-storage'
import type { OrderMember } from '../../_types/order-member.types'

interface PassportSectionProps {
  editingMember: OrderMember | null
  editMode: 'edit' | 'verify'
  isRecognizing: boolean
  onMemberChange: (member: OrderMember) => void
  onRecognize: () => Promise<void>
  onUploadPassport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDropFile?: (file: File) => Promise<void>
}

export function PassportSection({
  editingMember,
  editMode,
  isRecognizing,
  onMemberChange,
  onRecognize,
  onUploadPassport,
  onDropFile,
}: PassportSectionProps) {
  const t = useTranslations()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const displayUrl = usePassportImageUrl(editingMember?.passport_image_url)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (onDropFile) setIsDragging(true)
    },
    [onDropFile]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (!onDropFile) return
      const file = e.dataTransfer.files?.[0]
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        void onDropFile(file)
      }
    },
    [onDropFile]
  )

  // 圖片編輯器存檔（不做裁切）
  const handleEditorSave = (_settings: ImageEditorSettings) => {
    // 護照不需要保存位置設定
  }

  // 圖片編輯器裁切並存檔
  const handleEditorCropAndSave = async (blob: Blob, _settings: ImageEditorSettings) => {
    if (!editingMember) return

    try {
      const oldUrl = editingMember.passport_image_url

      // 上傳裁切後的圖片，DB 只存 bare filename（顯示時才動態簽 15 分鐘 URL）
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `passport_${Date.now()}_${random}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(fileName, blob, { upsert: true })

      if (uploadError) throw uploadError

      // 更新成員資料（存 bare filename、不存 URL）
      await supabase
        .from('order_members')
        .update({ passport_image_url: fileName })
        .eq('id', editingMember.id)

      // 如果成員有關聯顧客，同步護照照片
      if (editingMember.customer_id) {
        await supabase
          .from('customers')
          .update({ passport_image_url: fileName })
          .eq('id', editingMember.customer_id)
        await syncPassportImageToMembers(editingMember.customer_id, fileName)
      }

      // 刪除舊照片（接受完整 URL 或 bare filename）
      await deletePassportImage(oldUrl)

      // 更新本地狀態
      onMemberChange({ ...editingMember, passport_image_url: fileName })

      toast.success(t('passport.imageSaved'))
      setIsEditorOpen(false)
    } catch (error) {
      logger.error('Failed to save edited image:', error)
      toast.error(t('messages.saveFailed'))
    }
  }

  return (
    <>
      <div className="space-y-3">
        {/* 標題與工具 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-morandi-primary">{t('passport.image')}</h3>
          {editingMember?.passport_image_url && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="soft-gold"
                size="xs"
                onClick={() => setIsEditorOpen(true)}
                className="px-2 py-1 text-xs gap-1.5"
              >
                <Pencil size={12} />
                {t('passport.editImage')}
              </Button>
              <Button
                type="button"
                variant="soft-gold"
                size="xs"
                onClick={onRecognize}
                disabled={isRecognizing}
                className="px-2 py-1 text-xs gap-1.5"
              >
                <RefreshCw size={12} className={isRecognizing ? 'animate-spin' : ''} />
                {isRecognizing ? t('passport.recognizing') : t('passport.reRecognize')}
              </Button>
            </div>
          )}
        </div>

        {/* 圖片容器 */}
        {editingMember?.passport_image_url ? (
          <div
            className="relative overflow-hidden rounded-lg border bg-muted group cursor-pointer"
            style={{ height: '320px' }}
            onClick={() => setIsEditorOpen(true)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <img
              src={displayUrl ?? ''}
              alt={t('passport.image')}
              className="w-full h-full object-contain"
              draggable={false}
            />
            {/* 拖曳提示覆蓋層 */}
            {isDragging && (
              <div className="absolute inset-0 bg-morandi-gold/20 border-2 border-dashed border-morandi-gold rounded-lg flex items-center justify-center z-10">
                <span className="text-morandi-gold text-sm font-medium">
                  {t('passport.dropHere')}
                </span>
              </div>
            )}
            {/* 重新上傳按鈕 */}
            <label
              htmlFor="edit-passport-upload"
              className="absolute bottom-2 right-2 p-2 bg-card/90 hover:bg-card rounded-lg cursor-pointer shadow-sm border"
              title={t('passport.reupload')}
              onClick={e => e.stopPropagation()}
            >
              <Upload size={16} className="text-morandi-gold" />
              <input
                id="edit-passport-upload"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={onUploadPassport}
              />
            </label>
            {/* 編輯提示 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">{t('passport.clickToEdit')}</span>
            </div>
          </div>
        ) : (
          <label
            htmlFor="edit-passport-upload"
            className={`w-full h-48 bg-morandi-container/30 rounded-lg flex flex-col items-center justify-center text-morandi-primary border-2 border-dashed cursor-pointer transition-all ${isDragging ? 'border-morandi-gold bg-morandi-gold/5' : 'border-morandi-secondary/30 hover:border-morandi-gold hover:bg-morandi-gold/5'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={32} className="mb-2 opacity-50" />
            <span className="text-sm">{t('passport.upload')}</span>
            <span className="text-xs mt-1 opacity-70">JPG, PNG, PDF</span>
            <input
              id="edit-passport-upload"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={onUploadPassport}
            />
          </label>
        )}

        {/* 驗證模式提示 */}
        {editMode === 'verify' && (
          <div className="bg-status-warning-bg border border-morandi-gold/30 rounded-lg p-3">
            <p className="text-xs text-morandi-gold">{t('order.verifyMemberNote')}</p>
          </div>
        )}
      </div>

      {/* 圖片編輯器 */}
      {editingMember?.passport_image_url && displayUrl && (
        <ImageEditor
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          imageSrc={displayUrl}
          onSave={handleEditorSave}
          onCropAndSave={handleEditorCropAndSave}
        />
      )}
    </>
  )
}
