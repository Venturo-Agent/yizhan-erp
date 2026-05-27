// 付款方式編輯對話框（從 PaymentMethodsSection 抽出）

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { usePaymentProviders } from '@/data/hooks/usePaymentProviders'
import { EntityFormDialog } from '@/components/shared/EntityFormDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { alert } from '@/lib/ui/alert-dialog'
import { useTranslations } from 'next-intl'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'
import {
  PAGE_LABELS,
  PAYMENT_METHOD_KIND_LABELS,
  type PaymentMethod,
  type PaymentMethodKind,
  type ChartOfAccount,
} from './types'
import { KIND_TO_PROVIDER_KIND } from '@/constants/payment-provider'

const FEE_KIND_HINT: Partial<Record<PaymentMethodKind, string>> = {
  card: '刷卡手續費（如 2%）。收款核准時自動扣減實收、並產生傳票分錄。',
  wire_transfer: '匯款轉帳手續費比例（若有）。收款核准時自動扣減實收、並產生傳票分錄。',
  check: '票據手續費比例（若有）。收款核准時自動扣減實收、並產生傳票分錄。',
  other: '手續費比例（若有）。收款核准時自動扣減實收、並產生傳票分錄。',
}

const KINDS_WITH_FEE: PaymentMethodKind[] = ['card', 'wire_transfer', 'check', 'other']

// Radix Select 不允許 SelectItem value=""，用此哨兵值代表 kind 尚未選（原 value=""）
const KIND_NONE = '__none__'
// 科目下拉「不綁定」哨兵（原 <option value="">）、onValueChange 換回 '' 維持 || null 提交邏輯
const ACCOUNT_NONE = '__none__'

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
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasAccounting = isFeatureEnabled('accounting')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [debitAccountId, setDebitAccountId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [feePercent, setFeePercent] = useState('')
  const [feeFixed, setFeeFixed] = useState('')
  const [feeAccountId, setFeeAccountId] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  // 種類 enum（William 拍板 2026-05-11、保留為分類用、各 kind 邏輯未來再接）
  const [kind, setKind] = useState<PaymentMethodKind | ''>('')
  // provider（B 方案 2026-05-22）：誰處理金流
  const [provider, setProvider] = useState<string>('manual')
  // 對客戶開放（僅收款方式有意義）2026-05-26
  const [isCustomerVisible, setIsCustomerVisible] = useState(false)

  const { providers: allProviders } = usePaymentProviders()

  // 根據 kind 過濾 provider 選項：manual 永遠可選、其他看 kind ↔ provider_kind 對應
  const availableProviders = useMemo(() => {
    if (!kind) return allProviders.filter(p => p.code === 'manual')
    const targetKind = KIND_TO_PROVIDER_KIND[kind]
    if (!targetKind) return allProviders.filter(p => p.code === 'manual')
    return allProviders.filter(p => p.code === 'manual' || p.provider_kind === targetKind)
  }, [allProviders, kind])

  // 切 kind 時、如果當前 provider 不在新選項裡、reset 成 manual
  useEffect(() => {
    if (!availableProviders.find(p => p.code === provider)) {
      setProvider('manual')
    }
  }, [availableProviders, provider])

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
      setFeeFixed(method?.fee_fixed ? String(method.fee_fixed) : '')
      setFeeAccountId(method?.fee_account_id || '')
      setKind((method?.kind as PaymentMethodKind | null) ?? '')
      setProvider(method?.provider ?? 'manual')
      setIsCustomerVisible(method?.is_customer_visible ?? false)
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

  // 切換到現鈔（無手續費）時清空
  useEffect(() => {
    if (kind && !KINDS_WITH_FEE.includes(kind as PaymentMethodKind)) {
      setFeePercent('')
      setFeeFixed('')
      setFeeAccountId('')
    }
  }, [kind])

  const doSubmit = async () => {
    if (!name) {
      await alert(t('pleaseFillName'), 'warning')
      return
    }
    if (!kind) {
      await alert('請選擇「種類」（匯款 / 刷卡 / 現鈔 / 支票 / 其他）', 'warning')
      return
    }
    const feePercentNum = parseFloat(feePercent) || 0
    const feeFixedNum = parseFloat(feeFixed) || 0
    await onSave({
      name,
      description,
      placeholder: placeholder || null,
      debit_account_id: debitAccountId || null,
      credit_account_id: creditAccountId || null,
      fee_percent: feePercentNum,
      fee_fixed: hasAccounting ? feeFixedNum : 0,
      fee_account_id: feePercentNum > 0 || feeFixedNum > 0 ? feeAccountId || null : null,
      kind: kind || null,
      sort_order: sortOrder,
      provider,
      is_customer_visible: isCustomerVisible,
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
        {/* 種類放最上面：決定後續欄位顯示邏輯 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">種類 *</Label>
          <Select
            value={kind || KIND_NONE}
            onValueChange={v => setKind(v === KIND_NONE ? '' : (v as PaymentMethodKind))}
          >
            <SelectTrigger>
              <SelectValue placeholder={PAGE_LABELS.PLEASE_SELECT} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={KIND_NONE}>{PAGE_LABELS.PLEASE_SELECT}</SelectItem>
              {(Object.entries(PAYMENT_METHOD_KIND_LABELS) as [PaymentMethodKind, string][]).map(
                ([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Provider：選定 kind = card / wire_transfer 才有外部金流商可選、其他只能 manual */}
        {(kind === 'card' || kind === 'wire_transfer') && availableProviders.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">金流商</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map(p => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.provider_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-morandi-muted">
              💡 選擇「永豐」相關金流商、平台會自動串接 API 產生付款連結。選「手動處理」則不接
              API、由人工輸入交易資訊。
            </p>
          </div>
        )}

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

        {/* 對客戶開放：僅收款方式（客戶自助付款頁）有意義、比照銀行帳戶「可出帳」開關 */}
        {type === 'receipt' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="isCustomerVisible"
              checked={isCustomerVisible}
              onCheckedChange={checked => setIsCustomerVisible(checked === true)}
            />
            <Label htmlFor="isCustomerVisible">
              開放客戶自助付款頁選用
              <span className="ml-2 text-xs text-morandi-muted">
                （取消勾選 = 只供內部後台開收款單、客戶看不到。譬如甲存 / 現金 / 支票）
              </span>
            </Label>
          </div>
        )}

        {/* 手續費：僅收款方式、且種類已選、且該種類有手續費概念（匯款 / 刷卡 / 支票 / 其他）*/}
        {type === 'receipt' && kind && KINDS_WITH_FEE.includes(kind as PaymentMethodKind) && (
          <div className="space-y-2">
            <Label>{t('fieldFeeOptional')}</Label>
            <div className={hasAccounting ? 'grid grid-cols-2 gap-4' : ''}>
              <div className="space-y-1">
                <p className="text-xs text-morandi-muted">手續費比例</p>
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
              </div>
              {hasAccounting && (
                <div className="space-y-1">
                  <p className="text-xs text-morandi-muted">實際手續費</p>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeFixed}
                      onChange={e => setFeeFixed(e.target.value)}
                      placeholder="例：1.8"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-morandi-muted">
                      %
                    </span>
                  </div>
                </div>
              )}
            </div>
            {hasAccounting && (
              <Select
                value={feeAccountId || ACCOUNT_NONE}
                onValueChange={v => setFeeAccountId(v === ACCOUNT_NONE ? '' : v)}
                disabled={
                  (!feePercent || parseFloat(feePercent) <= 0) &&
                  (!feeFixed || parseFloat(feeFixed) <= 0)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={PAGE_LABELS.FEE_ACCOUNT} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCOUNT_NONE}>{PAGE_LABELS.FEE_ACCOUNT}</SelectItem>
                  {chartOfAccounts
                    .filter(a => a.type === 'expense' || a.account_type === 'expense')
                    .map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-morandi-muted">
              💡{' '}
              {FEE_KIND_HINT[kind as PaymentMethodKind] ??
                '手續費比例（若有）。收款核准時自動扣減實收。'}
            </p>
          </div>
        )}

        {/* 借貸方科目：需開通會計功能才顯示 */}
        {hasAccounting && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('fieldDebitAccountOptional')}</Label>
                <Select
                  value={debitAccountId || ACCOUNT_NONE}
                  onValueChange={v => setDebitAccountId(v === ACCOUNT_NONE ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={PAGE_LABELS.NO_BIND} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACCOUNT_NONE}>{PAGE_LABELS.NO_BIND}</SelectItem>
                    {chartOfAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('fieldCreditAccountOptional')}</Label>
                <Select
                  value={creditAccountId || ACCOUNT_NONE}
                  onValueChange={v => setCreditAccountId(v === ACCOUNT_NONE ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={PAGE_LABELS.NO_BIND} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACCOUNT_NONE}>{PAGE_LABELS.NO_BIND}</SelectItem>
                    {chartOfAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-morandi-muted">
              💡 綁定科目後，收款/請款時會自動產生對應傳票。不綁定則不產生。
            </p>
          </>
        )}
      </div>
    </EntityFormDialog>
  )
}
