'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  MapPin,
  Building2,
  UtensilsCrossed,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ResourceOverrideDialog } from './ResourceOverrideDialog'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { ResourceImagePanel } from './ResourceImagePanel'
import { ResourceInfoView } from './ResourceInfoView'
import { ResourceActionButtons } from './ResourceActionButtons'
import { buildResourceActions } from './useResourceActions'

const LABELS = {
  TYPE_ATTRACTION: '景點', TYPE_HOTEL: '酒店', TYPE_RESTAURANT: '餐廳',
  EDIT_PREFIX: '編輯', INFO_SUFFIX: '資訊', LOADING: '載入中...',
  NAME: '名稱', NAME_PLACEHOLDER: '輸入名稱',
  ADDRESS: '地址', ADDRESS_PLACEHOLDER: '輸入地址',
  DESCRIPTION: '描述', DESCRIPTION_PLACEHOLDER: '輸入描述',
} as const

type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: {
    id: string
    name: string
    type: ResourceType
    category?: string | null
    images?: string[] | null
    latitude?: number | null
    longitude?: number | null
    address?: string | null
    description?: string | null
  } | null
  onSave?: (updated: { id: string; name: string; description?: string; address?: string }) => void
  onDelete?: (id: string) => void
  // 權限控制
  canEditDatabase?: boolean // 是否可以編輯資料庫
  // 本團覆蓋相關
  tourItineraryItemId?: string // 行程項目 ID（有傳才顯示「編輯本團」按鈕）
  currentOverride?: string | null // 目前的覆蓋內容
  onOverrideSave?: (description: string) => void
  readOnly?: boolean // 完全唯讀（不顯示任何編輯按鈕）
}

export function ResourceDetailDialog({
  open,
  onOpenChange,
  resource,
  onSave,
  onDelete,
  canEditDatabase = false,
  tourItineraryItemId,
  currentOverride,
  onOverrideSave,
  readOnly = false,
}: ResourceDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullData, setFullData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 編輯表單狀態
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const currentUser = useAuthStore(s => s.user)
  const supabase = createSupabaseBrowserClient()

  // 載入完整資料
  useEffect(() => {
    if (!open || !resource) {
      setFullData(null)
      setIsEditing(false)
      return
    }

    const fetchFullData = async () => {
      setLoading(true)
      try {
        const table =
          resource.type === 'attraction'
            ? 'attractions'
            : resource.type === 'hotel'
              ? 'hotels'
              : 'restaurants'

        const { data, error } = await supabase
          .from(table)
          .select(
            'id, name, english_name, description, category, images, address, latitude, longitude, city_id, country_id, is_active, created_at, updated_at'
          )
          .eq('id', resource.id)
          .single()

        if (error) throw error

        setFullData(data)

        // 初始化編輯表單
        setEditName(data.name || '')
        setEditDescription(data.description || '')
        setEditAddress(data.address || '')
      } catch (err) {
        logger.error('載入資源失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFullData()
  }, [open, resource?.id, resource?.type])

  if (!resource) return null

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size="1.25em" className="text-morandi-green" />,
    hotel: <Building2 size="1.25em" className="text-status-info" />,
    restaurant: <UtensilsCrossed size="1.25em" className="text-status-warning" />,
  }

  const typeLabel: Record<ResourceType, string> = {
    attraction: LABELS.TYPE_ATTRACTION,
    hotel: LABELS.TYPE_HOTEL,
    restaurant: LABELS.TYPE_RESTAURANT,
  }

  // 委托所有 action handler 給 buildResourceActions
  const actions = buildResourceActions({
    resourceId: resource.id,
    resourceName: resource.name,
    resourceType: resource.type,
    fullData,
    workspaceId: currentUser?.workspace_id ?? '',
    actorId: currentUser?.id ?? '',
    editName,
    editDescription,
    editAddress,
    onSetFullData: setFullData,
    onSetIsEditing: setIsEditing,
    onSetSaving: setSaving,
    onSetDeleting: setDeleting,
    onSetUploading: setUploading,
    onSetCurrentImageIndex: setCurrentImageIndex,
    onOpenChange,
    onSave,
    onDelete,
  })

  // images 陣列，第一張就是封面
  const allImages = fullData ? (fullData.images as string[]) || [] : resource.images || []
  const hasImages = allImages.length > 0

  const hasCoordinates = !!(resource.latitude && resource.longitude)
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${resource.latitude},${resource.longitude}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className={`${hasImages || isEditing ? 'max-w-4xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {iconMap[resource.type]}
            <span>
              {isEditing ? LABELS.EDIT_PREFIX : ''}
              {typeLabel[resource.type]}{LABELS.INFO_SUFFIX}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">{LABELS.LOADING}</div>
        ) : (
          <div
            className={
              hasImages || isEditing
                ? 'grid grid-cols-[400px_1fr] gap-6 items-stretch'
                : 'space-y-4'
            }
          >
            {/* 左側：圖片 */}
            {(hasImages || isEditing) && (
              <ResourceImagePanel
                allImages={allImages}
                currentImageIndex={currentImageIndex}
                isEditing={isEditing}
                uploading={uploading}
                resourceName={resource.name}
                onIndexChange={setCurrentImageIndex}
                onSetCover={actions.handleSetCover}
                onDeleteImage={actions.handleDeleteImage}
                onUpload={actions.handleImageUpload}
              />
            )}

            {/* 右側：資訊 */}
            <div
              className={
                hasImages || isEditing
                  ? 'flex-1 space-y-3 max-h-[31.25rem] overflow-y-auto pr-2'
                  : 'space-y-4'
              }
            >
              {isEditing ? (
                <>
                  {/* 名稱 */}
                  <div className="space-y-1.5">
                    <Label>{LABELS.NAME}</Label>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder={LABELS.NAME_PLACEHOLDER}
                    />
                  </div>
                  {/* 地址 */}
                  <div className="space-y-1.5">
                    <Label>{LABELS.ADDRESS}</Label>
                    <Input
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                      placeholder={LABELS.ADDRESS_PLACEHOLDER}
                    />
                  </div>
                  {/* 描述 */}
                  <div className="space-y-1.5">
                    <Label>{LABELS.DESCRIPTION}</Label>
                    <Textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder={LABELS.DESCRIPTION_PLACEHOLDER}
                      rows={3}
                    />
                  </div>
                </>
              ) : fullData ? (
                <ResourceInfoView
                  resourceName={resource.name}
                  resourceCategory={resource.category}
                  resourceLatitude={resource.latitude}
                  resourceLongitude={resource.longitude}
                  fullData={fullData}
                  googleMapsUrl={googleMapsUrl}
                />
              ) : null}

              {/* 按鈕區 */}
              <ResourceActionButtons
                isEditing={isEditing}
                saving={saving}
                deleting={deleting}
                readOnly={readOnly}
                canEditDatabase={canEditDatabase}
                tourItineraryItemId={tourItineraryItemId}
                dataVerified={fullData?.data_verified as boolean | undefined}
                editName={editName}
                editDescription={editDescription}
                editAddress={editAddress}
                fullData={fullData}
                resourceName={resource.name}
                onSave={actions.handleSave}
                onDelete={actions.handleDelete}
                onToggleVerify={actions.handleToggleVerify}
                onCancelEdit={() => {
                  setIsEditing(false)
                  setEditName(String(fullData?.name || ''))
                  setEditDescription(String(fullData?.description || ''))
                  setEditAddress(String(fullData?.address || ''))
                }}
                onStartEdit={() => setIsEditing(true)}
                onOpenOverride={() => setShowOverrideDialog(true)}
              />
            </div>
          </div>
        )}
      </DialogContent>

      {/* 本團覆蓋對話框 */}
      {tourItineraryItemId && resource && (
        <ResourceOverrideDialog
          open={showOverrideDialog}
          onOpenChange={setShowOverrideDialog}
          resourceName={resource.name}
          tourItineraryItemId={tourItineraryItemId}
          currentOverride={currentOverride}
          originalDescription={fullData?.description as string | null}
          images={allImages}
          onSave={desc => {
            onOverrideSave?.(desc)
            setShowOverrideDialog(false)
          }}
        />
      )}
    </Dialog>
  )
}
