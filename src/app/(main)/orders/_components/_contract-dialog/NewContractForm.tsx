'use client'

// ============================================
// 子元件：新建合約表單（左側）
// ============================================
// 仿 _invoice-dialog/NewInvoiceForm：團員 checkbox + 全選 + 已選計數。
// 合約專屬：代表人下拉（從勾選的人裡選）、簽約對象（個人/公司）、附件開關。

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { OrderMember } from '../../_types/order-member.types'
import type { SignerType } from './contract-dialog.types'
import { CONTRACT_LABELS as L } from '@/app/(main)/orders/_contracts/constants/labels'

interface NewContractFormProps {
  availableMembers: OrderMember[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void

  signerType: SignerType
  setSignerType: (t: SignerType) => void
  repMemberId: string
  onSelectRep: (memberId: string) => void

  signerName: string
  setSignerName: (v: string) => void
  signerIdNumber: string
  setSignerIdNumber: (v: string) => void
  signerPhone: string
  setSignerPhone: (v: string) => void
  companyName: string
  setCompanyName: (v: string) => void
  companyTaxId: string
  setCompanyTaxId: (v: string) => void
  companyRepresentative: string
  setCompanyRepresentative: (v: string) => void

  includeMemberList: boolean
  setIncludeMemberList: (v: boolean) => void
  includeItinerary: boolean
  setIncludeItinerary: (v: boolean) => void
}

export function NewContractForm({
  availableMembers,
  selected,
  onToggle,
  onSelectAll,
  signerType,
  setSignerType,
  repMemberId,
  onSelectRep,
  signerName,
  setSignerName,
  signerIdNumber,
  setSignerIdNumber,
  signerPhone,
  setSignerPhone,
  companyName,
  setCompanyName,
  companyTaxId,
  setCompanyTaxId,
  companyRepresentative,
  setCompanyRepresentative,
  includeMemberList,
  setIncludeMemberList,
  includeItinerary,
  setIncludeItinerary,
}: NewContractFormProps) {
  // 代表人下拉只能從「已勾選」的團員裡挑
  const selectedMembers = availableMembers.filter(m => selected.has(m.id))

  return (
    <div className="space-y-4">
      {/* 團員勾選（仿帳單）*/}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          {selected.size === availableMembers.length ? L.BATCH_UNSELECT_ALL : L.BATCH_SELECT_ALL}
        </Button>
        <span className="text-sm text-morandi-secondary">
          {L.BATCH_SELECTED_COUNT} {selected.size} / {availableMembers.length} {L.PEOPLE_SUFFIX}
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_140px] gap-2 px-3 py-2 text-xs font-medium text-morandi-secondary bg-morandi-container border-b border-border">
          <div></div>
          <div>{L.NAME_PLACEHOLDER}</div>
          <div>{L.ID_NUMBER}</div>
        </div>
        <div className="divide-y max-h-[40vh] overflow-y-auto">
          {availableMembers.map(member => {
            const enabled = selected.has(member.id)
            return (
              <div
                key={member.id}
                className="grid grid-cols-[28px_1fr_140px] gap-2 items-center px-3 py-2 hover:bg-morandi-container"
              >
                <Checkbox checked={enabled} onCheckedChange={() => onToggle(member.id)} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {member.chinese_name || member.passport_name || '(未命名)'}
                  </div>
                </div>
                <div className="text-xs text-morandi-secondary truncate">
                  {member.id_number || '-'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 代表人（從勾選的人裡選）*/}
      <div className="space-y-2">
        <Label>{L.BATCH_REP}</Label>
        <select
          value={repMemberId}
          onChange={e => onSelectRep(e.target.value)}
          disabled={selectedMembers.length === 0}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50"
        >
          <option value="">{L.BATCH_REP_PLACEHOLDER}</option>
          {selectedMembers.map(m => (
            <option key={m.id} value={m.id}>
              {m.chinese_name || m.passport_name || m.id}
            </option>
          ))}
        </select>
        <p className="text-xs text-morandi-secondary">{L.BATCH_REP_HINT}</p>
      </div>

      {/* 簽約對象（沿用舊 dialog 欄位）*/}
      <div className="space-y-2">
        <Label>{L.SIGNER_TYPE}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={signerType === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSignerType('individual')}
          >
            {L.TYPE_INDIVIDUAL}
          </Button>
          <Button
            type="button"
            variant={signerType === 'company' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSignerType('company')}
          >
            {L.TYPE_COMPANY}
          </Button>
        </div>
      </div>

      {signerType === 'company' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{L.COMPANY_NAME}</Label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder={L.COMPANY_NAME_PLACEHOLDER}
            />
          </div>
          <div className="space-y-2">
            <Label>{L.COMPANY_TAX_ID}</Label>
            <Input
              value={companyTaxId}
              onChange={e => setCompanyTaxId(e.target.value)}
              placeholder={L.OPTIONAL_PLACEHOLDER}
            />
          </div>
          <div className="space-y-2">
            <Label>{L.COMPANY_REPRESENTATIVE}</Label>
            <Input
              value={companyRepresentative}
              onChange={e => setCompanyRepresentative(e.target.value)}
              placeholder={L.NAME_PLACEHOLDER}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{L.SIGNER_NAME}</Label>
          <Input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder={L.NAME_PLACEHOLDER}
          />
        </div>
        <div className="space-y-2">
          <Label>{L.PHONE}</Label>
          <Input
            value={signerPhone}
            onChange={e => setSignerPhone(e.target.value)}
            placeholder={L.PHONE_PLACEHOLDER}
          />
        </div>
        <div className="space-y-2">
          <Label>{L.ID_NUMBER}</Label>
          <Input
            value={signerIdNumber}
            onChange={e => setSignerIdNumber(e.target.value)}
            placeholder={L.OPTIONAL_PLACEHOLDER}
          />
        </div>
      </div>

      {/* 附件 */}
      <div className="space-y-2">
        <Label>{L.ATTACHMENTS}</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm text-morandi-secondary">{L.ATTACH_ITINERARY}</span>
          <Switch checked={includeItinerary} onCheckedChange={setIncludeItinerary} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-morandi-secondary">{L.ATTACH_MEMBER_LIST}</span>
          <Switch checked={includeMemberList} onCheckedChange={setIncludeMemberList} />
        </div>
      </div>
    </div>
  )
}
