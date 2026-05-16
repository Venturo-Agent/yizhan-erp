'use client'

import { Save, X, FileEdit, Database, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LABELS = {
  CANCEL_VERIFY: '取消驗證',
  VERIFY: '驗證',
  DELETING: '刪除中...',
  DELETE: '刪除',
  CANCEL: '取消',
  SAVING: '儲存中...',
  SAVE: '儲存',
  EDIT_THIS_TOUR: '編輯本團',
  EDIT_DATABASE: '編輯資料庫',
} as const

interface ResourceActionButtonsProps {
  isEditing: boolean
  saving: boolean
  deleting: boolean
  readOnly: boolean
  canEditDatabase: boolean
  tourItineraryItemId?: string
  dataVerified?: boolean
  editName: string
  editDescription: string
  editAddress: string
  fullData: Record<string, unknown> | null
  resourceName: string
  onSave: () => void
  onDelete: () => void
  onToggleVerify: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onOpenOverride: () => void
}

export function ResourceActionButtons({
  isEditing,
  saving,
  deleting,
  readOnly,
  canEditDatabase,
  tourItineraryItemId,
  dataVerified,
  onSave,
  onDelete,
  onToggleVerify,
  onCancelEdit,
  onStartEdit,
  onOpenOverride,
}: ResourceActionButtonsProps) {
  return (
    <div className="flex justify-between gap-2 pt-2">
      {isEditing ? (
        <>
          {/* 左側：驗證 + 刪除 */}
          <div className="flex gap-2">
            {/* 驗證/取消驗證 */}
            <Button
              variant="soft-gold"
              size="sm"
              onClick={onToggleVerify}
            >
              <CheckCircle2 size="0.875em" className="mr-1" />
              {dataVerified ? LABELS.CANCEL_VERIFY : LABELS.VERIFY}
            </Button>
            {/* 刪除 */}
            <Button
              variant="soft-gold"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-morandi-secondary hover:text-destructive"
            >
              <Trash2 size="0.875em" className="mr-1" />
              {deleting ? LABELS.DELETING : LABELS.DELETE}
            </Button>
          </div>
          {/* 右側：取消 + 儲存 */}
          <div className="flex gap-2">
            <Button
              variant="soft-gold"
              size="sm"
              onClick={onCancelEdit}
            >
              <X size="0.875em" className="mr-1" />
              {LABELS.CANCEL}
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              <Save size="0.875em" className="mr-1" />
              {saving ? LABELS.SAVING : LABELS.SAVE}
            </Button>
          </div>
        </>
      ) : (
        !readOnly && (
          <div className="flex gap-2 ml-auto">
            {/* 編輯本團按鈕 */}
            {tourItineraryItemId && (
              <Button
                variant="soft-gold"
                size="sm"
                onClick={onOpenOverride}
              >
                <FileEdit size="0.875em" className="mr-1" />
                {LABELS.EDIT_THIS_TOUR}
              </Button>
            )}
            {/* 編輯資料庫按鈕 */}
            {canEditDatabase && (
              <Button variant="soft-gold" size="sm" onClick={onStartEdit}>
                <Database size="0.875em" className="mr-1" />
                {LABELS.EDIT_DATABASE}
              </Button>
            )}
          </div>
        )
      )}
    </div>
  )
}
