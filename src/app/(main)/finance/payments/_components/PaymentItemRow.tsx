/**
 * Payment Item Row (Table-based Input)
 * 收款項目行（表格式輸入）
 */

import { formatMoney } from '@/lib/utils/format-currency'
import { useState, useEffect } from 'react'
import { usePaymentMethodsCached } from '@/data/hooks'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PaymentItem, ReceiptType } from '../_types'
import { useTranslations } from 'next-intl'

interface PaymentItemRowProps {
  item: PaymentItem
  index: number
  onUpdate: (id: string, updates: Partial<PaymentItem>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  isNewRow?: boolean
  orderInfo?: {
    order_number?: string
    tour_name?: string
    contact_person?: string
    contact_email?: string
  }
  /** 收款模式：tour = 團體收款，company = 公司收款 */
  mode?: 'tour' | 'company'
  /** 唯讀模式（已確認的收款單） */
  readonly?: boolean
  /** 收款方式列表（從父組件傳入，避免重複載入） */
  paymentMethods?: Array<{
    id: string
    code: string
    name: string
    description?: string | null
    placeholder?: string | null
  }>
  /** 是否有核帳權限（可填寫實收金額） */
  canConfirmReceipt?: boolean
}

export function PaymentItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  isNewRow: _isNewRow = false,
  orderInfo: _orderInfo,
  mode = 'tour',
  readonly = false,
  paymentMethods: propPaymentMethods,
  canConfirmReceipt = false,
}: PaymentItemRowProps) {
  const t = useTranslations('finance')
  // 讀取收入類會計科目（僅公司收款需要）
  const [incomeSubjects, setIncomeSubjects] = useState<
    Array<{ id: string; code: string; name: string }>
  >([])

  // 從 SWR 快取讀取收款方式（fallback，如果父組件沒有傳入）
  const { methods: cachedMethods } = usePaymentMethodsCached('receipt')
  const paymentMethods =
    propPaymentMethods && propPaymentMethods.length > 0 ? propPaymentMethods : cachedMethods

  useEffect(() => {
    if (mode === 'company') {
      // 讀取收入類科目（帶 workspace_id 過濾）
      const loadSubjects = async () => {
        const { supabase } = await import('@/lib/supabase/client')
        const { useAuthStore } = await import('@/stores')
        const wsId = useAuthStore.getState().user?.workspace_id
        let query = supabase
          .from('chart_of_accounts')
          .select('id, code, name')
          .eq('account_type', 'revenue')
          .eq('is_active', true)
          .order('code')
        if (wsId) query = query.eq('workspace_id', wsId)
        const { data } = await query
        setIncomeSubjects(data || [])
      }
      loadSubjects()
    }
  }, [mode])

  // 收款方式選項：使用 DB 的資料（必須等載入完成）
  const isLoading = paymentMethods.length === 0

  const receiptTypeOptions = paymentMethods.map(m => ({ value: m.name, label: m.name }))

  // 計算 Select value：
  // 1. 如果還在載入，保留原值（顯示 placeholder「載入中...」但不清空）
  // 2. 如果已載入，檢查值是否在選項中
  const rawValue = (item.receipt_type as unknown as string) ?? ''
  const isValidValue = receiptTypeOptions.some(opt => opt.value === rawValue)
  // 載入中時保留原值（避免清空編輯中的資料），載入完成後才驗證
  const selectValue = rawValue && (isLoading || isValidValue) ? rawValue : ''

  // 根據 receipt_type（DB name）找到對應的 code
  const currentMethod = paymentMethods.find(m => m.name === String(item.receipt_type))
  const _currentCode = item.payment_method_code || currentMethod?.code || ''

  // 當收款方式變更時（method 為 SSOT、receipt_type 從 method.code 反推給 trigger 兼容）
  const handleReceiptTypeChange = (value: string) => {
    const method = paymentMethods.find(m => m.name === value)
    const code = method?.code || ''
    const feePercent = Number((method as { fee_percent?: number } | undefined)?.fee_percent) || 0
    const amount = Number(item.amount) || 0

    const updates: Partial<PaymentItem> = {
      payment_method_id: method?.id,
      payment_method_code: code,
      // receipt_type 存 m.name 字串（跟 SelectItem value 對齊、UI 才會 highlight 已選）
      // mutation 寫入 DB 時會用 resolveMethodCode + codeToReceiptType 算 number
      receipt_type: value as unknown as ReceiptType,
    }

    // 自動算手續費 + 實收（切換到刷卡就自動扣、切回現金/匯款就還原）
    if (feePercent > 0) {
      const fees = Math.round((amount * feePercent) / 100)
      updates.fees = fees
      updates.actual_amount = Math.max(0, amount - fees)
    } else {
      updates.fees = 0
      updates.actual_amount = amount
    }

    onUpdate(item.id, updates)
  }

  return (
    <>
      {/* 主要資料行 */}
      <tr className={cn(index > 0 && 'border-t border-border/50')}>
        {/* 收款方式 */}
        <td className="py-2 px-3 border-b border-border/50">
          <Select
            value={selectValue}
            onValueChange={handleReceiptTypeChange}
            disabled={readonly || isLoading}
          >
            <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent px-0">
              <SelectValue placeholder={isLoading ? '載入中...' : '請選擇'} />
            </SelectTrigger>
            <SelectContent align="start" className="min-w-0 w-[var(--radix-select-trigger-width)]">
              {receiptTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* 交易日期 */}
        <td className="py-2 px-3 border-b border-border/50">
          <DatePicker
            value={item.transaction_date}
            onChange={date => onUpdate(item.id, { transaction_date: date })}
            placeholder={t('paymentItemSelectDate')}
            buttonClassName="h-auto p-0 border-0 shadow-none bg-transparent"
          />
        </td>

        {/* 收款項目（公司收款 = 會計科目下拉，團體收款 = 手打） */}
        <td className="py-2 px-3 border-b border-border/50">
          {mode === 'company' ? (
            <Select
              value={item.accounting_subject_id || ''}
              onValueChange={value => onUpdate(item.id, { accounting_subject_id: value })}
              disabled={readonly}
            >
              <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent px-0">
                <SelectValue placeholder="選擇收入科目" />
              </SelectTrigger>
              <SelectContent align="start">
                {incomeSubjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.code} {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              type="text"
              value={item.receipt_account || ''}
              onChange={e => {
                onUpdate(item.id, { receipt_account: e.target.value })
              }}
              placeholder="付款資訊"
              disabled={readonly}
              className="input-no-focus w-full bg-transparent text-sm"
            />
          )}
        </td>

        {/* 備註（沒核帳權時、刪除按鈕掛這格右邊） */}
        <td className="py-2 px-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.notes || ''}
              onChange={e => onUpdate(item.id, { notes: e.target.value })}
              placeholder={t('paymentItemRemarks')}
              className="input-no-focus w-full bg-transparent text-sm"
            />
            {!canConfirmReceipt && canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => onRemove(item.id)}
                className="text-morandi-secondary/60 hover:text-morandi-red shrink-0"
                title={t('receiptDelete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>

        {/* 收款金額 / 實收金額：只有核帳權限可見可填、沒權限時整 td 不渲染 */}
        {canConfirmReceipt && (
          <>
            {/* 收款金額 */}
            <td className="py-2 px-3 border-b border-border/50 text-right">
              <input
                type="text"
                inputMode="numeric"
                value={item.amount ? formatMoney(item.amount) : ''}
                onChange={e => {
                  // 5/13 W 反饋：全形數字 → 半形（中文輸入法常打到全形「１２３４」、parseInt 會 NaN）
                  const raw = e.target.value
                    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
                    .replace(/,/g, '')
                  const num = parseInt(raw, 10)
                  const amount = isNaN(num) ? 0 : num
                  const feePercent =
                    Number((currentMethod as { fee_percent?: number } | undefined)?.fee_percent) || 0

                  const updates: Partial<PaymentItem> = { amount }
                  if (feePercent > 0) {
                    const fees = Math.round((amount * feePercent) / 100)
                    updates.fees = fees
                    updates.actual_amount = Math.max(0, amount - fees)
                  } else {
                    updates.fees = 0
                    updates.actual_amount = amount
                  }
                  onUpdate(item.id, updates)
                }}
                placeholder="0"
                disabled={readonly}
                className="input-no-focus w-full bg-transparent text-sm text-right"
              />
              {item.fees && item.fees > 0 ? (
                <div className="text-[0.588rem] text-morandi-muted mt-0.5">
                  {t('paymentItemFee')} {formatMoney(item.fees)}
                </div>
              ) : null}
            </td>

            {/* 實收金額 + 刪除 */}
            <td className="py-2 px-3 border-b border-border/50 text-right">
              <div className="flex items-center justify-end gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.actual_amount ? formatMoney(item.actual_amount) : ''}
                  onChange={e => {
                    // 5/13 W 反饋：全形數字 → 半形
                    const raw = e.target.value
                      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
                      .replace(/,/g, '')
                    const num = parseInt(raw, 10)
                    onUpdate(item.id, { actual_amount: isNaN(num) ? 0 : num })
                  }}
                  placeholder="0"
                  className="input-no-focus w-full bg-transparent text-sm text-right"
                />
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSm"
                    onClick={() => onRemove(item.id)}
                    className="text-morandi-secondary/60 hover:text-morandi-red"
                    title={t('receiptDelete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </td>
          </>
        )}
      </tr>

    </>
  )
}
