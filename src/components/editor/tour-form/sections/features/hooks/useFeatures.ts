import { useState, useRef } from 'react'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import { alert } from '@/lib/ui/alert-dialog'
import { COMP_EDITOR_LABELS } from '../../../../constants/labels'

interface UploadingState {
  featureIndex: number
  imageIndex: number
}

interface DraggedImageState {
  featureIndex: number
  imageIndex: number
}

export function useFeatures() {
  const [uploadingImage, setUploadingImage] = useState<UploadingState | null>(null)
  const [draggedImage, setDraggedImage] = useState<DraggedImageState | null>(null)
  const [dragOverImage, setDragOverImage] = useState<DraggedImageState | null>(null)
  const [draggedFeature, setDraggedFeature] = useState<number | null>(null)
  const [dragOverFeature, setDragOverFeature] = useState<number | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // 上傳單張圖片
  const handleImageUpload = async (
    featureIndex: number,
    imageIndex: number,
    file: File,
    updateFeature: (index: number, field: string, value: string[]) => void,
    currentImages: string[]
  ) => {
    if (!file.type.startsWith('image/')) {
      void alert(COMP_EDITOR_LABELS.請選擇圖片檔案, 'warning')
      return
    }

    setUploadingImage({ featureIndex, imageIndex })

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `feature-${featureIndex}-${imageIndex}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `tour-feature-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, file)

      if (uploadError) {
        logger.error(COMP_EDITOR_LABELS.上傳失敗, uploadError)
        void alert(COMP_EDITOR_LABELS.圖片上傳失敗, 'error')
        return
      }

      const { data: urlData } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

      const newImages = [...currentImages]
      if (imageIndex >= newImages.length) {
        newImages.push(urlData.publicUrl)
      } else {
        newImages[imageIndex] = urlData.publicUrl
      }

      updateFeature(featureIndex, 'images', newImages)
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.上傳錯誤, error)
      void alert(COMP_EDITOR_LABELS.上傳過程發生錯誤, 'error')
    } finally {
      setUploadingImage(null)
    }
  }

  // 上傳多張圖片
  const handleMultipleImageUpload = async (
    featureIndex: number,
    files: FileList,
    updateFeature: (index: number, field: string, value: string[]) => void,
    currentImages: string[]
  ) => {
    const remainingSlots = 4 - currentImages.length

    if (remainingSlots <= 0) {
      void alert(COMP_EDITOR_LABELS.已達到最大圖片數量_4_張, 'warning')
      return
    }

    const imageFiles = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remainingSlots)

    if (imageFiles.length === 0) {
      void alert(COMP_EDITOR_LABELS.請選擇圖片檔案, 'warning')
      return
    }

    setUploadingImage({ featureIndex, imageIndex: currentImages.length })

    try {
      const uploadedUrls: string[] = []

      await Promise.all(
        imageFiles.map(async (file, idx) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `feature-${featureIndex}-${currentImages.length + idx}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
          const filePath = `tour-feature-images/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('workspace-files')
            .upload(filePath, file)

          if (uploadError) {
            logger.error(`上傳第 ${idx + 1} 張失敗:`, uploadError)
            return
          }

          const { data: urlData } = supabase.storage.from('workspace-files').getPublicUrl(filePath)

          uploadedUrls[idx] = urlData.publicUrl
        })
      )

      const successfulUrls = uploadedUrls.filter(Boolean)
      if (successfulUrls.length > 0) {
        updateFeature(featureIndex, 'images', [...currentImages, ...successfulUrls])
      }

      if (successfulUrls.length < imageFiles.length) {
        void alert(
          `${successfulUrls.length} 張圖片上傳成功，${imageFiles.length - successfulUrls.length} 張失敗`,
          'warning'
        )
      }
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.批量上傳錯誤, error)
      void alert(COMP_EDITOR_LABELS.上傳過程發生錯誤, 'error')
    } finally {
      setUploadingImage(null)
    }
  }

  // 移除圖片
  const handleRemoveImage = (
    featureIndex: number,
    imageIndex: number,
    updateFeature: (index: number, field: string, value: string[]) => void,
    currentImages: string[]
  ) => {
    const newImages = [...currentImages]
    newImages.splice(imageIndex, 1)
    updateFeature(featureIndex, 'images', newImages)
  }

  // 圖片拖曳處理
  const handleImageDragStart = (featureIndex: number, imageIndex: number) => {
    setDraggedImage({ featureIndex, imageIndex })
  }

  const handleImageDragOver = (e: React.DragEvent, featureIndex: number, imageIndex: number) => {
    e.preventDefault()
    if (draggedImage && draggedImage.featureIndex === featureIndex) {
      setDragOverImage({ featureIndex, imageIndex })
    }
  }

  const handleImageDrop = (
    featureIndex: number,
    targetIndex: number,
    updateFeature: (index: number, field: string, value: string[]) => void,
    currentImages: string[]
  ) => {
    if (!draggedImage || draggedImage.featureIndex !== featureIndex) {
      setDraggedImage(null)
      setDragOverImage(null)
      return
    }

    const sourceIndex = draggedImage.imageIndex
    if (sourceIndex === targetIndex) {
      setDraggedImage(null)
      setDragOverImage(null)
      return
    }

    const newImages = [...currentImages]
    const [movedImage] = newImages.splice(sourceIndex, 1)
    newImages.splice(targetIndex, 0, movedImage)

    updateFeature(featureIndex, 'images', newImages)
    setDraggedImage(null)
    setDragOverImage(null)
  }

  const handleImageDragEnd = () => {
    setDraggedImage(null)
    setDragOverImage(null)
  }

  // 特色卡片拖曳處理
  const handleFeatureDragStart = (index: number) => {
    setDraggedFeature(index)
  }

  const handleFeatureDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedFeature !== null && draggedFeature !== index) {
      setDragOverFeature(index)
    }
  }

  const handleFeatureDrop = (
    targetIndex: number,
    reorderFeature: (from: number, to: number) => void
  ) => {
    if (draggedFeature !== null && draggedFeature !== targetIndex) {
      reorderFeature(draggedFeature, targetIndex)
    }
    setDraggedFeature(null)
    setDragOverFeature(null)
  }

  const handleFeatureDragEnd = () => {
    setDraggedFeature(null)
    setDragOverFeature(null)
  }

  return {
    uploadingImage,
    draggedImage,
    dragOverImage,
    draggedFeature,
    dragOverFeature,
    fileInputRefs,
    handleImageUpload,
    handleMultipleImageUpload,
    handleRemoveImage,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDrop,
    handleImageDragEnd,
    handleFeatureDragStart,
    handleFeatureDragOver,
    handleFeatureDrop,
    handleFeatureDragEnd,
  }
}
