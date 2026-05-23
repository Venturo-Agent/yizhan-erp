'use client'

/**
 * OrderContractDialog — 訂單合約管理（跟著訂單走、業務自行處理）
 *
 * 2026-05-24 建：合約管理系統 P3。
 *   - 無合約 → 建立表單：選代表人(自動帶姓名/身分證) + 簽約對象 + 集合資訊 + 附件 → POST /api/contracts/create
 *   - 有合約 → 狀態檢視：列印 PDF / 複製簽約連結 / 開啟簽署頁
 * 文案走 _contracts/constants/labels.ts（CONTRACT_LABELS）。寫入後 invalidateContracts。
 *
 * 待 William 醒來可加（已留 TODO、需決策/API）：
 *   - 集合時間自動帶「起飛前 3 小時」（需接 itinerary 航班資料）
 *   - 取消 / 重新產生（需確認 API endpoint）
 *   - 整團合約（order_id null、需改 create API 讓 orderId 可選）
 */

import { useState } from 'react'
import { FormDialog } from '@/components/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { Printer, Link2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiPost } from '@/lib/api/client'
import { useContracts, invalidateContracts, useOrderMembers } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import type { Order } from '@/stores/types'
import {
  CONTRACT_LABELS as L,
  CONTRACT_STATUS_LABELS,
} from './constants/labels'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
}

const STATUS_TONE: Record<string, StatusTone> = {
  draft: 'pending',
  sent: 'warning',
  signed: 'success',
  cancelled: 'neutral',
}

export function OrderContractDialog({ open, onOpenChange, order }: Props) {
  const { user } = useAuthStore()
  const { items: contracts } = useContracts({ all: true, filter: { order_id: order.id } })
  const { items: members } = useOrderMembers({ all: true, filter: { order_id: order.id } })
  // 取最新一張（建立時間降序、entity hook 已排序）、排除已取消
  const existing = (contracts ?? []).find(c => c.status !== 'cancelled') ?? null

  // 建立表單 state
  const [signerType, setSignerType] = useState<'individual' | 'company'>('individual')
  const [repMemberId, setRepMemberId] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerIdNumber, setSignerIdNumber] = useState('')
  const [signerPhone, setSignerPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [companyRepresentative, setCompanyRepresentative] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [includeItinerary, setIncludeItinerary] = useState(true)
  const [includeMemberList, setIncludeMemberList] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 選代表人 → 自動帶姓名 / 身分證（order_members 有 chinese_name / id_number）
  const handleSelectRep = (memberId: string) => {
    setRepMemberId(memberId)
    const m = (members ?? []).find(x => x.id === memberId)
    if (m) {
      if (m.chinese_name) setSignerName(m.chinese_name)
      if (m.id_number) setSignerIdNumber(m.id_number)
    }
  }

  const handleCreate = async () => {
    if (signerType === 'individual' && !signerName.trim()) {
      toast.error(L.VALIDATION_NEED_NAME)
      return
    }
    if (signerType === 'company' && !companyName.trim()) {
      toast.error(L.VALIDATION_NEED_COMPANY)
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/api/contracts/create', {
        orderId: order.id,
        signerType,
        signerName: signerName.trim() || companyRepresentative.trim() || companyName.trim(),
        signerIdNumber: signerIdNumber || undefined,
        signerPhone: signerPhone || undefined,
        companyName: signerType === 'company' ? companyName.trim() : undefined,
        companyTaxId: signerType === 'company' ? companyTaxId || undefined : undefined,
        companyRepresentative:
          signerType === 'company' ? companyRepresentative || undefined : undefined,
        contractData: {
          meeting_location: meetingLocation || null,
          meeting_time: meetingTime || null,
        },
        createdBy: user?.id || undefined,
        includeItinerary,
        includeMemberList,
      })
      await invalidateContracts()
      toast.success(L.TOAST_CREATED)
    } catch (err) {
      logger.error('建立合約失敗', err)
      toast.error(L.TOAST_CREATE_FAIL)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    if (existing) window.open(`/api/contracts/${existing.id}/pdf`, '_blank')
  }
  const signUrl = existing
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/contract/sign/${existing.code}`
    : ''
  const handleCopyLink = async () => {
    if (!signUrl) return
    try {
      await navigator.clipboard.writeText(signUrl)
      toast.success(L.TOAST_LINK_COPIED)
    } catch {
      toast.error(L.TOAST_OP_FAIL)
    }
  }
  const handleOpenSign = () => {
    if (signUrl) window.open(signUrl, '_blank')
  }

  // ─── 有合約：狀態檢視 ───
  if (existing) {
    const status = existing.status ?? 'draft'
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={L.DIALOG_TITLE}
        maxWidth="md"
        level={2}
        loading={false}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={handleOpenSign}>
              <ExternalLink className="h-4 w-4 mr-1" />
              {L.OPEN_SIGN_PAGE}
            </Button>
            <Button variant="outline" onClick={handleCopyLink}>
              <Link2 className="h-4 w-4 mr-1" />
              {L.COPY_LINK}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              {L.PRINT}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-morandi-secondary">{L.CONTRACT_NUMBER}</span>
            <span className="font-medium text-morandi-primary">{existing.code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-morandi-secondary">{L.SIGNER_NAME}</span>
            <span className="font-medium text-morandi-primary">{existing.signer_name || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-morandi-secondary">{L.STATUS}</span>
            <StatusBadge
              tone={STATUS_TONE[status] ?? 'neutral'}
              label={CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS] ?? status}
            />
          </div>
          {existing.signed_at && (
            <div className="flex items-center justify-between">
              <span className="text-morandi-secondary">{L.SIGNED_AT}</span>
              <span className="font-medium text-morandi-primary">
                {new Date(existing.signed_at).toLocaleString('zh-TW')}
              </span>
            </div>
          )}
        </div>
      </FormDialog>
    )
  }

  // ─── 無合約：建立表單 ───
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={L.CREATE_TITLE}
      maxWidth="lg"
      level={2}
      onSubmit={handleCreate}
      submitLabel={submitting ? L.LOADING : L.CREATE}
      loading={submitting}
    >
      <div className="space-y-4 py-2">
        {/* 簽約對象 */}
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

        {/* 代表人下拉（自動帶資料） */}
        <div className="space-y-2">
          <Label>{L.SIGNED_MEMBERS}</Label>
          <select
            value={repMemberId}
            onChange={e => handleSelectRep(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">{L.NAME_PLACEHOLDER}</option>
            {(members ?? []).map(m => (
              <option key={m.id} value={m.id}>
                {m.chinese_name || m.passport_number || m.id}
              </option>
            ))}
          </select>
        </div>

        {signerType === 'company' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{L.COMPANY_NAME}</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={L.COMPANY_NAME_PLACEHOLDER} />
            </div>
            <div className="space-y-2">
              <Label>{L.COMPANY_TAX_ID}</Label>
              <Input value={companyTaxId} onChange={e => setCompanyTaxId(e.target.value)} placeholder={L.OPTIONAL_PLACEHOLDER} />
            </div>
            <div className="space-y-2">
              <Label>{L.COMPANY_REPRESENTATIVE}</Label>
              <Input value={companyRepresentative} onChange={e => setCompanyRepresentative(e.target.value)} placeholder={L.NAME_PLACEHOLDER} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{L.SIGNER_NAME}</Label>
            <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder={L.NAME_PLACEHOLDER} />
          </div>
          <div className="space-y-2">
            <Label>{L.PHONE}</Label>
            <Input value={signerPhone} onChange={e => setSignerPhone(e.target.value)} placeholder={L.PHONE_PLACEHOLDER} />
          </div>
          <div className="space-y-2">
            <Label>{L.ID_NUMBER}</Label>
            <Input value={signerIdNumber} onChange={e => setSignerIdNumber(e.target.value)} placeholder={L.OPTIONAL_PLACEHOLDER} />
          </div>
        </div>

        {/* 集合資訊（TODO: 之後可從行程航班自動帶「起飛前 3 小時」）*/}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{L.MEETING_LOCATION}</Label>
            <Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder={L.MEETING_LOCATION_PLACEHOLDER} />
          </div>
          <div className="space-y-2">
            <Label>{L.MEETING_TIME}</Label>
            <Input type="datetime-local" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
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
    </FormDialog>
  )
}
