'use client'
/**
 * 顧客詳情/編輯對話框（統一組件）
 *
 * mode:
 * - 'view': 檢視模式（唯讀）
 * - 'edit': 編輯模式（可修改）
 */

import { useState, useEffect, useCallback } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { X, Edit, Upload, ImageOff, Save, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { FormField } from '@/components/ui/form-field'
import { ManagedDialog, useDirtyState } from '@/components/dialog'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { updateCustomer } from '@/data/entities/customers'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Customer } from '@/types/customer.types'
import { useTranslations } from 'next-intl'
import { validateNationalId } from '@/lib/validations/national-id'

const PAGE_LABELS = {
  PHOTO_UPDATED: '照片已更新',
  SAVE_FAILED: '儲存失敗',
} as const
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'
import { deletePassportImage } from '@/lib/passport-storage'

interface CustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  mode: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
  onSave?: (data: Partial<Customer>) => Promise<void>
}

/**
 * 獨立 img 元件，避免每個 hook 呼叫在主元件多佔 state。
 */
function CustomerDialogPassportImage({
  stored,
  alt,
  className,
}: {
  stored: string | null | undefined
  alt: string
  className?: string
}) {
  const signed = usePassportImageUrl(stored)
  if (!signed) return null
  return <img src={signed} alt={alt} className={className} />
}

/**
 * ImageEditor 包裝：先把 stored filename 簽成短效 URL 再傳給 ImageEditor
 */
function CustomerDialogImageEditor({
  stored,
  open,
  onClose,
  onSave,
  onCropAndSave,
}: {
  stored: string
  open: boolean
  onClose: () => void
  onSave: (settings: ImageEditorSettings) => void
  onCropAndSave: (blob: Blob, settings: ImageEditorSettings) => Promise<void>
}) {
  const signed = usePassportImageUrl(stored)
  if (!signed) return null
  return (
    <ImageEditor
      open={open}
      onClose={onClose}
      imageSrc={signed}
      onSave={onSave}
      onCropAndSave={onCropAndSave}
    />
  )
}

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  mode,
  onModeChange,
  onSave,
}: CustomerDialogProps) {
  const t = useTranslations('library')
  const isEdit = mode === 'edit'

  // 表單資料
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    birth_date: '',
    passport_name: '',
    passport_number: '',
    passport_expiry: '',
    dietary_restrictions: '',
  })

  // 圖片編輯
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null)

  // 追蹤變更
  const { isDirty, resetDirty, setOriginalData, checkDirty } = useDirtyState()

  // 當 customer 或 open 變化時，重置表單
  useEffect(() => {
    if (open && customer) {
      const data = {
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        national_id: customer.national_id || '',
        birth_date: customer.birth_date || '',
        passport_name: customer.passport_name || '',
        passport_number: customer.passport_number || '',
        passport_expiry: customer.passport_expiry || '',
        dietary_restrictions: customer.dietary_restrictions || '',
      }
      setFormData(data)
      setOriginalData(data)
      setLocalImageUrl(null)
      resetDirty()
    }
  }, [open, customer, setOriginalData, resetDirty])

  // 更新欄位
  const updateField = useCallback(
    <K extends keyof typeof formData>(field: K, value: string) => {
      setFormData(prev => {
        const updated = { ...prev, [field]: value }
        checkDirty(updated)
        return updated
      })
    },
    [checkDirty]
  )

  // 儲存
  const { isSubmitting: saving, execute: executeSave } = useAsyncSubmit(async () => {
    if (!customer || !onSave) return
    await onSave(formData)
    resetDirty()
    onModeChange?.('view')
  })

  const handleSave = () => executeSave()

  // 圖片編輯存檔
  const handleEditorSave = (_settings: ImageEditorSettings) => {
    // 不需要單獨保存設定
  }

  // 圖片裁切並存檔
  const handleEditorCropAndSave = async (blob: Blob, _settings: ImageEditorSettings) => {
    if (!customer) return

    try {
      const oldStored = localImageUrl || customer.passport_image_url

      // 上傳裁切後的圖片；DB 只存 bare filename、顯示時動態簽 15 分鐘
      const random = Math.random().toString(36).substring(2, 8)
      const fileName = `passport_${Date.now()}_${random}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(fileName, blob, { upsert: true })

      if (uploadError) throw uploadError

      // 更新本地顯示（存 bare filename、hook 會現場簽）
      setLocalImageUrl(fileName)

      // 更新資料庫（bare filename）
      await updateCustomer(customer.id, { passport_image_url: fileName })

      // 刪除舊照片（helper 接受完整 URL 或 bare filename）
      await deletePassportImage(oldStored)

      toast.success(PAGE_LABELS.PHOTO_UPDATED)
      setIsEditorOpen(false)
    } catch (error) {
      logger.error('Failed to save edited image:', error)
      toast.error(PAGE_LABELS.SAVE_FAILED)
    }
  }

  if (!customer) return null

  const currentStored = localImageUrl || customer.passport_image_url
  const isVerified = customer.verification_status === 'verified'

  return (
    <>
      <ManagedDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('customerDetailTitle')}
        maxWidth="5xl"
        showFooter={false}
        confirmOnDirtyClose={isEdit}
        externalDirty={isDirty}
      >
        <div className="flex gap-8">
          {/* 左側：護照照片（橫向） */}
          <div className="w-1/2 rounded-lg overflow-hidden bg-morandi-container relative">
            {currentStored ? (
              <>
                <CustomerDialogPassportImage
                  stored={currentStored}
                  alt={t('customerDetailPassportAlt', { name: customer.name })}
                  className="w-full h-full object-cover absolute inset-0"
                />
                {/* 驗證狀態 - 左上角 */}
                <div
                  className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                    isVerified
                      ? 'bg-morandi-green/90 text-white'
                      : 'bg-status-warning/90 text-white'
                  }`}
                >
                  {isVerified ? <Check size={12} /> : '⚠'}
                  {isVerified
                    ? t('customerDetailStatusVerified')
                    : t('customerDetailStatusUnverified')}
                </div>
                {/* 編輯按鈕 - 右下角 */}
                <button
                  onClick={() => setIsEditorOpen(true)}
                  className="absolute bottom-3 right-3 p-2 bg-card/90 hover:bg-card rounded-full shadow-md transition-all opacity-80 hover:opacity-100"
                  title={t('customerDetailTitleEditPhoto')}
                >
                  <Edit size={16} className="text-morandi-primary" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-morandi-muted">
                <ImageOff size={40} className="mb-2 opacity-50" />
                <span className="text-sm">{t('customerDetailNoPassportPhoto')}</span>
                {isEdit && (
                  <Button size="sm" variant="soft-gold" className="mt-3 gap-1.5">
                    <Upload size={14} />
                    {t('customerDetailBtnUploadPhoto')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 右側：資料欄位 */}
          <div className="w-1/2">
            {/* 基本資料 - 2 欄 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <FormField
                label={t('customerDetailLabelName')}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={t('customerDetailLabelPassportName')}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.passport_name}
                  onChange={e => updateField('passport_name', e.target.value.toUpperCase())}
                  readOnly={!isEdit}
                  className={`h-10 font-mono bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={t('customerDetailLabelPassportNumber')}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.passport_number}
                  onChange={e => updateField('passport_number', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 font-mono bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={t('customerDetailLabelPassportExpiry')}
                labelClassName="text-xs text-morandi-secondary"
              >
                {isEdit ? (
                  <DatePicker
                    value={formData.passport_expiry}
                    onChange={date => updateField('passport_expiry', date)}
                    className="h-10"
                  />
                ) : (
                  <Input
                    value={formData.passport_expiry || ''}
                    readOnly
                    className="h-10 bg-card cursor-default"
                  />
                )}
              </FormField>

              <FormField
                label={t('customerDetailLabelBirthDate')}
                labelClassName="text-xs text-morandi-secondary"
              >
                {isEdit ? (
                  <DatePicker
                    value={formData.birth_date}
                    onChange={date => updateField('birth_date', date)}
                    className="h-10"
                  />
                ) : (
                  <Input
                    value={formData.birth_date || ''}
                    readOnly
                    className="h-10 bg-card cursor-default"
                  />
                )}
              </FormField>

              <FormField
                label={t('customerDetailLabelNationalId')}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.national_id}
                  onChange={e => updateField('national_id', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 font-mono bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
                {(() => {
                  const v = validateNationalId(formData.national_id)
                  if (v.kind === 'empty') return null
                  const tone =
                    v.kind === 'twId' && v.checksumOk
                      ? 'text-morandi-green'
                      : v.kind === 'arcNew' && v.checksumOk
                        ? 'text-morandi-gold'
                        : v.kind === 'arcOld'
                          ? 'text-morandi-secondary'
                          : 'text-morandi-red'
                  return (
                    <p className={`text-xs mt-1 ${tone}`}>
                      {v.message}
                      {v.kind === 'invalid' && formData.passport_number === '' && isEdit && (
                        <button
                          type="button"
                          className="ml-2 underline hover:text-morandi-gold"
                          onClick={() => {
                            const idVal = formData.national_id
                            updateField('passport_number', idVal)
                            updateField('national_id', '')
                          }}
                        >
                          → 移到護照號碼
                        </button>
                      )}
                    </p>
                  )
                })()}
              </FormField>

              <FormField
                label={t('customerDetailLabelPhone')}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              <FormField
                label={t('customerDetailLabelEmail')}
                labelClassName="text-xs text-morandi-secondary"
              >
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  readOnly={!isEdit}
                  className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                />
              </FormField>

              {/* 飲食禁忌 - 佔滿兩格 */}
              <div className="col-span-2">
                <FormField
                  label={t('customerDetailLabelDietary')}
                  labelClassName="text-xs text-morandi-secondary"
                >
                  <Input
                    value={formData.dietary_restrictions}
                    onChange={e => updateField('dietary_restrictions', e.target.value)}
                    readOnly={!isEdit}
                    placeholder={isEdit ? t('customerDetailPlaceholderDietary') : ''}
                    className={`h-10 bg-card ${!isEdit ? 'cursor-default' : ''}`}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-border/50">
          {isEdit ? (
            <>
              <Button
                variant="soft-gold"
                onClick={() => {
                  resetDirty()
                  onModeChange?.('view')
                }}
                className="gap-1.5"
              >
                <X size={14} />
                {t('customerDetailBtnCancel')}
              </Button>
              <Button
                variant="soft-gold"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="gap-1.5"
              >
                <Save size={14} />
                {saving ? t('customerDetailBtnSaving') : t('customerDetailBtnConfirm')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="soft-gold" onClick={() => onOpenChange(false)} className="gap-1.5">
                <X size={14} />
                {t('customerDetailBtnClose')}
              </Button>
              <Button
                variant="soft-gold"
                onClick={() => onModeChange?.('edit')}
                className="gap-1.5"
              >
                <Edit size={14} />
                {t('customerDetailBtnEdit')}
              </Button>
            </>
          )}
        </div>
      </ManagedDialog>

      {/* 圖片編輯器 */}
      {currentStored && (
        <CustomerDialogImageEditor
          stored={currentStored}
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleEditorSave}
          onCropAndSave={handleEditorCropAndSave}
        />
      )}
    </>
  )
}
