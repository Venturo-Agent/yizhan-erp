'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FormDialog } from '@/components/dialog'
import { Attraction, AttractionFormData } from '../_types'
import type { Country, Region, City } from '@/stores/region-store'
import { prompt, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { useAttractionForm } from '../_hooks/useAttractionForm'
import { StatusBadge } from '@/components/ui/status-badge'
import { AttractionForm } from './attraction-dialog/AttractionForm'
import { AttractionImageUpload } from './attraction-dialog/AttractionImageUpload'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Trash2} from 'lucide-react'
import { updateAttraction } from '@/data'
import { toast } from 'sonner'

import { Spinner } from '@/components/ui/spinner'
const COMPONENT_LABELS = {
  TOAST_VERIFIED: '已標記為已驗證',
  TOAST_VERIFY_FAILED: '標記失敗，請稍後再試',
  TOAST_DELETE_FAILED: '刪除失敗，請稍後再試',
} as const

interface AttractionsDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (formData: AttractionFormData) => Promise<{ success: boolean }>
  attraction?: Attraction | null
  countries: Country[]
  regions: Region[]
  cities: City[]
  getRegionsByCountry: (countryId: string) => Region[]
  getCitiesByCountry: (countryId: string) => City[]
  getCitiesByRegion: (regionId: string) => City[]
  initialFormData: AttractionFormData
  /** 固定分類（用於飯店/餐廳 tab，影響標題顯示） */
  fixedCategory?: string
  /** 刪除景點（僅編輯時可用） */
  onDelete?: (id: string) => Promise<{ success: boolean; cancelled?: boolean }>
}

export function AttractionsDialog({
  open,
  onClose,
  onSubmit,
  attraction,
  countries,
  regions: _regions,
  cities: _cities,
  getRegionsByCountry,
  getCitiesByCountry,
  getCitiesByRegion,
  initialFormData,
  fixedCategory,
  onDelete,
}: AttractionsDialogProps) {
  const t = useTranslations('library')
  const { can } = useCapabilities()
  const readOnly = !!attraction && !can(CAPABILITIES.DATABASE_MANAGE_ATTRACTIONS)

  const {
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
  } = useAttractionForm({ attraction, initialFormData, open })

  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(attraction?.data_verified ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 標記已驗證
  const handleMarkVerified = async () => {
    if (!attraction?.id) return

    setIsVerifying(true)
    try {
      await updateAttraction(attraction.id, { data_verified: true })
      setIsVerified(true)
      toast.success(COMPONENT_LABELS.TOAST_VERIFIED)
    } catch (err) {
      logger.error('標記已驗證失敗:', err)
      toast.error(COMPONENT_LABELS.TOAST_VERIFY_FAILED)
    } finally {
      setIsVerifying(false)
    }
  }

  const [isDeleting, setIsDeleting] = useState(false)

  // 刪除景點（onDelete 內部已包含確認對話框）
  const handleDelete = async () => {
    if (!attraction?.id || !onDelete) return

    setIsDeleting(true)
    try {
      const result = await onDelete(attraction.id)
      if (result.success) {
        onClose()
      }
    } catch (err) {
      logger.error('刪除景點失敗:', err)
      toast.error(COMPONENT_LABELS.TOAST_DELETE_FAILED)
    } finally {
      setIsDeleting(false)
    }
  }

  // 上傳圖片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      void alert(t('attractionsDialogSelectImage'), 'warning')
      return
    }

    await uploadFiles(imageFiles)

    // 清空 input，讓同一檔案可以再次上傳
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 移除圖片
  const handleRemoveImage = (indexToRemove: number) => {
    const removedUrl = uploadedImages[indexToRemove]
    const newImages = uploadedImages.filter((_, index) => index !== indexToRemove)
    setUploadedImages(newImages)
    setFormData(prev => ({ ...prev, images: newImages.join(', ') }))

    // 同時移除該圖片的位置設定
    if (removedUrl) {
      setImagePositions(prev => {
        const newPositions = { ...prev }
        delete newPositions[removedUrl]
        return newPositions
      })
    }
  }

  // 更新圖片位置
  const handlePositionChange = (url: string, position: 'top' | 'center' | 'bottom') => {
    setImagePositions(prev => ({
      ...prev,
      [url]: position,
    }))
  }

  // 替換圖片（用於 AI 編輯後）
  const handleReplaceImage = (index: number, newUrl: string) => {
    const oldUrl = uploadedImages[index]
    const newImages = [...uploadedImages]
    newImages[index] = newUrl
    setUploadedImages(newImages)
    setFormData(prev => ({ ...prev, images: newImages.join(', ') }))

    // 如果舊圖片有位置設定，複製到新圖片
    if (oldUrl && imagePositions[oldUrl]) {
      setImagePositions(prev => {
        const newPositions = { ...prev }
        newPositions[newUrl] = prev[oldUrl]
        delete newPositions[oldUrl]
        return newPositions
      })
    }
  }

  // 新增網址圖片
  const handleAddUrlImage = async () => {
    const url = await prompt(t('attractionsDialogEnterUrl'), {
      title: t('attractionsDialogAddImage'),
      placeholder: 'https://...',
    })
    if (url && url.trim()) {
      const allImages = [...uploadedImages, url.trim()]
      setUploadedImages(allImages)
      setFormData(prev => ({ ...prev, images: allImages.join(', ') }))
    }
  }

  // 處理拖曳上傳
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 檢查 files
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        await uploadFiles(imageFiles)
        return
      }
    }

    // 檢查 items
    const items = e.dataTransfer.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            await uploadFiles([file])
            return
          }
        }
      }
    }

    // 從 HTML 解析圖片 URL
    const html = e.dataTransfer.getData('text/html')
    if (html) {
      const match = html.match(/<img alt=""[^>]+src="([^"]+)"/)
      if (match && match[1]) {
        await fetchAndUploadImage(match[1])
        return
      }
    }

    // 純 URL
    const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      await fetchAndUploadImage(imageUrl)
      return
    }

    void alert(t('attractionsDialogDragImage'), 'warning')
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const updatedNotes = mergePositionsToNotes(formData.notes, imagePositions)
      const result = await onSubmit({ ...formData, notes: updatedNotes })
      if (result.success) {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableRegions = formData.country_id ? getRegionsByCountry(formData.country_id) : []
  const availableCities = formData.region_id
    ? getCitiesByRegion(formData.region_id)
    : formData.country_id
      ? getCitiesByCountry(formData.country_id)
      : []

  // 自訂標題（含標記已驗證按鈕）
  const dialogTitle = (
    <div className="flex items-center gap-3">
      <span>
        {attraction
          ? `編輯${fixedCategory === '住宿' ? '飯店' : fixedCategory === '美食餐廳' ? '餐廳' : '景點'}`
          : fixedCategory === '住宿'
            ? '新增飯店'
            : fixedCategory === '美食餐廳'
              ? '新增餐廳'
              : t('attractionsDialogAdd')}
      </span>
      {/* 待驗證警示 + 標記按鈕 */}
      {attraction && !isVerified && (
        <Button
          type="button"
          variant="soft-gold"
          size="sm"
          onClick={handleMarkVerified}
          disabled={isVerifying}
          className="h-7 text-xs gap-1.5 text-morandi-gold border-morandi-gold bg-morandi-gold/10 hover:bg-morandi-gold/10"
        >
          {isVerifying ? (
            <Spinner size="sm" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {t('attractionsDialogMarkVerified')}
        </Button>
      )}
      {/* 已驗證標示 */}
      {attraction && isVerified && <StatusBadge tone="success" label="已驗證" />}
      {attraction && onDelete && can(CAPABILITIES.DATABASE_MANAGE_ATTRACTIONS) && (
        <Button
          type="button"
          variant="soft-gold"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-7 text-xs gap-1.5 text-status-danger border-status-danger/50 hover:bg-status-danger/10"
        >
          {isDeleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
          {t('attractionsDialogDelete')}
        </Button>
      )}
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={open => !open && onClose()}
      title={dialogTitle}
      onSubmit={handleSubmit}
      submitLabel={attraction ? '更新' : t('attractionsDialogAddBtn')}
      loading={isSubmitting}
      submitDisabled={readOnly || !formData.name || !formData.country_id || isSubmitting}
      maxWidth="5xl"
      contentClassName=""
    >
      <AttractionForm
        formData={formData}
        countries={countries}
        availableRegions={availableRegions}
        availableCities={availableCities}
        onFormDataChange={setFormData}
        readOnly={readOnly}
      >
        <AttractionImageUpload
          fileInputRef={fileInputRef}
          dropZoneRef={dropZoneRef}
          isUploading={isUploading}
          uploadedImages={uploadedImages}
          imagePositions={imagePositions}
          isDragOver={isDragOver}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onPositionChange={handlePositionChange}
          onAddUrlImage={handleAddUrlImage}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onReplaceImage={handleReplaceImage}
        />
      </AttractionForm>
    </FormDialog>
  )
}
