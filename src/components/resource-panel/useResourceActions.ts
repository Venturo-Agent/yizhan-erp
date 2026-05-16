'use client'

import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { softDelete } from '@/lib/data/soft-delete'
import { confirm } from '@/lib/ui/alert-dialog'

const LABELS = {
  TOAST_SAVED: '已儲存',
  TOAST_SAVE_FAILED: '儲存失敗',
  TOAST_DELETED: '已刪除',
  TOAST_DELETE_FAILED: '刪除失敗',
  TOAST_PHOTO_DELETED: '已刪除照片',
  TOAST_PHOTO_DELETE_FAILED: '刪除照片失敗',
  TOAST_SET_COVER: '已設為封面',
  TOAST_SET_COVER_FAILED: '設定封面失敗',
  TOAST_VERIFIED: '已驗證',
  TOAST_VERIFY_CANCELED: '已取消驗證',
  TOAST_OPERATION_FAILED: '操作失敗',
  TOAST_INVALID_FILE: '請選擇圖片檔（PDF、影片等格式不支援）',
  TOAST_UPLOAD_FAILED: '上傳照片失敗',
  CONFIRM_DELETE_PREFIX: '確定要刪除「',
  CONFIRM_DELETE_SUFFIX: '」嗎？此操作無法還原。',
  TOAST_FILTERED_PREFIX: '已過濾 ',
  TOAST_FILTERED_SUFFIX: ' 個非圖片檔',
  TOAST_UPLOADED_PREFIX: '已上傳 ',
  TOAST_UPLOADED_SUFFIX: ' 張照片',
} as const

type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceActionOptions {
  resourceId: string
  resourceName: string
  resourceType: ResourceType
  fullData: Record<string, unknown> | null
  workspaceId: string
  actorId: string
  editName: string
  editDescription: string
  editAddress: string
  onSetFullData: (updater: (prev: Record<string, unknown> | null) => Record<string, unknown> | null) => void
  onSetIsEditing: (v: boolean) => void
  onSetSaving: (v: boolean) => void
  onSetDeleting: (v: boolean) => void
  onSetUploading: (v: boolean) => void
  onSetCurrentImageIndex: (v: number) => void
  onOpenChange: (open: boolean) => void
  onSave?: (updated: { id: string; name: string; description?: string; address?: string }) => void
  onDelete?: (id: string) => void
}

function getTableName(type: ResourceType): 'attractions' | 'hotels' | 'restaurants' {
  return type === 'attraction' ? 'attractions' : type === 'hotel' ? 'hotels' : 'restaurants'
}

export function buildResourceActions(opts: ResourceActionOptions) {
  const supabase = createSupabaseBrowserClient()
  const table = getTableName(opts.resourceType)

  const handleSave = async () => {
    if (!opts.fullData) return
    opts.onSetSaving(true)
    try {
      const { error } = await supabase
        .from(table)
        .update({
          name: opts.editName,
          description: opts.editDescription,
          address: opts.editAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', opts.resourceId)

      if (error) throw error

      toast.success(LABELS.TOAST_SAVED)
      opts.onSetIsEditing(false)
      opts.onSetFullData(prev =>
        prev
          ? { ...prev, name: opts.editName, description: opts.editDescription, address: opts.editAddress }
          : null
      )
      opts.onSave?.({ id: opts.resourceId, name: opts.editName, description: opts.editDescription, address: opts.editAddress })
    } catch (err) {
      logger.error('儲存失敗:', err)
      toast.error(LABELS.TOAST_SAVE_FAILED)
    } finally {
      opts.onSetSaving(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm(`${LABELS.CONFIRM_DELETE_PREFIX}${opts.resourceName}${LABELS.CONFIRM_DELETE_SUFFIX}`, { title: '刪除', type: 'warning' })
    if (!ok) return
    opts.onSetDeleting(true)
    try {
      const result = await softDelete(
        supabase as never,
        { workspaceId: opts.workspaceId, actorId: opts.actorId },
        { table, id: opts.resourceId }
      )
      if (!result.ok) throw new Error(result.error ?? '軟刪除失敗')
      toast.success(LABELS.TOAST_DELETED)
      opts.onOpenChange(false)
      opts.onDelete?.(opts.resourceId)
    } catch (err) {
      logger.error('刪除失敗:', err)
      toast.error(LABELS.TOAST_DELETE_FAILED)
    } finally {
      opts.onSetDeleting(false)
    }
  }

  const handleToggleVerify = async () => {
    const newVerified = !opts.fullData?.data_verified
    try {
      const { error } = await supabase
        .from(table)
        .update({ data_verified: newVerified, updated_at: new Date().toISOString() })
        .eq('id', opts.resourceId)
      if (error) throw error
      opts.onSetFullData(prev => (prev ? { ...prev, data_verified: newVerified } : null))
      toast.success(newVerified ? LABELS.TOAST_VERIFIED : LABELS.TOAST_VERIFY_CANCELED)
      opts.onSave?.({ id: opts.resourceId, name: String(opts.fullData?.name || opts.resourceName) })
    } catch {
      toast.error(LABELS.TOAST_OPERATION_FAILED)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error(LABELS.TOAST_INVALID_FILE)
      e.target.value = ''
      return
    }
    if (imageFiles.length < files.length) {
      toast.warning(`${LABELS.TOAST_FILTERED_PREFIX}${files.length - imageFiles.length}${LABELS.TOAST_FILTERED_SUFFIX}`)
    }

    opts.onSetUploading(true)
    try {
      const newImageUrls: string[] = []
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop()
        const filePath = `${opts.resourceType}s/${opts.resourceId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('resources').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath)
        newImageUrls.push(urlData.publicUrl)
      }

      const existingImages = (opts.fullData?.images as string[]) || []
      const updatedImages = [...existingImages, ...newImageUrls]

      const { error } = await supabase
        .from(table)
        .update({ images: updatedImages, updated_at: new Date().toISOString() })
        .eq('id', opts.resourceId)
      if (error) throw error

      opts.onSetFullData(prev => (prev ? { ...prev, images: updatedImages } : null))
      toast.success(`${LABELS.TOAST_UPLOADED_PREFIX}${newImageUrls.length}${LABELS.TOAST_UPLOADED_SUFFIX}`)
    } catch (err) {
      logger.error('上傳失敗:', err)
      toast.error(LABELS.TOAST_UPLOAD_FAILED)
    } finally {
      opts.onSetUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteImage = async (imageUrl: string) => {
    const existingImages = (opts.fullData?.images as string[]) || []
    const updatedImages = existingImages.filter(img => img !== imageUrl)
    try {
      const { error } = await supabase
        .from(table)
        .update({ images: updatedImages, updated_at: new Date().toISOString() })
        .eq('id', opts.resourceId)
      if (error) throw error
      opts.onSetFullData(prev => (prev ? { ...prev, images: updatedImages } : null))
      opts.onSetCurrentImageIndex(0)
      toast.success(LABELS.TOAST_PHOTO_DELETED)
    } catch (err) {
      logger.error('刪除照片失敗:', err)
      toast.error(LABELS.TOAST_PHOTO_DELETE_FAILED)
    }
  }

  const handleSetCover = async (imageUrl: string) => {
    const existingImages = (opts.fullData?.images as string[]) || []
    // 把選中的圖片移到第一張
    const updatedImages = [imageUrl, ...existingImages.filter(img => img !== imageUrl)]
    try {
      const { error } = await supabase
        .from(table)
        .update({ images: updatedImages, updated_at: new Date().toISOString() })
        .eq('id', opts.resourceId)
      if (error) throw error
      opts.onSetFullData(prev => (prev ? { ...prev, images: updatedImages } : null))
      opts.onSetCurrentImageIndex(0)
      toast.success(LABELS.TOAST_SET_COVER)
    } catch (err) {
      logger.error('設定封面失敗:', err)
      toast.error(LABELS.TOAST_SET_COVER_FAILED)
    }
  }

  return { handleSave, handleDelete, handleToggleVerify, handleImageUpload, handleDeleteImage, handleSetCover }
}
