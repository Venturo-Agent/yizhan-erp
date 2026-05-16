'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { DailyImage } from '../../../types'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

// 工具函數：建立 DailyImage 物件
function createDailyImage(url: string, position?: string): DailyImage {
  return { url, position: position || 'center' }
}

export function useImageUpload(dayIndex: number) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  // 上傳多張圖片
  const handleMultipleUpload = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      return []
    }

    setIsUploading(true)
    setUploadProgress(0)

    const newImages: DailyImage[] = []
    let completed = 0

    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `day-${dayIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `tour-daily-images/${fileName}`

        const { data: _uploadData, error: uploadError } = await supabase.storage
          .from('workspace-files')
          .upload(filePath, file)

        if (uploadError) {
          logger.error(COMP_EDITOR_LABELS.DailyImagesUploader_上傳失敗, uploadError)
          toast.error(`圖片上傳失敗: ${uploadError.message}`)
          continue
        }

        const { data } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

        newImages.push(createDailyImage(data.publicUrl))
        completed++
        setUploadProgress(Math.round((completed / imageFiles.length) * 100))
      }

      return newImages
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.DailyImagesUploader_意外錯誤, error)
      toast.error(
        `上傳過程發生錯誤: ${error instanceof Error ? error.message : COMP_EDITOR_LABELS.未知錯誤}`
      )
      return []
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // 從 URL 下載圖片並上傳到 Supabase
  const uploadImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      setIsUploading(true)
      setUploadProgress(10)

      // 下載圖片
      let response: Response
      try {
        response = await fetch(imageUrl, { mode: 'cors' })
      } catch (_fetchError) {
        logger.error(COMP_EDITOR_LABELS.CORS_錯誤_無法下載此圖片, imageUrl)
        toast.error(COMP_EDITOR_LABELS.此網站不允許下載圖片_請改用右鍵另存圖片後上傳)
        return null
      }

      if (!response.ok) {
        toast.error(COMP_EDITOR_LABELS.無法下載圖片_請改用右鍵另存圖片後上傳)
        return null
      }

      setUploadProgress(40)
      const blob = await response.blob()

      // 檢查是否為有效圖片
      if (!blob.type.startsWith('image/') && blob.size === 0) {
        toast.error(COMP_EDITOR_LABELS.下載的內容不是有效圖片)
        return null
      }

      // 從 URL 或 content-type 判斷副檔名
      const contentType = blob.type || 'image/jpeg'
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/avif': 'avif',
      }
      const ext = extMap[contentType] || 'jpg'

      setUploadProgress(60)

      // 上傳到 Supabase
      const fileName = `day-${dayIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
      const filePath = `tour-daily-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, blob, { contentType })

      if (uploadError) {
        logger.error(COMP_EDITOR_LABELS.Supabase_上傳失敗, uploadError)
        toast.error(COMP_EDITOR_LABELS.上傳到伺服器失敗)
        return null
      }

      setUploadProgress(90)

      const { data } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

      setUploadProgress(100)
      return data.publicUrl
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : COMP_EDITOR_LABELS.未知錯誤
      logger.error(COMP_EDITOR_LABELS.上傳圖片失敗, errorMessage)
      toast.error(`上傳失敗: ${errorMessage}`)
      return null
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return {
    isUploading,
    uploadProgress,
    handleMultipleUpload,
    uploadImageFromUrl,
  }
}
