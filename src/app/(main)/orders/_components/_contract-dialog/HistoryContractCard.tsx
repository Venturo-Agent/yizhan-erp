'use client'

// ============================================
// 子元件：歷史合約卡片（右側）
// ============================================
// 仿 _invoice-dialog/HistoryBatchCard：一份合約一張卡。
// 顯示代表人、涵蓋團員、狀態 badge、複製簽署連結 / 看 PDF / 開簽署頁。

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { Copy, Check, Printer, ExternalLink } from 'lucide-react'
import type { HistoryContract } from './contract-dialog.types'
import {
  CONTRACT_LABELS as L,
  CONTRACT_STATUS_LABELS,
} from '@/app/(main)/orders/_contracts/constants/labels'

interface HistoryContractCardProps {
  contract: HistoryContract
  /** 涵蓋團員顯示名（由 parent 從 member_ids → 姓名 map 解析後傳入）*/
  memberNames: string[]
  signLink: string
  copied: boolean
  onCopy: () => void
  onOpenPdf: () => void
  onOpenSign: () => void
}

// DB 狀態 → StatusBadge tone（draft / unsigned / signed / cancelled）
const STATUS_TONE: Record<string, StatusTone> = {
  draft: 'pending',
  unsigned: 'warning',
  signed: 'success',
  cancelled: 'neutral',
}

export function HistoryContractCard({
  contract,
  memberNames,
  signLink,
  copied,
  onCopy,
  onOpenPdf,
  onOpenSign,
}: HistoryContractCardProps) {
  const status = contract.status ?? 'draft'
  const statusLabel =
    CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS] ?? status
  const memberCount = contract.member_ids?.length ?? 0
  const isCancelled = status === 'cancelled'

  const attachments = [
    contract.include_itinerary ? L.ATTACH_ITINERARY : null,
    contract.include_member_list ? L.ATTACH_MEMBER_LIST : null,
  ].filter(Boolean) as string[]

  return (
    <div className="border border-border rounded-lg p-2.5 bg-card">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs text-morandi-secondary">
          {contract.created_at?.slice(0, 16).replace('T', ' ')}
          <span className="ml-2">
            {memberCount} {L.PEOPLE_SUFFIX}
          </span>
        </div>
        <StatusBadge tone={STATUS_TONE[status] ?? 'neutral'} label={statusLabel} />
      </div>

      {/* 代表人 + 合約編號 */}
      <div className="text-sm mb-1.5">
        <span className="text-morandi-primary font-medium">{contract.signer_name || '-'}</span>
        <span className="ml-2 text-xs text-morandi-secondary font-mono">{contract.code}</span>
      </div>

      {/* 涵蓋團員 */}
      {memberNames.length > 0 && (
        <div className="text-xs text-morandi-secondary mb-1.5">
          {L.BATCH_COVERED_MEMBERS}：{memberNames.join('、')}
        </div>
      )}

      {/* 附件 */}
      <div className="text-[0.7rem] text-morandi-secondary mb-2">
        {attachments.length > 0 ? attachments.join('、') : L.BATCH_ATTACH_NONE}
      </div>

      {/* 簽署連結（已取消不顯示）*/}
      {!isCancelled && (
        <div className="flex items-center gap-1.5 mb-2">
          <Input value={signLink} readOnly className="text-[0.588rem] font-mono h-7" />
          <Button variant="outline" size="sm" onClick={onCopy} className="h-7 px-2">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </Button>
        </div>
      )}

      {/* 操作：看 PDF / 開簽署頁 */}
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onOpenPdf} className="h-7 px-2 text-[0.7rem]">
          <Printer size={12} className="mr-1" />
          {L.BATCH_VIEW_PDF}
        </Button>
        {!isCancelled && (
          <Button variant="ghost" size="sm" onClick={onOpenSign} className="h-7 px-2 text-[0.7rem]">
            <ExternalLink size={12} className="mr-1" />
            {L.OPEN_SIGN_PAGE}
          </Button>
        )}
      </div>
    </div>
  )
}
