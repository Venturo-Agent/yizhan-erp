'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  Heart,
} from 'lucide-react'

const LABELS = {
  CHINESE_NAME: '中文姓名',
  CHINESE_NAME_PLACEHOLDER: '例：簡威廉',
  DISPLAY_NAME: '顯示名稱',
  DISPLAY_NAME_PLACEHOLDER: '例：William',
  JOB_TITLE: '職稱（名片用）',
  JOB_TITLE_PLACEHOLDER: '例：資深業務經理、副總經理',
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
  ADDRESS_PLACEHOLDER: '台北市...',
  EMERGENCY_CONTACT: '緊急聯絡人',
  CONTACT_NAME: '姓名',
  CONTACT_RELATION: '關係',
  CONTACT_RELATION_PLACEHOLDER: '例：配偶',
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
      {/* 姓名區塊 — 5/15 William 拍板拔英文姓名（用不到、未來真要再加） */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5" data-tutorial="field-chinese_name">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.CHINESE_NAME} <span className="text-morandi-red">*</span>
          </Label>
          <Input
            required
            value={formData.chinese_name}
            onChange={e => onChange({ chinese_name: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder={LABELS.CHINESE_NAME_PLACEHOLDER}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.DISPLAY_NAME}
          </Label>
          <Input
            value={formData.display_name}
            onChange={e => onChange({ display_name: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder={LABELS.DISPLAY_NAME_PLACEHOLDER}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.JOB_TITLE}
          </Label>
          <Input
            value={formData.job_title}
            onChange={e => onChange({ job_title: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder={LABELS.JOB_TITLE_PLACEHOLDER}
          />
        </div>
      </div>

      {/* 職務（權限角色） */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-morandi-primary uppercase">
          {LABELS.ROLE}{' '}
          {!isEditMode && mode === 'hr' && <span className="text-morandi-red">*</span>}
        </Label>
        {mode === 'self' ? (
          // 個人設定：唯讀，職務由 HR 指派不可自改
          <div className="w-full px-3 py-2 border border-morandi-gold/20 rounded-lg bg-morandi-container/30 text-morandi-primary text-sm">
            {roles.find(r => r.id === formData.role_id)?.name || LABELS.ROLE_NOT_ASSIGNED}
            <span className="ml-2 text-xs text-morandi-muted">
              {LABELS.ROLE_NOTE}
            </span>
          </div>
        ) : (
          <select
            value={formData.role_id}
            onChange={e => onChange({ role_id: e.target.value })}
            className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary"
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

      {/* Phase A：分公司（HR 模式才顯示） */}
      {mode === 'hr' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.BRANCH}
            </Label>
            {/* 2026-05-14 William 拍板：單一公司直接顯示、不下拉、不寫未分配 */}
            {branches.length === 1 ? (
              <div className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg bg-morandi-background/50 text-morandi-primary">
                {branches[0].name}
              </div>
            ) : (
              <select
                value={formData.branch_id || (branches[0]?.id ?? '')}
                onChange={e => onChange({ branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* 5/24 純角色 SSOT：移除「個人資格」勾選。業務/團控/代墊 等指派候選改由「職務權限」決定（/hr/roles 勾能力給職務）、不再在員工頁逐人勾。 */}

      {/* 聯絡資訊 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5" data-tutorial="field-email">
          <Label className="text-xs font-semibold text-morandi-primary uppercase flex items-center gap-1">
            <Mail size={12} /> Email <span className="text-morandi-red">*</span>
          </Label>
          <Input
            required
            type="email"
            value={formData.email}
            onChange={e => onChange({ email: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder="name@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase flex items-center gap-1">
            <Phone size={12} /> {LABELS.PHONE}
          </Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={e => onChange({ phone: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder="0912-345-678"
          />
        </div>
      </div>

      {/* 個人資訊 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase flex items-center gap-1">
            <Calendar size={12} /> {LABELS.BIRTHDAY}
          </Label>
          <DatePicker
            value={formData.birth_date}
            onChange={v => onChange({ birth_date: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase flex items-center gap-1">
            <CreditCard size={12} /> {LABELS.ID_NUMBER}
          </Label>
          <Input
            value={formData.id_number}
            onChange={e => onChange({ id_number: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder="A123456789"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase flex items-center gap-1">
            <MapPin size={12} /> {LABELS.ADDRESS}
          </Label>
          <Input
            value={formData.address}
            onChange={e => onChange({ address: e.target.value })}
            className="border-morandi-gold/30 focus:border-morandi-gold"
            placeholder={LABELS.ADDRESS_PLACEHOLDER}
          />
        </div>
      </div>

      {/* 緊急聯絡人 */}
      <div className="pt-4">
        <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
          <Heart size={14} className="text-morandi-gold" />
          {LABELS.EMERGENCY_CONTACT}
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.CONTACT_NAME}
            </Label>
            <Input
              value={formData.emergency_contact_name}
              onChange={e => onChange({ emergency_contact_name: e.target.value })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.CONTACT_RELATION}
            </Label>
            <Input
              value={formData.emergency_contact_relation}
              onChange={e => onChange({ emergency_contact_relation: e.target.value })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
              placeholder={LABELS.CONTACT_RELATION_PLACEHOLDER}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.CONTACT_PHONE}
            </Label>
            <Input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={e => onChange({ emergency_contact_phone: e.target.value })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.CONTACT_ADDRESS}
            </Label>
            <Input
              value={formData.emergency_contact_address}
              onChange={e => onChange({ emergency_contact_address: e.target.value })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
