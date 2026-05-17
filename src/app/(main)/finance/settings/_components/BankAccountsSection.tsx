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
import { SquarePen, Trash2 } from 'lucide-react'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { COMMON_MESSAGES } from '@/constants/messages'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './shared-table'
import { PAGE_LABELS, type BankAccount } from './types'
import { BankCombobox } from '@/components/bank-combobox'
import { apiMutate } from '@/lib/swr/api-mutate'

interface BankAccountsSectionProps {
  bankAccounts: BankAccount[]
  workspaceId: string | undefined
  reload: () => Promise<void>
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingBank: BankAccount | null
  setEditingBank: (b: BankAccount | null) => void
}

export function BankAccountsSection({
  bankAccounts,
  workspaceId,
  reload,
  isDialogOpen,
  setIsDialogOpen,
  editingBank,
  setEditingBank,
}: BankAccountsSectionProps) {
  const t = useTranslations('finance')
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
  const setLoading = (id: string, v: boolean) =>
    setRowLoading(prev => ({ ...prev, [id]: v }))

  // 儲存銀行帳戶
  const handleSaveBank = async (bank: Partial<BankAccount>) => {
    const res = await apiMutate('/api/bank-accounts', {
      method: editingBank?.id ? 'PUT' : 'POST',
      body: {
        ...bank,
        id: editingBank?.id,
        workspace_id: workspaceId,
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{PAGE_LABELS.COL_CODE}</TableHead>
                <TableHead>{PAGE_LABELS.COL_NAME}</TableHead>
                <TableHead>{PAGE_LABELS.COL_BANK}</TableHead>
                <TableHead>{PAGE_LABELS.COL_ACCOUNT_NUMBER}</TableHead>
                <TableHead className="w-[80px]">{PAGE_LABELS.COL_DEFAULT}</TableHead>
                <TableHead className="w-[100px]">可出帳</TableHead>
                <TableHead className="w-[100px] text-right">{PAGE_LABELS.COL_ACTION}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-morandi-muted">
                    {t('emptyBankAccounts')}
                  </TableCell>
                </TableRow>
              ) : (
                bankAccounts.map(bank => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-mono">{bank.code}</TableCell>
                    <TableCell className="font-medium">{bank.name}</TableCell>
                    <TableCell>{bank.bank_name || '-'}</TableCell>
                    <TableCell className="font-mono">{bank.account_number || '-'}</TableCell>
                    <TableCell>
                      {bank.is_default && (
                        <Badge className="bg-morandi-gold/20 text-morandi-gold">
                          {PAGE_LABELS.DEFAULT_BADGE}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {bank.is_disbursement_eligible !== false ? (
                        <Badge className="bg-morandi-green/20 text-morandi-green">可</Badge>
                      ) : (
                        <Badge className="bg-morandi-muted/20 text-morandi-muted">不可</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingBank(bank)
                            setIsDialogOpen(true)
                          }}
                          disabled={!!rowLoading[bank.id]}
                        >
                          <SquarePen className="h-4 w-4" />
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank: BankAccount | null
  onSave: (bank: Partial<BankAccount>) => Promise<void>
}) {
  const t = useTranslations('finance')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [bankCode, setBankCode] = useState('') // ref_banks.bank_code（三碼）
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isDisbursementEligible, setIsDisbursementEligible] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(bank?.code || '')
      setName(bank?.name || '')
      setBankCode(bank?.bank_code || '')
      setBankName(bank?.bank_name || '')
      setAccountNumber(bank?.account_number || '')
      setIsDefault(bank?.is_default || false)
      // 新建預設 true、編輯保留既有（undefined 視為 true）
      setIsDisbursementEligible(bank?.is_disbursement_eligible !== false)
    }
  }, [open, bank])

  const handleSubmit = async () => {
    if (!code || !name) {
      await alert(t('pleaseFillCodeAndName'), 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        code,
        name,
        bank_code: bankCode || null,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        is_default: isDefault,
        is_disbursement_eligible: isDisbursementEligible,
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
      submitDisabled={!code || !name}
      maxWidth="md"
    >
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('fieldCodeRequired')}</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={PAGE_LABELS.CODE_PLACEHOLDER}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('fieldNameRequired')}</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={PAGE_LABELS.BANK_NAME_PLACEHOLDER}
            />
          </div>
        </div>
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
            placeholder={PAGE_LABELS.BANK_FULL_NAME_PLACEHOLDER}
            disablePortal
          />
        </div>
        <div className="space-y-2">
          <Label>{PAGE_LABELS.ACCOUNT_NUMBER_LABEL}</Label>
          <Input
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
            placeholder={PAGE_LABELS.ACCOUNT_NUMBER_PLACEHOLDER}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-morandi-muted"
          />
          <Label htmlFor="isDefault">{PAGE_LABELS.SET_AS_DEFAULT}</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDisbursementEligible"
            checked={isDisbursementEligible}
            onChange={e => setIsDisbursementEligible(e.target.checked)}
            className="h-4 w-4 rounded border-morandi-muted"
          />
          <Label htmlFor="isDisbursementEligible">
            可作為出帳帳戶
            <span className="ml-2 text-xs text-morandi-muted">
              （取消勾選 = 此帳戶不會出現在出納單選項、譬如定存戶）
            </span>
          </Label>
        </div>
      </div>
    </FormDialog>
  )
}
