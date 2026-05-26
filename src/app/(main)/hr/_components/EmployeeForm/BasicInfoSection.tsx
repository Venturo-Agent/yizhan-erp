'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'

// 小標題統一樣式：比照公司設定（CompanyInfoCard）的 Label，不再各頁散刻
const LABEL_CLASS = 'text-sm font-medium text-morandi-primary'

const LABELS = {
  CHINESE_NAME: '中文姓名',
  JOB_TITLE: '職稱',
  ROLE: '職務',
  ROLE_NOT_ASSIGNED: '尚未指派',
  ROLE_NOTE: '（由主管指派，如需調整請聯絡 HR）',
  SELECT_ROLE: '請選擇職務',
  BRANCH: '分公司',
  EMAIL: 'Email',
  PHONE: '手機',
  BIRTHDAY: '生日',
  ID_NUMBER: '身分證',
  ADDRESS: '地址',
  EMERGENCY_CONTACT: '緊急聯絡人',
  CONTACT_NAME: '姓名',
  CONTACT_RELATION: '關係',
  CONTACT_PHONE: '電話',
  CONTACT_ADDRESS: '地址',
} as const

interface Role {
  id: string
  name: string
}

interface ScopeOption {
  id: string
  name: string
}

interface BasicInfoSectionProps {
  mode: 'hr' | 'self'
  isEditMode: boolean
  formData: {
    chinese_name: string
    display_name: string
    job_title: string
    role_id: string
    branch_id: string
    email: string
    phone: string
    birth_date: string
    id_number: string
    address: string
    emergency_contact_name: string
    emergency_contact_relation: string
    emergency_contact_phone: string
    emergency_contact_address: string
  }
  roles: Role[]
  branches: ScopeOption[]
  onChange: (patch: Partial<BasicInfoSectionProps['formData']>) => void
  onCreateBranch: () => void
}

export function BasicInfoSection({
  mode,
  isEditMode,
  formData,
  roles,
  branches,
  onChange,
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-5">
      {/* 第一排：中文姓名 / 職務 / 職稱（HR 模式多一欄分公司）
          5/26 William 拍板：拔「顯示名稱」、全站統一用中文姓名（存檔時 display_name 鏡像 chinese_name） */}
      <div className={`grid gap-4 ${mode === 'hr' ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {/* 中文姓名（不顯示米字號；self 模式唯讀、不可自改） */}
        <div className="space-y-1.5" data-tutorial="field-chinese_name">
          <Label className={LABEL_CLASS}>{LABELS.CHINESE_NAME}</Label>
          {mode === 'self' ? (
            <Input value={formData.chinese_name} disabled />
          ) : (
            <Input
              required
              value={formData.chinese_name}
              onChange={e => onChange({ chinese_name: e.target.value })}
            />
          )}
        </div>

        {/* 職務（權限角色） */}
        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>
            {LABELS.ROLE}{' '}
            {!isEditMode && mode === 'hr' && <span className="text-status-danger">*</span>}
          </Label>
          {mode === 'self' ? (
            // 個人設定：唯讀，職務由 HR 指派不可自改
            <div className="w-full px-3 py-2 border border-input rounded-lg bg-morandi-container/30 text-morandi-primary text-sm">
              {roles.find(r => r.id === formData.role_id)?.name || LABELS.ROLE_NOT_ASSIGNED}
              <span className="ml-2 text-xs text-morandi-muted">{LABELS.ROLE_NOTE}</span>
            </div>
          ) : (
            <select
              value={formData.role_id}
              onChange={e => onChange({ role_id: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary"
            >
              <option value="">{LABELS.SELECT_ROLE}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 職稱 */}
        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>{LABELS.JOB_TITLE}</Label>
          <Input
            value={formData.job_title}
            onChange={e => onChange({ job_title: e.target.value })}
          />
        </div>

        {/* 分公司（HR 模式才顯示；有分公司=第一排 4 欄、無=3 欄） */}
        {mode === 'hr' && (
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>{LABELS.BRANCH}</Label>
            {/* 2026-05-14 William 拍板：單一公司直接顯示、不下拉、不寫未分配 */}
            {branches.length === 1 ? (
              <div className="w-full px-3 py-2 border border-input rounded-lg bg-morandi-background/50 text-morandi-primary">
                {branches[0].name}
              </div>
            ) : (
              <select
                value={formData.branch_id || (branches[0]?.id ?? '')}
                onChange={e => onChange({ branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* 5/24 純角色 SSOT：移除「個人資格」勾選。業務/團控/代墊 等指派候選改由「職務權限」決定（/hr/roles 勾能力給職務）、不再在員工頁逐人勾。 */}

      {/* 聯絡資訊 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5" data-tutorial="field-email">
          <Label className={LABEL_CLASS}>
            {LABELS.EMAIL} <span className="text-status-danger">*</span>
          </Label>
          <Input
            required
            type="email"
            value={formData.email}
            onChange={e => onChange({ email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>{LABELS.PHONE}</Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={e => onChange({ phone: e.target.value })}
          />
        </div>
      </div>

      {/* 個人資訊 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>{LABELS.BIRTHDAY}</Label>
          <DatePicker value={formData.birth_date} onChange={v => onChange({ birth_date: v })} />
        </div>
        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>{LABELS.ID_NUMBER}</Label>
          <Input
            value={formData.id_number}
            onChange={e => onChange({ id_number: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>{LABELS.ADDRESS}</Label>
          <Input value={formData.address} onChange={e => onChange({ address: e.target.value })} />
        </div>
      </div>

      {/* 緊急聯絡人 */}
      <div className="pt-4">
        <h4 className="text-sm font-semibold text-morandi-primary mb-3">
          {LABELS.EMERGENCY_CONTACT}
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>{LABELS.CONTACT_NAME}</Label>
            <Input
              value={formData.emergency_contact_name}
              onChange={e => onChange({ emergency_contact_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>{LABELS.CONTACT_RELATION}</Label>
            <Input
              value={formData.emergency_contact_relation}
              onChange={e => onChange({ emergency_contact_relation: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>{LABELS.CONTACT_PHONE}</Label>
            <Input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={e => onChange({ emergency_contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL_CLASS}>{LABELS.CONTACT_ADDRESS}</Label>
            <Input
              value={formData.emergency_contact_address}
              onChange={e => onChange({ emergency_contact_address: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
