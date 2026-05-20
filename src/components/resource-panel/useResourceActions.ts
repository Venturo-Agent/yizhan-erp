'use client'

import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { softDelete } from '@/lib/data/soft-delete'
import { confirm } from '@/lib/ui/alert-dialog'
import {
  updateAttraction,
  updateHotel,
  updateRestaurant,
  invalidateAttractions,
  invalidateHotels,
  invalidateRestaurants,
} from '@/data'

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

// 2026-05-20 Phase A.7：按 resourceType 派發 entity hook update / invalidate
//   - 對齊 A.6 createByType pattern、確保 cache invalidate 走 entity hook 內建路徑
//   - 紅線 F：client 端寫入 + cache 失效都只能有一個真相（entity hook + invalidate）
function updateByType(type: ResourceType, id: string, data: Record<string, unknown>) {
  if (type === 'attraction') return updateAttraction(id, data)
  if (type === 'hotel') return updateHotel(id, data)
  return updateRestaurant(id, data)
}

function invalidateByType(type: ResourceType): Promise<void> {
  if (type === 'attraction') return invalidateAttractions()
  if (type === 'hotel') return invalidateHotels()
  return invalidateRestaurants()
}

export function buildResourceActions(opts: ResourceActionOptions) {
  const supabase = createSupabaseBrowserClient()
  const table = getTableName(opts.resourceType)

  // 2026-05-20 Phase A.7：改用 entity hook update（updateAttraction / updateHotel / updateRestaurant）
  //   - 內建 invalidate（updateEntity 成功後會 invalidateEntity）→ SWR cache 自動失效
  //   - 內建 updated_at + updated_by audit 欄位、不用 caller 手動填
  const handleSave = async () => {
    if (!opts.fullData) return
    opts.onSetSaving(true)
    try {
      await updateByType(opts.resourceType, opts.resourceId, {
        name: opts.editName,
        description: opts.editDescription,
        address: opts.editAddress,
      })

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

  // 2026-05-20 Phase A.7：handleDelete 保留 softDelete + 結束後 invalidate 兜底
  //   - entity hook .delete 是 hard delete、會丟掉 softDelete 的 audit log 軟刪除語意
  //   - shared library（attractions/hotels/restaurants）走 softDelete（ADR-0002）、不能換成 hard delete
  //   - 折衷：保留 softDelete + 結束後 invalidateXxx 讓 entity hook cache 知道 row 已軟刪
  //   - 走 invalidateXxx 而不是 entity hook delete、跟紅線 F「不直接 useSWR」精神不違背
  //     （仍透過 entity hook SSOT 失效 cache、只是寫入用 softDelete helper 保留 audit）
  const handleDelete = async () => {
    const ok = await confirm(`${LABELS.CONFIRM_DELETE_PREFIX}${opts.resourceName}${LABELS.CONFIRM_DELETE_SUFFIX}`, { title: '刪除', type: 'warning' })
    if (!ok) return
    opts.onSetDeleting(true)
    try {
      const result = await softDelete(
        supabase as never,
        { workspaceId: opts.workspaceId, actorId: opts.actorId },
        {
          table,
          id: opts.resourceId,
          workspaceColumn: 'created_by_workspace_id',
          // shared library row 99.9% 是 NULL workspace（平台共用）、需此 flag 才刪得到
          // RLS attractions_update / hotels_update / restaurants_update 已寫 OR is null 條件、會擋未授權
          allowPlatformShared: true,
        }
      )
      if (!result.ok) throw new Error(result.error ?? '軟刪除失敗')
      await invalidateByType(opts.resourceType)
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

  // 2026-05-20 Phase A.7：改 entity hook update、cache 自動失效
  const handleToggleVerify = async () => {
    const newVerified = !opts.fullData?.data_verified
    try {
      await updateByType(opts.resourceType, opts.resourceId, { data_verified: newVerified })
      opts.onSetFullData(prev => (prev ? { ...prev, data_verified: newVerified } : null))
      toast.success(newVerified ? LABELS.TOAST_VERIFIED : LABELS.TOAST_VERIFY_CANCELED)
      opts.onSave?.({ id: opts.resourceId, name: String(opts.fullData?.name || opts.resourceName) })
    } catch {
      toast.error(LABELS.TOAST_OPERATION_FAILED)
    }
  }

  // 2026-05-20 Phase A.7：image upload 拆兩段
  //   - storage upload 保留 raw（entity hook 不 cover Supabase Storage、不是 SWR cache 問題）
  //   - row update（images 陣列）改 entity hook updateXxx({ images })、cache 自動失效
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
        // storage upload 保留 raw（不是 SWR cache 問題、entity hook 不 cover Storage）
        const { error: uploadError } = await supabase.storage.from('resources').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath)
        newImageUrls.push(urlData.publicUrl)
      }

      const existingImages = (opts.fullData?.images as string[]) || []
      const updatedImages = [...existingImages, ...newImageUrls]

      // row update 走 entity hook、cache 失效自動處理
      await updateByType(opts.resourceType, opts.resourceId, { images: updatedImages })

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

  // 2026-05-20 Phase A.7：改 entity hook update
  const handleDeleteImage = async (imageUrl: string) => {
    const existingImages = (opts.fullData?.images as string[]) || []
    const updatedImages = existingImages.filter(img => img !== imageUrl)
    try {
      await updateByType(opts.resourceType, opts.resourceId, { images: updatedImages })
      opts.onSetFullData(prev => (prev ? { ...prev, images: updatedImages } : null))
      opts.onSetCurrentImageIndex(0)
      toast.success(LABELS.TOAST_PHOTO_DELETED)
    } catch (err) {
      logger.error('刪除照片失敗:', err)
      toast.error(LABELS.TOAST_PHOTO_DELETE_FAILED)
    }
  }

  // 2026-05-20 Phase A.7：改 entity hook update（設封面 = images 重排第一張）
  const handleSetCover = async (imageUrl: string) => {
    const existingImages = (opts.fullData?.images as string[]) || []
    // 把選中的圖片移到第一張
    const updatedImages = [imageUrl, ...existingImages.filter(img => img !== imageUrl)]
    try {
      await updateByType(opts.resourceType, opts.resourceId, { images: updatedImages })
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
