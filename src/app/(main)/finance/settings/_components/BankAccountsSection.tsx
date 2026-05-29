// 銀行帳戶 section
// list table + BankDialog + 所有 mutation handler

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormDialog } from '@/components/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit, Trash2 } from 'lucide-react'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { COMMON_MESSAGES } from '@/constants/messages'
import { useTranslations } from 'next-intl'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './shared-table'
import { PAGE_LABELS, type BankAccount } from './types'
import { BankCombobox } from '@/components/bank-combobox'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useBranches, type Branch } from '@/data/hooks/useBranches'

// 全公司共用（branch_id = null）哨符
const BRANCH_SHARED = '__shared__'

interface BankAccountsSectionProps {
  bankAccounts: BankAccount[]
  reload: () => Promise<void>
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingBank: BankAccount | null
  setEditingBank: (b: BankAccount | null) => void
}

export function BankAccountsSection({
  bankAccounts,
  reload,
  isDialogOpen,
  setIsDialogOpen,
  editingBank,
  setEditingBank,
}: BankAccountsSectionProps) {
  const t = useTranslations('finance')
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
  const setLoading = (id: string, v: boolean) => setRowLoading(prev => ({ ...prev, [id]: v }))

  // 分公司清單：有真分公司（御風/角落…）才顯示「分公司」欄與選單；單一總部的公司不顯示
  // 總部 placeholder type='headquarters'、真分公司 type='branch'/'custom'
  const { branches } = useBranches()
  const realBranches = branches.filter(b => b.type !== 'headquarters')
  const hasBranches = realBranches.length > 0
  const branchNameById = new Map(branches.map(b => [b.id, b.name]))
  const totalCols = hasBranches ? 9 : 8

  // 儲存銀行帳戶
  const handleSaveBank = async (bank: Partial<BankAccount>) => {
    const res = await apiMutate('/api/bank-accounts', {
      method: editingBank?.id ? 'PUT' : 'POST',
      body: {
        ...bank,
        id: editingBank?.id,
      },
      invalidate: ['/api/bank-accounts'],
    })
    if (!res.ok) {
      await alert(COMMON_MESSAGES.SAVE_FAILED, 'error')
      return
    }
    await reload()
    setIsDialogOpen(false)
    setEditingBank(null)
    await alert(COMMON_MESSAGES.SAVE_SUCCESS, 'success')
  }

  // 刪除銀行帳戶
  const handleDeleteBank = async (bank: BankAccount) => {
    if (rowLoading[bank.id]) return
    const confirmed = await confirm(t('deleteBankConfirm', { name: bank.name }), {
      title: t('deleteBankTitle'),
      type: 'warning',
    })
    if (!confirmed) return

    setLoading(bank.id, true)
    try {
      const res = await apiMutate(`/api/bank-accounts?id=${bank.id}`, {
        method: 'DELETE',
        invalidate: ['/api/bank-accounts'],
      })
      if (!res.ok) {
        await alert(t('deleteFailed'), 'error')
        return
      }
      await reload()
      await alert(t('deleteSuccess'), 'success')
    } finally {
      setLoading(bank.id, false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          {/* 2026-05-21 William 拍板：砍 code 欄位（無 caller 引用）、加跨行手續費、列寬重排 */}
          {/* 2026-05-26 William 拍板：操作欄改靠左對齊第一顆按鈕、比照訂單管理、財務設定各 section 統一 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{PAGE_LABELS.COL_NAME}</TableHead>
                {hasBranches && (
                  <TableHead className="w-[140px] whitespace-nowrap">
                    {PAGE_LABELS.COL_BRANCH}
                  </TableHead>
                )}
                <TableHead className="w-[160px]">{PAGE_LABELS.COL_BANK}</TableHead>
                <TableHead className="w-[180px]">{PAGE_LABELS.COL_ACCOUNT_NUMBER}</TableHead>
                <TableHead className="w-[96px] text-right whitespace-nowrap">跨行手續費</TableHead>
                <TableHead className="w-[64px] text-center whitespace-nowrap">
                  {PAGE_LABELS.COL_DEFAULT}
                </TableHead>
                <TableHead className="w-[64px] text-center whitespace-nowrap">可出帳</TableHead>
                <TableHead className="w-[72px] text-center whitespace-nowrap">
                  {PAGE_LABELS.COL_QUOTE_DISPLAY}
                </TableHead>
                <TableHead className="w-[88px]">{PAGE_LABELS.COL_ACTION}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalCols} className="text-center py-8 text-morandi-muted">
                    {t('emptyBankAccounts')}
                  </TableCell>
                </TableRow>
              ) : (
                bankAccounts.map(bank => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-medium">{bank.name}</TableCell>
                    {hasBranches && (
                      <TableCell className="text-morandi-secondary">
                        {bank.branch_id
                          ? (branchNameById.get(bank.branch_id) ?? '-')
                          : PAGE_LABELS.BRANCH_SHARED_LABEL}
                      </TableCell>
                    )}
                    <TableCell>{bank.bank_name || '-'}</TableCell>
                    <TableCell className="font-mono">{bank.account_number || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {bank.cross_bank_fee && bank.cross_bank_fee > 0 ? (
                        `$${bank.cross_bank_fee}`
                      ) : (
                        <span className="text-morandi-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bank.is_default && (
                        <Badge className="bg-morandi-gold/20 text-morandi-gold whitespace-nowrap">
                          {PAGE_LABELS.DEFAULT_BADGE}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bank.is_disbursement_eligible !== false ? (
                        <Badge className="bg-status-success/20 text-status-success whitespace-nowrap">
                          可
                        </Badge>
                      ) : (
                        <Badge className="bg-morandi-muted/20 text-morandi-muted whitespace-nowrap">
                          不可
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {bank.is_quote_display === true && (
                        <Badge className="bg-morandi-gold/20 text-morandi-gold whitespace-nowrap">
                          顯示
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingBank(bank)
                            setIsDialogOpen(true)
                          }}
                          disabled={!!rowLoading[bank.id]}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBank(bank)}
                          className="text-status-danger hover:text-status-danger/80"
                          disabled={!!rowLoading[bank.id]}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <BankDialog
        open={isDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsDialogOpen(open)
          if (!open) setEditingBank(null)
        }}
        bank={editingBank}
        onSave={handleSaveBank}
        realBranches={realBranches}
        hasBranches={hasBranches}
      />
    </>
  )
}

// 銀行帳戶編輯對話框
function BankDialog({
  open,
  onOpenChange,
  bank,
  onSave,
  realBranches,
  hasBranches,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank: BankAccount | null
  onSave: (bank: Partial<BankAccount>) => Promise<void>
  realBranches: Branch[]
  hasBranches: boolean
}) {
  const t = useTranslations('finance')
  const [name, setName] = useState('')
  const [bankCode, setBankCode] = useState('') // ref_banks.bank_code（三碼）
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isDisbursementEligible, setIsDisbursementEligible] = useState(true)
  const [crossBankFee, setCrossBankFee] = useState<number>(0)
  const [bankBranch, setBankBranch] = useState('') // 銀行分行（報價單顯示用）
  const [accountHolderName, setAccountHolderName] = useState('') // 戶名（報價單顯示用）
  const [isQuoteDisplay, setIsQuoteDisplay] = useState(false) // 綁報價單顯示
  const [branchId, setBranchId] = useState<string>(BRANCH_SHARED) // 所屬分公司（BRANCH_SHARED=全公司共用）
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(bank?.name || '')
      setBankCode(bank?.bank_code || '')
      setBankName(bank?.bank_name || '')
      setAccountNumber(bank?.account_number || '')
      setIsDefault(bank?.is_default || false)
      // 新建預設 true、編輯保留既有（undefined 視為 true）
      setIsDisbursementEligible(bank?.is_disbursement_eligible !== false)
      setCrossBankFee(bank?.cross_bank_fee ?? 0)
      setBankBranch(bank?.bank_branch || '')
      setAccountHolderName(bank?.account_holder_name || '')
      setIsQuoteDisplay(bank?.is_quote_display === true)
      setBranchId(bank?.branch_id || BRANCH_SHARED)
    }
  }, [open, bank])

  const handleSubmit = async () => {
    if (!name) {
      await alert(t('fieldNameRequired'), 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      // code 不再由使用者填、API 新建時自動產生、編輯時沿用既有
      await onSave({
        name,
        bank_code: bankCode || null,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        is_default: isDefault,
        is_disbursement_eligible: isDisbursementEligible,
        cross_bank_fee: crossBankFee,
        bank_branch: bankBranch || null,
        account_holder_name: accountHolderName || null,
        is_quote_display: isQuoteDisplay,
        // 有真分公司才送 branch_id；無分公司的公司一律維持 null（全公司共用）
        branch_id: hasBranches && branchId !== BRANCH_SHARED ? branchId : null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={bank ? t('bankDialogTitleEdit') : t('bankDialogTitleCreate')}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? t('saving') : t('saveLabel')}
      loading={isSubmitting}
      submitDisabled={!name}
      maxWidth="md"
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>{t('fieldNameRequired')}</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        {/* 所屬分公司：有真分公司才顯示；無分公司的公司一律全公司共用 */}
        {hasBranches && (
          <div className="space-y-2">
            <Label>{PAGE_LABELS.BRANCH_LABEL}</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BRANCH_SHARED}>{PAGE_LABELS.BRANCH_SHARED_LABEL}</SelectItem>
                {realBranches.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>{PAGE_LABELS.BANK_FULL_NAME}</Label>
          <BankCombobox
            value={bankCode}
            onChange={setBankCode}
            onSelect={ref => {
              // 同時帶入 bank_name（顯示用、列表頁仍依 bank_name 渲染）
              if (ref) setBankName(ref.bank_name)
              else setBankName('')
            }}
            placeholder=""
            disablePortal
          />
        </div>
        <div className="space-y-2">
          <Label>{PAGE_LABELS.ACCOUNT_NUMBER_LABEL}</Label>
          <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{PAGE_LABELS.BANK_BRANCH_LABEL}</Label>
            <Input
              value={bankBranch}
              onChange={e => setBankBranch(e.target.value)}
              placeholder={PAGE_LABELS.BANK_BRANCH_PLACEHOLDER}
            />
          </div>
          <div className="space-y-2">
            <Label>{PAGE_LABELS.ACCOUNT_HOLDER_LABEL}</Label>
            <Input
              value={accountHolderName}
              onChange={e => setAccountHolderName(e.target.value)}
              placeholder={PAGE_LABELS.ACCOUNT_HOLDER_PLACEHOLDER}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isDefault"
              checked={isDefault}
              onCheckedChange={checked => setIsDefault(checked === true)}
            />
            <Label htmlFor="isDefault">{PAGE_LABELS.SET_AS_DEFAULT}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isDisbursementEligible"
              checked={isDisbursementEligible}
              onCheckedChange={checked => setIsDisbursementEligible(checked === true)}
            />
            <Label htmlFor="isDisbursementEligible">可作為出帳帳戶</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isQuoteDisplay"
              checked={isQuoteDisplay}
              onCheckedChange={checked => setIsQuoteDisplay(checked === true)}
            />
            <Label htmlFor="isQuoteDisplay">{PAGE_LABELS.BIND_QUOTE_DISPLAY}</Label>
          </div>
        </div>
        {isDisbursementEligible && (
          <div className="space-y-2">
            <Label htmlFor="crossBankFee">跨行匯款手續費（每筆）</Label>
            <Input
              id="crossBankFee"
              type="number"
              min="0"
              step="1"
              value={crossBankFee}
              onChange={e => setCrossBankFee(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-32"
            />
          </div>
        )}
      </div>
    </FormDialog>
  )
}
