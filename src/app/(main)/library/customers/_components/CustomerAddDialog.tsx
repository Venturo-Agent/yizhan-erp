'use client'
/**
 * 新增顧客對話框
 * 功能：手動輸入 + 護照 OCR 上傳
 *
 * 使用 ManagedDialog 進行生命週期管理：
 * - 自動追蹤 dirty 狀態
 * - 關閉前確認（如有未保存的修改）
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Edit,
  Upload,
  FileImage,
  Trash2,
  CheckSquare,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { FormField } from '@/components/ui/form-field'
import { ManagedDialog, useDirtyState } from '@/components/dialog'
import type { Customer } from '@/types/customer.types'
import { usePassportUpload } from '../_hooks/usePassportUpload'
import { useIsIntegrationEnabled } from '@/lib/permissions/useIntegrationEnabled'

interface NewCustomerData {
  name: string
  email: string
  phone: string
  address: string
  passport_number: string
  passport_name: string
  passport_expiry: string
  national_id: string
  birth_date: string
}

const INITIAL_CUSTOMER: NewCustomerData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  passport_number: '',
  passport_name: '',
  passport_expiry: '',
  national_id: '',
  birth_date: '',
}

interface CustomerAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  onAddCustomer: (data: NewCustomerData) => Promise<void>
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  addCustomer: (data: Partial<Customer>) => Promise<Customer>
  onComplete?: () => void | Promise<void>
}

export function CustomerAddDialog({
  open,
  onOpenChange,
  customers,
  onAddCustomer,
  updateCustomer,
  addCustomer,
  onComplete,
}: CustomerAddDialogProps) {
  const t = useTranslations('library')
  const [newCustomer, setNewCustomer] = useState<NewCustomerData>(INITIAL_CUSTOMER)
  const [showTips, setShowTips] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  // Integration 守門：護照辨識 OCR（階段 4：沒設定就藏右邊整個 OCR 區、grid 自動 collapse）
  const { enabled: passportOcrEnabled } = useIsIntegrationEnabled('passport_ocr')

  // 使用 useDirtyState 追蹤表單變更
  const { isDirty, resetDirty, setOriginalData, checkDirty } = useDirtyState()

  // 當 Dialog 開啟時，設置原始數據
  useEffect(() => {
    if (open) {
      setOriginalData(INITIAL_CUSTOMER)
      resetDirty()
    }
  }, [open, setOriginalData, resetDirty])

  // 護照上傳 Hook
  const passportUpload = usePassportUpload({
    customers,
    updateCustomer,
    addCustomer,
    onComplete: async () => {
      if (onComplete) await onComplete()
      handleClose()
    },
  })

  // 更新欄位並追蹤 dirty 狀態
  const updateField = useCallback(
    <K extends keyof NewCustomerData>(field: K, value: NewCustomerData[K]) => {
      setNewCustomer(prev => {
        const updated = { ...prev, [field]: value }
        // 檢查是否與原始數據不同
        checkDirty(updated)
        return updated
      })
    },
    [checkDirty]
  )

  const handleClose = useCallback(() => {
    setNewCustomer(INITIAL_CUSTOMER)
    passportUpload.clearFiles()
    resetDirty()
    onOpenChange(false)
  }, [passportUpload, resetDirty, onOpenChange])

  const handleAddManually = async () => {
    await onAddCustomer(newCustomer)
    setNewCustomer(INITIAL_CUSTOMER)
    resetDirty()
    onOpenChange(false)
  }

  return (
    <ManagedDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('customerAddTitle')}
      maxWidth="4xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
      showFooter={false}
      confirmOnDirtyClose
      confirmCloseTitle={t('customerAddConfirmCloseTitle')}
      confirmCloseMessage={t('customerAddConfirmCloseMsg')}
      confirmCloseLabel={t('customerAddConfirmCloseLabel')}
      cancelCloseLabel={t('customerAddCancelCloseLabel')}
      externalDirty={isDirty || passportUpload.files.length > 0}
      onAfterClose={() => {
        setNewCustomer(INITIAL_CUSTOMER)
        passportUpload.clearFiles()
      }}
    >
      <div className={`grid ${passportOcrEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-6 py-4`}>
        {/* 左邊：手動輸入表單（OCR 沒設定時、整個 dialog 變一欄佈局） */}
        <div className={`space-y-4 ${passportOcrEnabled ? 'border-r border-border pr-6' : ''}`}>
          <div className="flex items-center gap-2 text-morandi-primary font-medium">
            <Edit size={18} />
            <span>{t('customerAddSectionManual')}</span>
          </div>
          <p className="text-sm text-morandi-secondary">{t('customerAddSectionManualDesc')}</p>

          {/* 基本資訊 - 使用 FormField 組件 */}
          <div className="space-y-3">
            <FormField label={t('customerAddLabelName')} required labelClassName="text-xs">
              <Input
                value={newCustomer.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder={t('customerAddPlaceholderName')}
                className="h-8 text-sm"
              />
            </FormField>

            <FormField label={t('customerAddLabelPhone')} required labelClassName="text-xs">
              <Input
                value={newCustomer.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder={t('customerAddPlaceholderPhone')}
                className="h-8 text-sm"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="Email" labelClassName="text-xs">
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="Email"
                  className="h-8 text-sm"
                />
              </FormField>
              <FormField label={t('customerAddLabelNationalId')} labelClassName="text-xs">
                <Input
                  value={newCustomer.national_id}
                  onChange={e => updateField('national_id', e.target.value)}
                  placeholder={t('customerAddPlaceholderNationalId')}
                  className="h-8 text-sm"
                />
              </FormField>
            </div>

            <FormField label={t('customerAddLabelPassportName')} labelClassName="text-xs">
              <Input
                value={newCustomer.passport_name}
                onChange={e => updateField('passport_name', e.target.value.toUpperCase())}
                placeholder={t('customerAddPlaceholderPassportName')}
                className="h-8 text-sm"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label={t('customerAddLabelPassportNumber')} labelClassName="text-xs">
                <Input
                  value={newCustomer.passport_number}
                  onChange={e => updateField('passport_number', e.target.value)}
                  placeholder={t('customerAddPlaceholderPassportNumber')}
                  className="h-8 text-sm"
                />
              </FormField>
              <FormField label={t('customerAddLabelPassportExpiry')} labelClassName="text-xs">
                <DatePicker
                  value={newCustomer.passport_expiry}
                  onChange={date => updateField('passport_expiry', date)}
                  className="h-8 text-sm"
                  placeholder={t('customerAddPlaceholderDate')}
                />
              </FormField>
            </div>

            <FormField label={t('customerAddLabelBirthDate')} labelClassName="text-xs">
              <DatePicker
                value={newCustomer.birth_date}
                onChange={date => updateField('birth_date', date)}
                className="h-8 text-sm"
                placeholder={t('customerAddPlaceholderDate')}
              />
            </FormField>
          </div>

          <Button
            variant="morandi-gold"
            onClick={handleAddManually}
            disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()}
            className="w-full gap-2"
          >
            <CheckSquare size={16} />
            {t('customerAddBtnManual')}
          </Button>
        </div>

        {/* 右邊：上傳護照 OCR 辨識（沒設 passport_ocr integration 時整個藏掉） */}
        {passportOcrEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-morandi-primary font-medium">
              <Upload size={18} />
              <span>{t('customerAddSectionOcr')}</span>
            </div>
            <p className="text-sm text-morandi-secondary">{t('customerAddSectionOcrDesc')}</p>

            {/* 上傳區域 - 固定在上方 */}
            <label
              htmlFor="passport-upload"
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                passportUpload.isDragging
                  ? 'border-morandi-gold bg-morandi-gold/20 scale-105'
                  : 'border-morandi-secondary/30 bg-morandi-container/20 hover:bg-morandi-container/40'
              }`}
              onDragOver={passportUpload.handleDragOver}
              onDragLeave={passportUpload.handleDragLeave}
              onDrop={passportUpload.handleDrop}
            >
              <div className="flex flex-col items-center justify-center py-4">
                <Upload className="w-6 h-6 mb-2 text-morandi-secondary" />
                <p className="text-sm text-morandi-primary">
                  <span className="font-semibold">{t('customerAddUploadClick')}</span>{' '}
                  {t('customerAddUploadDrag')}
                </p>
                <p className="text-xs text-morandi-secondary">{t('customerAddUploadFormats')}</p>
              </div>
              <input
                id="passport-upload"
                type="file"
                className="hidden"
                accept="image/*,.pdf,application/pdf"
                multiple
                onChange={passportUpload.handleFileChange}
                disabled={passportUpload.isUploading}
              />
            </label>

            {/* 辨識按鈕 - 固定在檔案列表上方 */}
            {passportUpload.files.length > 0 && (
              <Button
                variant="soft-gold"
                onClick={passportUpload.processFiles}
                disabled={passportUpload.isUploading}
                className="w-full gap-2"
              >
                <Upload size={16} />
                {passportUpload.isUploading
                  ? t('customerAddOcrProcessing')
                  : t('customerAddOcrProcessBtn', { count: passportUpload.files.length })}
              </Button>
            )}

            {/* 已選檔案列表 */}
            {passportUpload.files.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-morandi-secondary">
                  {t('customerAddFilesSelected', { count: passportUpload.files.length })}
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {passportUpload.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-morandi-container/20 rounded"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileImage size={14} className="text-morandi-gold flex-shrink-0" />
                        <span className="text-xs text-morandi-primary truncate">{file.name}</span>
                        <span className="text-xs text-morandi-secondary flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          passportUpload.removeFile(index)
                        }}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-status-danger-bg rounded transition-colors"
                        disabled={passportUpload.isUploading}
                      >
                        <Trash2 size={12} className="text-status-danger" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 重要提醒 - 可展開 */}
            <div className="border border-status-info/30 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReminder(!showReminder)}
                className="w-full flex items-center justify-between p-2 bg-status-info-bg hover:bg-status-info-bg/80 transition-colors"
              >
                <span className="text-xs font-medium text-morandi-primary">
                  {t('customerAddSectionReminder')}
                </span>
                {showReminder ? (
                  <ChevronDown size={14} className="text-morandi-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-morandi-secondary" />
                )}
              </button>
              {showReminder && (
                <ul className="text-xs text-morandi-secondary space-y-1 p-3 pt-2">
                  <li>
                    {t('customerAddReminder1')}
                    <strong>{t('customerAddReminder1Strong')}</strong>
                  </li>
                  <li>
                    {t('customerAddReminder2Prefix')}
                    <strong>{t('customerAddReminder2Strong')}</strong>
                  </li>
                  <li>{t('customerAddReminder3')}</li>
                </ul>
              )}
            </div>

            {/* 拍攝建議 - 可展開 */}
            <div className="border border-status-warning/30 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTips(!showTips)}
                className="w-full flex items-center justify-between p-2 bg-status-warning-bg hover:bg-status-warning-bg/80 transition-colors"
              >
                <span className="text-xs font-medium text-morandi-primary">
                  {t('customerAddSectionTips')}
                </span>
                {showTips ? (
                  <ChevronDown size={14} className="text-morandi-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-morandi-secondary" />
                )}
              </button>
              {showTips && (
                <ul className="text-xs text-morandi-secondary space-y-1 p-3 pt-2">
                  <li>
                    {t('customerAddTip1Prefix')}
                    <strong>{t('customerAddTip1Strong')}</strong>
                    {t('customerAddTip1Suffix')}
                  </li>
                  <li>{t('customerAddTip2')}</li>
                  <li>{t('customerAddTip3')}</li>
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button variant="soft-gold" onClick={handleClose} className="gap-2">
          <X size={16} />
          {t('customerAddBtnCancel')}
        </Button>
      </div>
    </ManagedDialog>
  )
}
