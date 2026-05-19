'use client'
/**
 * SuppliersDialog - 供應商對話框（完整資訊）
 */

import React from 'react'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BankCombobox } from '@/components/bank-combobox'

import { useTranslations } from 'next-intl'
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
  SUPPLIER_NAME: '供應商名稱',
  SUPPLIER_NAME_PLACEHOLDER: '例：台銀',
  SUPPLIER_CODE: '供應商編號',
  SUPPLIER_CODE_PLACEHOLDER: '系統自動產生或手動輸入',
  COMPANY_FULL_NAME: '公司全名',
  COMPANY_FULL_NAME_PLACEHOLDER: '例：台灣銀行股份有限公司',
  TAX_ID: '公司統編',
  TAX_ID_PLACEHOLDER: '例：12345678',
  BANK_NAME: '銀行',
  BANK_BRANCH: '分行',
  BANK_NAME_PLACEHOLDER: '例：台灣銀行',
  BANK_BRANCH_PLACEHOLDER: '例：營業部',
  BANK_PICKER_PLACEHOLDER: '選擇銀行（004 / 822 ...）',
  BANK_ACCOUNT_NAME: '銀行戶名',
  BANK_ACCOUNT_NAME_PLACEHOLDER: '例：XX旅行社有限公司',
  BANK_ACCOUNT: '銀行帳號',
  BANK_ACCOUNT_PLACEHOLDER: '例：1234-5678-9012-3456',
  CONTACT_PERSON: '聯絡窗口',
  CONTACT_PERSON_PLACEHOLDER: '例：王小明',
  PHONE: '聯絡電話',
  PHONE_PLACEHOLDER: '例：02-2345-6789',
  EMAIL: '電子郵件',
  EMAIL_PLACEHOLDER: '例：contact@hotel.com',
  ADDRESS: '通訊地址',
  ADDRESS_PLACEHOLDER: '例：台北市中正區...',
  NOTES: '備註',
  NOTES_PLACEHOLDER: '例：常用供應商，付款條件淨30天',
} as const

export const SUPPLIER_TYPE_OPTIONS: { value: SupplierType; label: string }[] = [
  { value: 'hotel', label: COMPONENT_LABELS.TYPE_HOTEL },
  { value: 'restaurant', label: COMPONENT_LABELS.TYPE_RESTAURANT },
  { value: 'transport', label: COMPONENT_LABELS.TYPE_TRANSPORT },
  { value: 'attraction', label: COMPONENT_LABELS.TYPE_ATTRACTION },
  { value: 'guide', label: COMPONENT_LABELS.TYPE_GUIDE },
  { value: 'agency', label: COMPONENT_LABELS.TYPE_AGENCY },
  { value: 'ticketing', label: COMPONENT_LABELS.TYPE_TICKETING },
  { value: 'other', label: COMPONENT_LABELS.TYPE_OTHER },
]

type SupplierFormData = {
  name: string
  code: string
  english_name: string
  tax_id: string
  is_domestic: boolean // onboarding fix pack 2026-05-10
  bank_code: string // FK to ref_banks（is_domestic=true 用）
  swift_code: string // is_domestic=false 用
  bank_name: string
  bank_branch: string
  bank_account_name: string
  bank_account: string
  contact_person: string
  phone: string
  email: string
  address: string
  notes: string
}

interface SuppliersDialogProps {
  isOpen: boolean
  onClose: () => void
  formData: SupplierFormData
  onFormFieldChange: <K extends keyof SupplierFormData>(
    field: K,
    value: SupplierFormData[K]
  ) => void
  onSubmit: () => void
  isEditMode?: boolean
  /** 提交中、防連點（FormDialog 會 disable submit button + 顯示「處理中...」） */
  loading?: boolean
}

export const SuppliersDialog: React.FC<SuppliersDialogProps> = ({
  isOpen,
  onClose,
  formData,
  onFormFieldChange,
  onSubmit,
  isEditMode = false,
  loading = false,
}) => {
  const t = useTranslations('library')
  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      title={isEditMode ? t('supplierEditTitle') : t('supplierAddTitle')}
      subtitle={isEditMode ? t('supplierEditSubtitle') : t('supplierAddSubtitle')}
      onSubmit={onSubmit}
      submitLabel={isEditMode ? t('supplierSaveChanges') : t('supplierAddTitle')}
      submitDisabled={!formData.name}
      loading={loading}
      maxWidth="2xl"
    >
      <div className="space-y-3">
        {/* 第1列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>
              {COMPONENT_LABELS.SUPPLIER_NAME} <span className="text-morandi-red">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={e => onFormFieldChange('name', e.target.value)}
              placeholder={COMPONENT_LABELS.SUPPLIER_NAME_PLACEHOLDER}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{COMPONENT_LABELS.SUPPLIER_CODE}</Label>
            <Input
              value={formData.code}
              onChange={e => onFormFieldChange('code', e.target.value)}
              placeholder={COMPONENT_LABELS.SUPPLIER_CODE_PLACEHOLDER}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第2列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{COMPONENT_LABELS.COMPANY_FULL_NAME}</Label>
            <Input
              value={formData.english_name}
              onChange={e => onFormFieldChange('english_name', e.target.value)}
              placeholder={COMPONENT_LABELS.COMPANY_FULL_NAME_PLACEHOLDER}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{COMPONENT_LABELS.TAX_ID}</Label>
            <Input
              value={formData.tax_id}
              onChange={e => onFormFieldChange('tax_id', e.target.value)}
              placeholder={COMPONENT_LABELS.TAX_ID_PLACEHOLDER}
              maxLength={8}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第 2.5 列：國內 / 國外 radio（onboarding fix pack 2026-05-10） */}
        <div className="bg-morandi-container/10 rounded-md p-3">
          <Label className="block mb-2">供應商類型</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="supplier-is-domestic"
                checked={formData.is_domestic}
                onChange={() => {
                  onFormFieldChange('is_domestic', true)
                  // 切回國內、清掉 SWIFT
                  onFormFieldChange('swift_code', '')
                }}
                className="h-4 w-4"
              />
              <span className="text-sm">臺灣國內（走銀行代號 + 自動手續費辨識）</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="supplier-is-domestic"
                checked={!formData.is_domestic}
                onChange={() => {
                  onFormFieldChange('is_domestic', false)
                  // 切去國外、清掉 bank_code
                  onFormFieldChange('bank_code', '')
                }}
                className="h-4 w-4"
              />
              <span className="text-sm">國外（手續費不自動辨識、需 SWIFT）</span>
            </label>
          </div>
        </div>

        {/* 第3列：銀行（國內下拉 / 國外文字）+ 分行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{COMPONENT_LABELS.BANK_NAME}</Label>
            {formData.is_domestic ? (
              <div className="mt-1">
                <BankCombobox
                  value={formData.bank_code}
                  onChange={v => onFormFieldChange('bank_code', v)}
                  onSelect={ref => {
                    onFormFieldChange('bank_name', ref?.bank_name ?? '')
                  }}
                  placeholder={COMPONENT_LABELS.BANK_PICKER_PLACEHOLDER}
                  disablePortal
                />
              </div>
            ) : (
              <Input
                value={formData.bank_name}
                onChange={e => onFormFieldChange('bank_name', e.target.value)}
                placeholder={COMPONENT_LABELS.BANK_NAME_PLACEHOLDER}
                className="mt-1"
              />
            )}
          </div>
          <div>
            <Label>{COMPONENT_LABELS.BANK_BRANCH}</Label>
            <Input
              value={formData.bank_branch}
              onChange={e => onFormFieldChange('bank_branch', e.target.value)}
              placeholder={COMPONENT_LABELS.BANK_BRANCH_PLACEHOLDER}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第 3.5 列：SWIFT（只國外才出現） */}
        {!formData.is_domestic && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SWIFT Code</Label>
              <Input
                value={formData.swift_code}
                onChange={e => onFormFieldChange('swift_code', e.target.value.toUpperCase())}
                placeholder="例：HSBCTWTP"
                maxLength={11}
                className="mt-1 font-mono"
              />
            </div>
          </div>
        )}

        {/* 第4列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{COMPONENT_LABELS.BANK_ACCOUNT_NAME}</Label>
            <Input
              value={formData.bank_account_name}
              onChange={e => onFormFieldChange('bank_account_name', e.target.value)}
              placeholder={COMPONENT_LABELS.BANK_ACCOUNT_NAME_PLACEHOLDER}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{COMPONENT_LABELS.BANK_ACCOUNT}</Label>
            <Input
              value={formData.bank_account}
              onChange={e => onFormFieldChange('bank_account', e.target.value)}
              placeholder={COMPONENT_LABELS.BANK_ACCOUNT_PLACEHOLDER}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第5列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{COMPONENT_LABELS.CONTACT_PERSON}</Label>
            <Input
              value={formData.contact_person}
              onChange={e => onFormFieldChange('contact_person', e.target.value)}
              placeholder={COMPONENT_LABELS.CONTACT_PERSON_PLACEHOLDER}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{COMPONENT_LABELS.PHONE}</Label>
            <Input
              value={formData.phone}
              onChange={e => onFormFieldChange('phone', e.target.value)}
              placeholder={COMPONENT_LABELS.PHONE_PLACEHOLDER}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第6列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{COMPONENT_LABELS.EMAIL}</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => onFormFieldChange('email', e.target.value)}
              placeholder={COMPONENT_LABELS.EMAIL_PLACEHOLDER}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{COMPONENT_LABELS.ADDRESS}</Label>
            <Input
              value={formData.address}
              onChange={e => onFormFieldChange('address', e.target.value)}
              placeholder={COMPONENT_LABELS.ADDRESS_PLACEHOLDER}
              className="mt-1"
            />
          </div>
        </div>

        {/* 第7列：備註（橫跨兩欄）*/}
        <div>
          <Label>{COMPONENT_LABELS.NOTES}</Label>
          <Textarea
            value={formData.notes}
            onChange={e => onFormFieldChange('notes', e.target.value)}
            placeholder={COMPONENT_LABELS.NOTES_PLACEHOLDER}
            rows={3}
            className="mt-1"
          />
        </div>
      </div>
    </FormDialog>
  )
}
