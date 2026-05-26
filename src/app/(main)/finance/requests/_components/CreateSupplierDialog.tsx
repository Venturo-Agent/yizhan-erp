import { X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/dialog'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSupplier, invalidateSuppliers } from '@/data'
import { generateSupplierCode } from '@/lib/codes'
import { useWorkspaceId } from '@/lib/workspace-context'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import type { SupplierType } from '@/types/supplier.types'

const COMPONENT_LABELS = {
  TYPE_HOTEL: '飯店',
  TYPE_RESTAURANT: '餐廳',
  TYPE_TRANSPORT: '交通',
  TYPE_ATTRACTION: '景點',
  TYPE_GUIDE: '導遊',
  TYPE_AGENCY: '旅行社',
  TYPE_TICKETING: '票務',
  TYPE_OTHER: '其他',
  ALERT_NAME_REQUIRED: '請輸入供應商名稱',
  ALERT_TYPE_REQUIRED: '請選擇供應商類別',
  ALERT_CREATE_SUCCESS: '供應商建立成功',
  ALERT_CREATE_FAILED: '建立失敗，請稍後再試',
  TITLE: '新增供應商',
  SUPPLIER_NAME: '供應商名稱',
  SUPPLIER_NAME_PLACEHOLDER: '例：台北君悅酒店',
  TYPE: '類別',
  TYPE_PLACEHOLDER: '選擇類別',
  CONTACT_PERSON: '聯絡人',
  CONTACT_PERSON_PLACEHOLDER: '例：王小明',
  PHONE: '電話',
  PHONE_PLACEHOLDER: '例：02-2345-6789',
  EMAIL: 'Email',
  EMAIL_PLACEHOLDER: '例：contact@hotel.com',
  TAX_ID: '統編',
  TAX_ID_PLACEHOLDER: '例：12345678',
  BANK_NAME: '銀行名稱',
  BANK_NAME_PLACEHOLDER: '例：台灣銀行',
  BANK_ACCOUNT_NAME: '戶名',
  BANK_ACCOUNT_NAME_PLACEHOLDER: '例：XX旅行社有限公司',
  BANK_ACCOUNT: '銀行帳號',
  BANK_ACCOUNT_PLACEHOLDER: '例：1234-5678-9012-3456',
  NOTES: '備註',
  NOTES_PLACEHOLDER: '例：常用供應商',
  CANCEL: '取消',
  SUBMITTING: '建立中...',
  CONFIRM: '確定',
} as const

interface CreateSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName?: string // 預設名稱（從 Combobox 輸入的文字）
  onSuccess?: (supplierId: string) => void // 成功建立後回傳 supplier_id
}

const SUPPLIER_TYPE_OPTIONS: { value: SupplierType; label: string }[] = [
  { value: 'hotel', label: COMPONENT_LABELS.TYPE_HOTEL },
  { value: 'restaurant', label: COMPONENT_LABELS.TYPE_RESTAURANT },
  { value: 'transport', label: COMPONENT_LABELS.TYPE_TRANSPORT },
  { value: 'attraction', label: COMPONENT_LABELS.TYPE_ATTRACTION },
  { value: 'guide', label: COMPONENT_LABELS.TYPE_GUIDE },
  { value: 'agency', label: COMPONENT_LABELS.TYPE_AGENCY },
  { value: 'ticketing', label: COMPONENT_LABELS.TYPE_TICKETING },
  { value: 'other', label: COMPONENT_LABELS.TYPE_OTHER },
]

export function CreateSupplierDialog({
  open,
  onOpenChange,
  defaultName,
  onSuccess,
}: CreateSupplierDialogProps) {
  const workspaceId = useWorkspaceId()
  const [formData, setFormData] = useState({
    name: defaultName || '',
    type: '' as SupplierType,
    contact_person: '',
    phone: '',
    email: '',
    tax_id: '',
    bank_name: '',
    bank_account_name: '',
    bank_account: '',
    notes: '',
  })
  // 當 defaultName 改變時更新 formData.name
  useEffect(() => {
    if (defaultName && defaultName !== formData.name) {
      setFormData(prev => ({ ...prev, name: defaultName }))
    }
  }, [defaultName])

  const { isSubmitting: submitting, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      if (!formData.name.trim()) {
        void alert(COMPONENT_LABELS.ALERT_NAME_REQUIRED, 'warning')
        return
      }
      if (!formData.type) {
        void alert(COMPONENT_LABELS.ALERT_TYPE_REQUIRED, 'warning')
        return
      }
      // 自動產生流水號 S00001, S00002... — 透過 DB RPC advisory lock 防競態
      if (!workspaceId) {
        void alert('無法取得 workspace、請重新整理', 'error')
        return
      }
      const nextCode = await generateSupplierCode(workspaceId)

      const result = await createSupplier({
        name: formData.name.trim(),
        code: nextCode,
        supplier_type_code: formData.type,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        tax_id: formData.tax_id || null,
        bank_name: formData.bank_name || null,
        bank_account_name: formData.bank_account_name || null,
        bank_account: formData.bank_account || null,
        notes: formData.notes || null,
        is_active: true,
        workspace_id: workspaceId,
      })

      if (result?.id) {
        await invalidateSuppliers()
        void alert(COMPONENT_LABELS.ALERT_CREATE_SUCCESS, 'success')
        onSuccess?.(result.id)
        onOpenChange(false)

        // 重置表單
        setFormData({
          name: '',
          type: '' as SupplierType,
          contact_person: '',
          phone: '',
          email: '',
          tax_id: '',
          bank_name: '',
          bank_account_name: '',
          bank_account: '',
          notes: '',
        })
      }
    },
    {
      onError: error => {
        logger.error('Create supplier failed:', error)
        void alert(COMPONENT_LABELS.ALERT_CREATE_FAILED, 'error')
      },
    }
  )

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={() => onOpenChange(false)} disabled={submitting}>
        <X className="h-4 w-4 mr-1" />
        {COMPONENT_LABELS.CANCEL}
      </Button>
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? COMPONENT_LABELS.SUBMITTING : COMPONENT_LABELS.CONFIRM}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={COMPONENT_LABELS.TITLE}
      onSubmit={handleSubmit}
      loading={submitting}
      footer={customFooter}
      level={3}
      maxWidth="2xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
      <div className="py-4">
        {/* 必填：名稱 + 類別 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>
              {COMPONENT_LABELS.SUPPLIER_NAME} <span className="text-morandi-red">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={COMPONENT_LABELS.SUPPLIER_NAME_PLACEHOLDER}
              autoFocus
            />
          </div>
          <div>
            <Label>
              {COMPONENT_LABELS.TYPE} <span className="text-morandi-red">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, type: value as SupplierType }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={COMPONENT_LABELS.TYPE_PLACEHOLDER} />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 選填：左右兩欄 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.CONTACT_PERSON}</Label>
              <Input
                value={formData.contact_person}
                onChange={e => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder={COMPONENT_LABELS.CONTACT_PERSON_PLACEHOLDER}
              />
            </div>
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.PHONE}</Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={COMPONENT_LABELS.PHONE_PLACEHOLDER}
              />
            </div>
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.EMAIL}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={COMPONENT_LABELS.EMAIL_PLACEHOLDER}
              />
            </div>
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.TAX_ID}</Label>
              <Input
                value={formData.tax_id}
                onChange={e => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder={COMPONENT_LABELS.TAX_ID_PLACEHOLDER}
                maxLength={8}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.BANK_NAME}</Label>
              <Input
                value={formData.bank_name}
                onChange={e => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder={COMPONENT_LABELS.BANK_NAME_PLACEHOLDER}
              />
            </div>
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.BANK_ACCOUNT_NAME}</Label>
              <Input
                value={formData.bank_account_name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, bank_account_name: e.target.value }))
                }
                placeholder={COMPONENT_LABELS.BANK_ACCOUNT_NAME_PLACEHOLDER}
              />
            </div>
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.BANK_ACCOUNT}</Label>
              <Input
                value={formData.bank_account}
                onChange={e => setFormData(prev => ({ ...prev, bank_account: e.target.value }))}
                placeholder={COMPONENT_LABELS.BANK_ACCOUNT_PLACEHOLDER}
              />
            </div>
            <div>
              <Label className="text-morandi-muted">{COMPONENT_LABELS.NOTES}</Label>
              <Input
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={COMPONENT_LABELS.NOTES_PLACEHOLDER}
              />
            </div>
          </div>
        </div>
      </div>
    </FormDialog>
  )
}
