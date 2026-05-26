'use client'

import { useState } from 'react'
import type { TourFormData } from '@/components/editor/tour-form/types'
import type { ItineraryVersionRecord } from '@/stores/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Save, FilePlus, History, Trash2, Files } from 'lucide-react'
import { confirm } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import { updateItinerary } from '@/data'
import { usePublish } from './hooks/usePublish'
import { PublishDialog } from './PublishDialog'
import { PublishPreview } from './PublishPreview'
import { COMP_EDITOR_LABELS } from '../constants/labels'

interface PublishButtonData extends Partial<TourFormData> {
  id?: string
  status?: string
  tourId?: string
  meetingInfo?: unknown
  version_records?: ItineraryVersionRecord[]
}

interface PublishButtonProps {
  data: PublishButtonData
  currentVersionIndex: number
  onVersionChange: (index: number, versionData?: ItineraryVersionRecord) => void
  onVersionRecordsChange?: (versionRecords: ItineraryVersionRecord[]) => void
  onCreated?: (newItineraryId: string) => void
}

export function PublishButton({
  data,
  currentVersionIndex,
  onVersionChange,
  onVersionRecordsChange,
  onCreated,
}: PublishButtonProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSaveAsNewDialog, setShowSaveAsNewDialog] = useState(false)
  const [hoveredVersionIndex, setHoveredVersionIndex] = useState<number | null>(null)

  const {
    saving,
    versionNote,
    setVersionNote,
    newFileName,
    setNewFileName,
    copied,
    versionRecords,
    isEditMode,
    shareUrl,
    saveItinerary,
    saveAsNewVersion,
    saveAsNewFile,
    copyShareLink,
    getCurrentVersionName,
    stripHtml,
  } = usePublish({
    data,
    currentVersionIndex,
    onVersionChange,
    onVersionRecordsChange,
    onCreated,
  })

  // 載入版本
  const handleVersionSelect = (value: string) => {
    const index = parseInt(value, 10)
    if (index === -1) {
      onVersionChange(-1)
    } else {
      const versionData = versionRecords[index]
      onVersionChange(index, versionData)
    }
  }

  // 刪除版本
  const handleDeleteVersion = async (index: number) => {
    if (!data.id) return
    if (versionRecords.length <= 0) return

    const versionToDelete = versionRecords[index]
    const versionName = versionToDelete?.note || `版本 ${versionToDelete?.version || index + 1}`

    const confirmed = await confirm(`確定要刪除「${versionName}」嗎？`, {
      title: COMP_EDITOR_LABELS.刪除版本,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const updatedRecords = versionRecords.filter((_, i) => i !== index)
      await updateItinerary(data.id, { version_records: updatedRecords })

      if (currentVersionIndex === index) {
        onVersionChange(-1)
      } else if (currentVersionIndex > index) {
        onVersionChange(currentVersionIndex - 1, versionRecords[currentVersionIndex - 1])
      }
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.刪除版本失敗, error)
      await alert(
        COMP_EDITOR_LABELS.刪除版本失敗_2 +
          (error instanceof Error ? error.message : COMP_EDITOR_LABELS.未知錯誤),
        'error'
      )
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 1. 存檔按鈕 */}
        <Button
          variant="soft-gold"
          onClick={saveItinerary}
          disabled={saving}
          size="sm"
          className="h-8 px-3"
        >
          <Save size="0.875em" className="mr-1.5" />
          {saving ? COMP_EDITOR_LABELS.儲存中 : COMP_EDITOR_LABELS.存檔}
        </Button>

        {/* 2. 另存按鈕 */}
        {isEditMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={saving}
                size="sm"
                variant="soft-gold"
                className="h-8 px-3 border-morandi-container hover:bg-morandi-container/30"
              >
                <FilePlus size="0.875em" className="mr-1.5" />
                {COMP_EDITOR_LABELS.LABEL_7445}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="flex items-center gap-2 py-2 cursor-pointer"
                onClick={() => setShowSaveDialog(true)}
              >
                <FilePlus size="0.875em" className="text-morandi-secondary" />
                <div className="flex flex-col">
                  <span className="font-medium">{COMP_EDITOR_LABELS.另存新版本}</span>
                  <span className="text-xs text-morandi-secondary">
                    {COMP_EDITOR_LABELS.LABEL_1615}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 py-2 cursor-pointer"
                onClick={() => {
                  setNewFileName(`${stripHtml(data.title) || COMP_EDITOR_LABELS.行程表} 副本`)
                  setShowSaveAsNewDialog(true)
                }}
              >
                <Files size="0.875em" className="text-morandi-secondary" />
                <div className="flex flex-col">
                  <span className="font-medium">{COMP_EDITOR_LABELS.另存新檔}</span>
                  <span className="text-xs text-morandi-secondary">
                    {COMP_EDITOR_LABELS.LABEL_578}
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 3. 版本選擇器 */}
        {isEditMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="soft-gold"
                size="sm"
                className="h-8 px-3 text-xs border-morandi-container bg-card"
              >
                <History size="0.875em" className="mr-1.5 text-morandi-secondary" />
                {getCurrentVersionName()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <div className="px-2 py-1.5 text-sm font-medium text-morandi-primary border-b border-border">
                版本歷史 {versionRecords.length > 0 && `(${versionRecords.length})`}
              </div>
              {versionRecords.map((record, index) => {
                const isMainVersion = index === 0
                const isCurrentVersion =
                  (isMainVersion && currentVersionIndex === -1) || currentVersionIndex === index
                return (
                  <DropdownMenuItem
                    key={record.id}
                    className="flex items-center justify-between py-2 cursor-pointer relative"
                    onMouseEnter={() => setHoveredVersionIndex(index)}
                    onMouseLeave={() => setHoveredVersionIndex(null)}
                    onClick={() => handleVersionSelect(isMainVersion ? '-1' : index.toString())}
                  >
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {stripHtml(record.note) || `版本 ${record.version}`}
                        </span>
                        {isMainVersion && (
                          <span className="text-[0.625rem] text-morandi-secondary bg-morandi-container px-1.5 py-0.5 rounded">
                            {COMP_EDITOR_LABELS.LABEL_1858}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-morandi-secondary">
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString('zh-TW')
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentVersion && (
                        <div className="text-xs bg-morandi-gold text-white px-2 py-0.5 rounded">
                          {COMP_EDITOR_LABELS.LABEL_6211}
                        </div>
                      )}
                      {hoveredVersionIndex === index && !isMainVersion && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteVersion(index)
                          }}
                          className="p-1 hover:bg-status-danger-bg rounded transition-colors"
                          title={COMP_EDITOR_LABELS.刪除版本}
                        >
                          <Trash2 size="0.875em" className="text-status-danger" />
                        </button>
                      )}
                    </div>
                  </DropdownMenuItem>
                )
              })}
              {versionRecords.length === 0 && (
                <div className="px-2 py-3 text-sm text-morandi-secondary text-center">
                  {COMP_EDITOR_LABELS.SAVING_5906}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 4. 連結按鈕 */}
        {isEditMode && (
          <PublishPreview shareUrl={shareUrl} copied={copied} onCopy={copyShareLink} />
        )}
      </div>

      {/* 另存新版本 Dialog */}
      <PublishDialog
        type="version"
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        value={versionNote}
        onChange={setVersionNote}
        onConfirm={async () => {
          await saveAsNewVersion()
          setShowSaveDialog(false)
        }}
        saving={saving}
        placeholder={stripHtml(data.title) || COMP_EDITOR_LABELS.行程表}
        versionCount={versionRecords.length}
      />

      {/* 另存新檔 Dialog */}
      <PublishDialog
        type="file"
        open={showSaveAsNewDialog}
        onOpenChange={setShowSaveAsNewDialog}
        value={newFileName}
        onChange={setNewFileName}
        onConfirm={async () => {
          await saveAsNewFile()
          setShowSaveAsNewDialog(false)
        }}
        saving={saving}
        placeholder={`${stripHtml(data.title) || COMP_EDITOR_LABELS.行程表} 副本`}
      />
    </>
  )
}
