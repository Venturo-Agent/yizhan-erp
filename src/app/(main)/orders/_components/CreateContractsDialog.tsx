'use client'

/**
 * CreateContractsDialog — 合約管理（左：勾選團員建合約 / 右：歷史合約）
 *
 * 2026-05-26 William 拍板：合約改成像「帳單」一樣的批次勾選流程。
 *   - 從「訂單列表點一下自動帶全團、直接產一張」改成「團員列表勾選 → 送出 → 右邊看狀態」
 *   - 產出結構：一份合約、勾的人列在上面、由代表人一人簽（contracts.member_ids 陣列 + order_id）
 *   - 一訂單可分批建多份合約（兩家庭各一份、各自代表人）、跟帳單能開多批次一樣
 *
 * 版面（仿 CreateInvoicesDialog）：
 *   - 左側「建新合約」：團員 checkbox + 全選 + 代表人下拉 + 簽約對象 + 附件 + 底部「建立合約」
 *   - 右側「歷史合約」：該訂單所有合約（含已取消）、各份顯示代表人 / 涵蓋團員 / 狀態 / 連結 / PDF
 *
 * 寫入走 /api/contracts/create（已支援前端傳 memberIds）、寫完 invalidateContracts。
 * 讀取走 useContracts entity hook（filter order_id）— 紅線 F：頁面不散刻 useSWR。
 */

import { useState, useMemo, useEffect } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiPost } from '@/lib/api/client'
import { useContracts, invalidateContracts } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import type { OrderMember } from '../_types/order-member.types'
import { CONTRACT_LABELS as L } from '@/app/(main)/orders/_contracts/constants/labels'
import { NewContractForm } from './_contract-dialog/NewContractForm'
import { HistoryContractCard } from './_contract-dialog/HistoryContractCard'
import type { SignerType } from './_contract-dialog/contract-dialog.types'

interface CreateContractsDialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  orderCode?: string | null
  members: OrderMember[]
}

export function CreateContractsDialog({
  open,
  onClose,
  orderId,
  orderCode,
  members,
}: CreateContractsDialogProps) {
  const { user } = useAuthStore()

  // 右側歷史：走 entity hook、filter order_id（含已取消、由卡片自行標示）
  const { items: contracts, loading: historyLoading } = useContracts({
    all: true,
    filter: { order_id: orderId },
  })

  // ── 左側建新合約 state ──
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [signerType, setSignerType] = useState<SignerType>('individual')
  const [repMemberId, setRepMemberId] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerIdNumber, setSignerIdNumber] = useState('')
  const [signerPhone, setSignerPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [companyRepresentative, setCompanyRepresentative] = useState('')
  const [includeItinerary, setIncludeItinerary] = useState(true)
  const [includeMemberList, setIncludeMemberList] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  // 合約可帶任何團員（不像帳單需要 customer_id）；過濾掉沒名字的空白列
  const availableMembers = useMemo(
    () => members.filter(m => m.chinese_name?.trim() || m.passport_name?.trim()),
    [members]
  )

  // member_id → 顯示名（給歷史卡涵蓋團員用）
  const memberNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      map.set(m.id, m.chinese_name || m.passport_name || m.id)
    }
    return map
  }, [members])

  // 勾選清單變動時、若代表人不在已勾選名單裡就清掉（避免代表人是沒勾的人）
  useEffect(() => {
    if (repMemberId && !selected.has(repMemberId)) {
      setRepMemberId('')
    }
  }, [selected, repMemberId])

  const handleToggle = (memberId: string) => {
    const next = new Set(selected)
    if (next.has(memberId)) next.delete(memberId)
    else next.add(memberId)
    setSelected(next)
  }

  const handleSelectAll = () => {
    if (selected.size === availableMembers.length) setSelected(new Set())
    else setSelected(new Set(availableMembers.map(m => m.id)))
  }

  // 選代表人 → 自動帶姓名 / 身分證（沿用舊 dialog 邏輯）
  const handleSelectRep = (memberId: string) => {
    setRepMemberId(memberId)
    const m = members.find(x => x.id === memberId)
    if (m) {
      if (m.chinese_name) setSignerName(m.chinese_name)
      if (m.id_number) setSignerIdNumber(m.id_number)
    }
  }

  const resetForm = () => {
    setSelected(new Set())
    setSignerType('individual')
    setRepMemberId('')
    setSignerName('')
    setSignerIdNumber('')
    setSignerPhone('')
    setCompanyName('')
    setCompanyTaxId('')
    setCompanyRepresentative('')
    setIncludeItinerary(true)
    setIncludeMemberList(true)
  }

  const { isSubmitting: submitting, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      if (selected.size === 0) {
        toast.error(L.VALIDATION_NEED_MEMBERS)
        return
      }
      if (signerType === 'individual' && !signerName.trim()) {
        toast.error(L.VALIDATION_NEED_NAME)
        return
      }
      if (signerType === 'company' && !companyName.trim()) {
        toast.error(L.VALIDATION_NEED_COMPANY)
        return
      }

      await apiPost('/api/contracts/create', {
        orderId,
        memberIds: Array.from(selected),
        signerType,
        signerName: signerName.trim() || companyRepresentative.trim() || companyName.trim(),
        signerIdNumber: signerIdNumber || undefined,
        signerPhone: signerPhone || undefined,
        companyName: signerType === 'company' ? companyName.trim() : undefined,
        companyTaxId: signerType === 'company' ? companyTaxId || undefined : undefined,
        companyRepresentative:
          signerType === 'company' ? companyRepresentative || undefined : undefined,
        createdBy: user?.id || undefined,
        includeItinerary,
        includeMemberList,
      })
      await invalidateContracts()
      toast.success(L.TOAST_CREATED)
      resetForm()
    },
    {
      onError: err => {
        logger.error('建立合約失敗', err)
        toast.error(L.TOAST_CREATE_FAIL)
      },
    }
  )

  const buildSignLink = (code: string): string => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/public/contract/sign/${code}`
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildSignLink(code))
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
      toast.success(L.TOAST_LINK_COPIED)
    } catch {
      toast.error(L.TOAST_OP_FAIL)
    }
  }

  const handleClose = () => {
    resetForm()
    setCopied(null)
    onClose()
  }

  const history = contracts ?? []

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} />
            {L.BATCH_DIALOG_TITLE} {orderCode ? `（訂單 ${orderCode}）` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* 左側：建新合約 */}
          <div className="space-y-3">
            {/* 左欄標題：跟右欄「歷史合約」同高同樣式、左右對齊（2026-05-26 William）*/}
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-morandi-secondary" />
              <h3 className="text-sm font-semibold text-morandi-primary">{L.BATCH_NEW_TITLE}</h3>
            </div>
            {availableMembers.length === 0 ? (
              <div className="text-sm text-morandi-secondary py-8 text-center border border-dashed border-border rounded-lg">
                {L.BATCH_NO_MEMBERS}
              </div>
            ) : (
              <NewContractForm
                availableMembers={availableMembers}
                selected={selected}
                onToggle={handleToggle}
                onSelectAll={handleSelectAll}
                signerType={signerType}
                setSignerType={setSignerType}
                repMemberId={repMemberId}
                onSelectRep={handleSelectRep}
                signerName={signerName}
                setSignerName={setSignerName}
                signerIdNumber={signerIdNumber}
                setSignerIdNumber={setSignerIdNumber}
                signerPhone={signerPhone}
                setSignerPhone={setSignerPhone}
                companyName={companyName}
                setCompanyName={setCompanyName}
                companyTaxId={companyTaxId}
                setCompanyTaxId={setCompanyTaxId}
                companyRepresentative={companyRepresentative}
                setCompanyRepresentative={setCompanyRepresentative}
                includeMemberList={includeMemberList}
                setIncludeMemberList={setIncludeMemberList}
                includeItinerary={includeItinerary}
                setIncludeItinerary={setIncludeItinerary}
              />
            )}
          </div>

          {/* 右側：歷史合約 */}
          <div className="border-l border-border lg:pl-4">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-morandi-secondary" />
              <h3 className="text-sm font-semibold text-morandi-primary">
                {L.BATCH_HISTORY_TITLE}
              </h3>
              {history.length > 0 && (
                <span className="text-xs text-morandi-secondary">
                  （{history.length} {L.BATCH_HISTORY_COUNT_SUFFIX}）
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-morandi-secondary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-sm text-morandi-secondary text-center py-8 border border-dashed border-border rounded-lg">
                {L.BATCH_HISTORY_EMPTY}
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {history.map(c => (
                  <HistoryContractCard
                    key={c.id}
                    contract={c}
                    memberNames={(c.member_ids ?? [])
                      .map(id => memberNameById.get(id))
                      .filter((n): n is string => Boolean(n))}
                    signLink={buildSignLink(c.code)}
                    copied={copied === c.code}
                    onCopy={() => handleCopy(c.code)}
                    onOpenPdf={() => window.open(`/api/contracts/${c.id}/pdf`, '_blank')}
                    onOpenSign={() => window.open(buildSignLink(c.code), '_blank')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {availableMembers.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              {L.CLOSE}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || selected.size === 0}>
              {submitting
                ? L.BATCH_CREATING
                : `${L.BATCH_CREATE_COUNT} (${selected.size} ${L.PEOPLE_SUFFIX})`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
