// 付款方式編輯對話框（從 PaymentMethodsSection 抽出）

'use client'

import { useEffect, useState } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { EntityFormDialog } from '@/components/shared/EntityFormDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { alert } from '@/lib/ui/alert-dialog'
import { useTranslations } from 'next-intl'
import {
  PAGE_LABELS,
  PAYMENT_METHOD_KIND_LABELS,
  type PaymentMethod,
  type PaymentMethodKind,
  type ChartOfAccount,
} from './types'

interface MethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethod | null
  type: 'receipt' | 'payment'
  onSave: (method: Partial<PaymentMethod>) => Promise<void>
  chartOfAccounts: ChartOfAccount[]
  existingMethods: PaymentMethod[]
}

export function MethodDialog({
  open,
  onOpenChange,
  method,
  type,
  onSave,
  chartOfAccounts,
  existingMethods,
}: MethodDialogProps) {
  const t = useTranslations('finance')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [debitAccountId, setDebitAccountId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [feePercent, setFeePercent] = useState('')
  const [feeAccountId, setFeeAccountId] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  // 種類 enum（William 拍板 2026-05-11、保留為分類用、各 kind 邏輯未來再接）
  const [kind, setKind] = useState<PaymentMethodKind | ''>('')

  useEffect(() => {
    if (open) {
      setName(method?.name || '')
      setDescription(method?.description || '')
      setPlaceholder(method?.placeholder || '')
      setDebitAccountId(method?.debit_account_id || '')
      setCreditAccountId(method?.credit_account_id || '')
      // fee_percent === 0 要保留 0、不能變空字串
      setFeePercent(
        method?.fee_percent !== undefined && method?.fee_percent !== null
          ? String(method.fee_percent)
          : ''
      )
      setFeeAccountId(method?.fee_account_id || '')
      setKind((method?.kind as PaymentMethodKind | null) ?? '')
      // 新增時自動取下一個排序數字
      if (method) {
        setSortOrder(method.sort_order || 0)
      } else {
        const maxSort = Math.max(0, ...existingMethods.map(m => m.sort_order || 0))
        setSortOrder(maxSort + 1)
      }
    }
    // existingMethods 不放 deps：只有 open=true 那刻取一次 maxSort、後續 mutation 不重算
  }, [open, method])

  const doSubmit = async () => {
    if (!name) {
      await alert(t('pleaseFillName'), 'warning')
      return
    }
    if (!kind) {
      await alert('請選擇「種類」（匯款 / 刷卡 / 現金 / 支票 / 其他）', 'warning')
      return
    }
    const feePercentNum = parseFloat(feePercent) || 0
    await onSave({
      name,
      description,
      placeholder: placeholder || null,
      debit_account_id: debitAccountId || null,
      credit_account_id: creditAccountId || null,
      fee_percent: feePercentNum,
      fee_fixed: 0,
      fee_account_id: feePercentNum > 0 ? feeAccountId || null : null,
      kind: kind || null,
      sort_order: sortOrder,
    })
  }

  const { isSubmitting, execute: handleSubmit } = useAsyncSubmit(doSubmit)

  // EntityFormDialog 會自動在 entity 有值時加「編輯」前綴、null 時加「新增」前綴
  const entityTitle = type === 'receipt' ? '收款方式' : '付款方式'

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entityTitle}
      entity={method}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? t('saving') : t('saveLabel')}
      isSubmitting={isSubmitting}
      submitDisabled={!name}
      maxWidth="lg"
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>{t('fieldNameRequired')}</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={PAGE_LABELS.NAME_PLACEHOLDER}
          />
        </div>
        <div className="space-y-2">
          <Label>{PAGE_LABELS.DESCRIPTION_LABEL}</Label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={PAGE_LABELS.DESCRIPTION_PLACEHOLDER}
          />
        </div>
        {type === 'receipt' && (
          <div className="space-y-2">
            <Label>{PAGE_LABELS.PAYMENT_INFO_HINT}</Label>
            <Input
              value={placeholder}
              onChange={e => setPlaceholder(e.target.value)}
              placeholder={PAGE_LABELS.PAYMENT_INFO_PLACEHOLDER}
            />
            <p className="text-xs text-morandi-muted">
              💡 收款時「付款資訊」欄位會顯示這段提示文字
            </p>
          </div>
        )}
        {type === 'receipt' && (
          <div className="space-y-2">
            <Label>{t('fieldFeeOptional')}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={feePercent}
                  onChange={e => setFeePercent(e.target.value)}
                  placeholder={PAGE_LABELS.EXAMPLE_2}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-morandi-muted">
                  %
                </span>
              </div>
              <select
                value={feeAccountId}
                onChange={e => setFeeAccountId(e.target.value)}
                disabled={!feePercent || parseFloat(feePercent) <= 0}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50"
              >
                <option value="">{PAGE_LABELS.FEE_ACCOUNT}</option>
                {chartOfAccounts
                  .filter(a => a.type === 'expense' || a.account_type === 'expense')
                  .map(account => (
                    <option key={account.id} value={account.id}>
                      {account.code} {account.name}
                    </option>
                  ))}
              </select>
            </div>
            <p className="text-xs text-morandi-muted">
              💡 銀行抽成（如刷卡 2%）。收款核准時自動扣減實收、並產生「借手續費」傳票分錄。
            </p>
          </div>
        )}
        {/* 種類（William 拍板 2026-05-11：取代舊「這是匯款方式」勾選框、未來每 kind 走獨立邏輯）*/}
        <div className="rounded-md border border-morandi-gold/20 bg-morandi-gold/5 p-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">種類 *</Label>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as PaymentMethodKind | '')}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{PAGE_LABELS.PLEASE_SELECT}</option>
              {(Object.entries(PAYMENT_METHOD_KIND_LABELS) as [PaymentMethodKind, string][]).map(
                ([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                )
              )}
            </select>
            <p className="text-xs text-morandi-muted">
              💡 分類用、未來各 kind 走獨立邏輯（例：刷卡接刷卡手續費紀錄）。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('fieldDebitAccountOptional')}</Label>
            <select
              value={debitAccountId}
              onChange={e => setDebitAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{PAGE_LABELS.NO_BIND}</option>
              {chartOfAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{t('fieldCreditAccountOptional')}</Label>
            <select
              value={creditAccountId}
              onChange={e => setCreditAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{PAGE_LABELS.NO_BIND}</option>
              {chartOfAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-morandi-muted">
          💡 綁定科目後，收款/請款時會自動產生對應傳票。不綁定則不產生。
        </p>
      </div>
    </EntityFormDialog>
  )
}
