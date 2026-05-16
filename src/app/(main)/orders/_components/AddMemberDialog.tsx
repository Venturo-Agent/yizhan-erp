'use client'
/**
 * AddMemberDialog - 新增成員對話框
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 整合 PassportUploadZone 以支援圖片增強功能
 */

import React, { useEffect, useState } from 'react'
import { Plus, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import { PassportUploadZone } from './PassportUploadZone'
import type { ProcessedFile } from '../_types/order-member.types'
import type { PendingConfirmation } from '../_hooks/usePassportUpload'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'
import { useTranslations } from 'next-intl'

interface AddMemberDialogProps {
  isOpen: boolean
  memberCount: number | ''
  processedFiles: ProcessedFile[]
  isUploading: boolean
  isDragging: boolean
  isProcessing: boolean
  onClose: () => void
  onConfirm: () => void
  onCountChange: (count: number | '') => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onRemoveFile: (index: number) => void
  onBatchUpload: () => void
  /** 可選：更新檔案預覽（用於圖片增強後） */
  onUpdateFilePreview?: (index: number, newPreview: string) => void
  /** 重複確認 */
  pendingConfirmations?: PendingConfirmation[]
  onConfirmUpdate?: (index: number) => void
  onRejectUpdate?: (index: number) => void
  onConfirmAllUpdates?: () => void
  onRejectAllUpdates?: () => void
  /** 護照辨識 feature flag（workspace_features.passport_ocr）— 沒開時整個批次上傳區隱藏、手動新增仍可用 */
  passportOcrEnabled?: boolean
}

// 護照圖片比對卡（顯示現有 vs 新上傳，讓使用者選哪張）
function PassportCompareCard({
  item,
  index,
  onKeepOld,
  onUseNew,
}: {
  item: PendingConfirmation
  index: number
  onKeepOld: (i: number) => void
  onUseNew: (i: number) => void
}) {
  const existingSignedUrl = usePassportImageUrl(item.matchedMember.passport_image_url)
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(item.file)
    setNewPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [item.file])

  const displayName = item.customer.name || item.matchedMember.chinese_name || ''

  return (
    <div className="border border-morandi-gold/40 rounded-lg p-3 space-y-3 bg-card">
      {/* 姓名 + 原因 */}
      <div className="text-sm">
        <span className="font-medium text-morandi-primary">{displayName}</span>
        <span className="text-muted-foreground ml-2 text-xs">{item.confirmMessage}</span>
      </div>

      {/* 兩張護照並排 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 現有 */}
        <div className="space-y-1.5">
          <div className="text-[0.647rem] text-morandi-muted font-medium">現有護照（目前存的）</div>
          <div className="relative aspect-[3/2] rounded-md overflow-hidden border bg-morandi-container/30 flex items-center justify-center">
            {existingSignedUrl ? (
              <img src={existingSignedUrl} alt="現有護照" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-morandi-muted text-[0.647rem]">
                <ImageIcon size={20} />
                <span>無照片</span>
              </div>
            )}
          </div>
        </div>
        {/* 新上傳 */}
        <div className="space-y-1.5">
          <div className="text-[0.647rem] text-morandi-muted font-medium">剛上傳的護照</div>
          <div className="relative aspect-[3/2] rounded-md overflow-hidden border bg-morandi-container/30 flex items-center justify-center">
            {newPreviewUrl ? (
              <img src={newPreviewUrl} alt="新上傳護照" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-morandi-muted text-[0.647rem]">
                <ImageIcon size={20} />
                <span>載入中...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 選擇按鈕 */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="soft-gold" onClick={() => onKeepOld(index)}>
          保留舊的
        </Button>
        <Button size="sm" onClick={() => onUseNew(index)}>
          用新的
        </Button>
      </div>
    </div>
  )
}

export function AddMemberDialog({
  isOpen,
  memberCount,
  processedFiles,
  isUploading,
  isDragging,
  isProcessing,
  onClose,
  onConfirm,
  onCountChange,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onBatchUpload,
  onUpdateFilePreview,
  pendingConfirmations,
  onConfirmUpdate,
  onRejectUpdate,
  onConfirmAllUpdates,
  onRejectAllUpdates,
  passportOcrEnabled = true,
}: AddMemberDialogProps) {
  const t = useTranslations('orders')
  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title={t('addMember')}
      showFooter={false}
      loading={false}
      nested
      level={2}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* 手動新增 */}
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-medium text-morandi-primary">
            {t('addBlankMember')}
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="relative w-20">
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={memberCount}
                  onChange={e => {
                    const val = e.target.value
                    onCountChange(val === '' ? '' : parseInt(val, 10))
                  }}
                  className="pr-6 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                  placeholder={t('memberCount')}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof memberCount === 'number' ? memberCount : 0
                      onCountChange(Math.min(50, cur + 1))
                    }}
                    className="h-3.5 w-4 flex items-center justify-center text-morandi-secondary hover:text-morandi-primary"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof memberCount === 'number' ? memberCount : 1
                      onCountChange(Math.max(1, cur - 1))
                    }}
                    className="h-3.5 w-4 flex items-center justify-center text-morandi-secondary hover:text-morandi-primary"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
              <Button onClick={onConfirm} disabled={!memberCount || memberCount < 1} size="sm">
                <Plus size={16} className="mr-1" />
                {t('add')}
              </Button>
            </div>
          </div>
        </div>

        {passportOcrEnabled && (
          <>
            <div className="border-t border-border" />

            {/* 護照批次上傳（使用共用組件，支援圖片增強） */}
            <PassportUploadZone
              processedFiles={processedFiles}
              isUploading={isUploading}
              isDragging={isDragging}
              isProcessing={isProcessing}
              onFileChange={onFileChange}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onRemoveFile={onRemoveFile}
              onBatchUpload={onBatchUpload}
              onUpdateFilePreview={onUpdateFilePreview}
            />
          </>
        )}

        {/* 重複成員確認區 — 圖片比對 */}
        {pendingConfirmations && pendingConfirmations.length > 0 && (
          <div className="space-y-3 p-3 border border-morandi-gold/30 rounded-lg bg-morandi-gold/5">
            <div className="text-sm font-medium text-morandi-gold">
              {t('found')} {pendingConfirmations.length} {t('duplicateNeedConfirm')}
            </div>
            {pendingConfirmations.map((item, i) => (
              <PassportCompareCard
                key={`${item.matchedMember.id}-${item.matchType}`}
                item={item}
                index={i}
                onKeepOld={idx => onRejectUpdate?.(idx)}
                onUseNew={idx => onConfirmUpdate?.(idx)}
              />
            ))}
            {pendingConfirmations.length > 1 && (
              <div className="flex gap-2 pt-1 justify-end">
                <Button size="sm" variant="soft-gold" onClick={onRejectAllUpdates}>
                  {t('skipAll')}
                </Button>
                <Button size="sm" onClick={onConfirmAllUpdates}>
                  全部用新的
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </FormDialog>
  )
}
