'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Attraction, AttractionFormData } from '../_types'
import { supabase } from '@/lib/supabase/client'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'

export type ImagePosition = 'top' | 'center' | 'bottom'

interface UseAttractionFormProps {
  attraction?: Attraction | null
  initialFormData: AttractionFormData
  open: boolean
}

export function useAttractionForm({ attraction, initialFormData, open }: UseAttractionFormProps) {
  const t = useTranslations('library')
  const [formData, setFormData] = useState<AttractionFormData>(initialFormData)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [imagePositions, setImagePositions] = useState<Record<string, ImagePosition>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // 解析 notes 中儲存的圖片位置資訊
  const parseImagePositions = (notes: string | undefined): Record<string, ImagePosition> => {
    if (!notes) return {}
    const match = notes.match(/\[IMAGE_POSITIONS:(.*?)\]/)
    if (!match) return {}
    try {
      return JSON.parse(match[1])
    } catch {
      return {}
    }
  }

  // 將圖片位置資訊合併到 notes
  const mergePositionsToNotes = (
    notes: string,
    positions: Record<string, ImagePosition>
  ): string => {
    const cleanNotes = notes.replace(/\[IMAGE_POSITIONS:.*?\]/g, '').trim()
    if (Object.keys(positions).length === 0) return cleanNotes
    const positionStr = `[IMAGE_POSITIONS:${JSON.stringify(positions)}]`
    return cleanNotes ? `${cleanNotes}\n${positionStr}` : positionStr
  }

  // 編輯模式：載入景點資料
  useEffect(() => {
    if (attraction) {
      setFormData({
        name: attraction.name || '',
        english_name: attraction.english_name || '',
        description: attraction.description || '',
        country_id: attraction.country_id || '',
        region_id: attraction.region_id || '',
        city_id: attraction.city_id || '',
        category: attraction.category || t('attractionsFormHookDefaultCategory'),
        tags: attraction.tags?.join(', ') || '',
        duration_minutes: attraction.duration_minutes || 60,
        address: attraction.address || '',
        phone: attraction.phone || '',
        website: attraction.website || '',
        images: attraction.images?.join(', ') || '',
        notes: attraction.notes || '',
        is_active: attraction.is_active,
        // AI 補充欄位
        latitude: attraction.latitude,
        longitude: attraction.longitude,
        ticket_price: attraction.ticket_price || '',
        opening_hours: typeof attraction.opening_hours === 'string' ? attraction.opening_hours : '',
      })
      setUploadedImages(attraction.images || [])
      setImagePositions(parseImagePositions(attraction.notes))
    } else {
      setFormData(initialFormData)
      setUploadedImages([])
      setImagePositions({})
    }
  }, [attraction, initialFormData])

  // 上傳多個檔案
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    try {
      const newUrls: string[] = []

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `attractions/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('workspace-files')
          .upload(filePath, file)

        if (uploadError) {
          logger.error('上傳失敗:', uploadError)
          continue
        }

        const { data } = supabase.storage.from('workspace-files').getPublicUrl(filePath)
        newUrls.push(data.publicUrl)
      }

      if (newUrls.length > 0) {
        const allImages = [...uploadedImages, ...newUrls]
        setUploadedImages(allImages)
        setFormData(prev => ({ ...prev, images: allImages.join(', ') }))
      }
    } finally {
      setIsUploading(false)
    }
  }

  // 從 URL 下載並上傳圖片
  const fetchAndUploadImage = async (imageUrl: string) => {
    setIsUploading(true)
    try {
      const response = await fetch('/api/fetch-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      })

      let blob: Blob
      if (response.ok) {
        blob = await response.blob()
      } else {
        const directResponse = await fetch(imageUrl, { mode: 'cors' })
        if (!directResponse.ok) throw new Error(t('attractionsFormHookCannotDownload'))
        blob = await directResponse.blob()
      }

      if (!blob.type.startsWith('image/')) {
        throw new Error(t('attractionsFormHookUrlNotImage'))
      }

      const file = new File([blob], 'dragged-image.jpg', { type: blob.type || 'image/jpeg' })
      await uploadFiles([file])
    } catch (error) {
      logger.error('下載圖片失敗:', error)
      void alert(t('attractionsFormHookCannotDownloadUrl'), 'warning')
    } finally {
      setIsUploading(false)
    }
  }

  // 全域拖曳事件監聽
  useEffect(() => {
    if (!open) return

    const handleGlobalDragOver = (e: DragEvent) => {
      if (dropZoneRef.current) {
        const rect = dropZoneRef.current.getBoundingClientRect()
        const isInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        if (isInside) {
          e.preventDefault()
          setIsDragOver(true)
        } else {
          setIsDragOver(false)
        }
      }
    }

    const handleGlobalDragLeave = () => {
      setIsDragOver(false)
    }

    const handleGlobalDrop = async (e: DragEvent) => {
      if (!dropZoneRef.current) return

      const rect = dropZoneRef.current.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (!isInside) return

      e.preventDefault()
      setIsDragOver(false)

      try {
        let imageUrl = ''
        const html = e.dataTransfer?.getData('text/html') || ''
        if (html) {
          const match = html.match(/<img[^>]+src="([^"]+)"/)
          if (match && match[1]) {
            imageUrl = match[1]
          }
        }

        if (!imageUrl) {
          const uriList = e.dataTransfer?.getData('text/uri-list') || ''
          if (uriList) {
            imageUrl = uriList.split('\n')[0]
          }
        }

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
          const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
          if (imageFiles.length > 0) {
            await uploadFiles(imageFiles)
            return
          }
        }

        if (imageUrl) {
          await fetchAndUploadImage(imageUrl)
        }
      } catch (err) {
        logger.error('[useAttractionForm] handleGlobalDrop', err)
      }
    }

    window.addEventListener('dragover', handleGlobalDragOver, true)
    window.addEventListener('dragleave', handleGlobalDragLeave, true)
    window.addEventListener('drop', handleGlobalDrop, true)

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver, true)
      window.removeEventListener('dragleave', handleGlobalDragLeave, true)
      window.removeEventListener('drop', handleGlobalDrop, true)
    }
  }, [open, uploadedImages])

  return {
    formData,
    setFormData,
    isUploading,
    uploadedImages,
    setUploadedImages,
    imagePositions,
    setImagePositions,
    isDragOver,
    setIsDragOver,
    fileInputRef,
    dropZoneRef,
    mergePositionsToNotes,
    uploadFiles,
    fetchAndUploadImage,
  }
}
