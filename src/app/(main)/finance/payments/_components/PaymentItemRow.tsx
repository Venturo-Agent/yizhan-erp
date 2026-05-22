/**
 * Payment Item Row (Table-based Input)
 * 收款項目行（表格式輸入）
 */

import { formatMoney } from '@/lib/utils/format-currency'
import { useState, useEffect } from 'react'
import { usePaymentMethodsCached } from '@/data/hooks'
import { Trash2, Link2, Copy, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
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
    provider?: string
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

  // B 方案 provider（2026-05-22 William）：選了永豐 provider 才展開「產生付款連結」區
  const isSinopacProvider = currentMethod?.provider?.startsWith('sinopac_') ?? false
  const totalColumns = canConfirmReceipt ? 6 : 5

  // 「產生付款連結」狀態
  const [linkEmail, setLinkEmail] = useState('')
  const [linkDays, setLinkDays] = useState(7)
  const [linkGenerating, setLinkGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<string | null>(null)

  const handleGenerateLink = async () => {
    if (!item.amount || item.amount <= 0) {
      toast.error('請先填收款金額')
      return
    }
    if (!linkEmail) {
      toast.error('請填客戶 Email')
      return
    }
    if (!currentMethod?.provider) {
      toast.error('收款方式未綁定金流商')
      return
    }
    setLinkGenerating(true)
    try {
      const res = await fetch('/api/finance/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: currentMethod.provider,
          amount: item.amount,
          customer_email: linkEmail,
          expires_minutes: linkDays * 24 * 60,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || '產生失敗')
        return
      }
      const absoluteLink =
        typeof window !== 'undefined'
          ? `${window.location.origin}${json.data.payment_link}`
          : json.data.payment_link
      setGeneratedLink(absoluteLink)
      setGeneratedExpiresAt(json.data.payment_link_expires_at ?? null)
      toast.success('付款連結已產生')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '連線失敗')
    } finally {
      setLinkGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast.success('已複製連結')
    } catch {
      toast.error('複製失敗、請手動選取')
    }
  }

  // 當收款方式變更時（method 為 SSOT、receipt_type 從 method.code 反推給 trigger 兼容）
  // 手續費 / 實收金額不在新增當下算、等會計按「確認」時 ReceiptDialogFooter 才算
  // （理由：pending 階段不該有實收、應該按下核准才依該付款方式的 fee_percent 才存檔）
  const handleReceiptTypeChange = (value: string) => {
    const method = paymentMethods.find(m => m.name === value)
    const code = method?.code || ''

    onUpdate(item.id, {
      payment_method_id: method?.id,
      payment_method_code: code,
      // receipt_type 存 m.name 字串（跟 SelectItem value 對齊、UI 才會 highlight 已選）
      // mutation 寫入 DB 時會用 resolveMethodCode + codeToReceiptType 算 number
      receipt_type: value as unknown as ReceiptType,
    })
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
            <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent disabled:bg-transparent disabled:text-morandi-primary px-0">
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
              <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent disabled:bg-transparent disabled:text-morandi-primary px-0">
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
              placeholder="收款資訊"
              disabled={readonly}
              className="input-no-focus w-full bg-transparent text-sm"
            />
          )}
        </td>

        {/* 備註 */}
        <td className="py-2 px-3 border-b border-border/50">
          <input
            type="text"
            value={item.notes || ''}
            onChange={e => onUpdate(item.id, { notes: e.target.value })}
            placeholder={t('paymentItemRemarks')}
            className="input-no-focus w-full bg-transparent text-sm"
          />
        </td>

        {/* 收款金額:所有有 payments.write 的角色都能輸（業務、會計）
            刪除按鈕在沒核帳權時掛這欄、有核帳權時跟在實收欄裡 */}
        <td className="py-2 px-3 border-b border-border/50 text-right">
          <div className="flex items-center justify-end gap-2">
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
                // 手續費 / 實收不在這算、等會計按「確認」時 ReceiptDialogFooter 才算
                onUpdate(item.id, { amount })
              }}
              placeholder="0"
              disabled={readonly}
              className="input-no-focus w-full bg-transparent text-sm text-right"
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

        {/* 實收金額 + 手續費 + 刪除：只有核帳權限（finance.payments-confirm.write）可見可填
            confirmed 後仍可改、會計對帳時直接覆蓋（覆蓋紀錄寫進 receipts.notes） */}
        {canConfirmReceipt && (
          <>
            <td className="py-2 px-3 border-b border-border/50 text-right">
              <div className="flex items-center justify-end gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.actual_amount ? formatMoney(item.actual_amount) : ''}
                  onChange={e => {
                    // 5/13 W 反饋：全形數字 → 半形
                    const raw = e.target.value
                      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
                      .replace(/,/g, '')
                    const num = parseFloat(raw)
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
              {/* 手續費小 input（可空、可改、跟實收同欄） */}
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-[0.65rem] text-morandi-muted shrink-0">
                  {t('paymentItemFee')}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.fees ? formatMoney(item.fees) : ''}
                  onChange={e => {
                    const raw = e.target.value
                      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
                      .replace(/,/g, '')
                    const num = parseFloat(raw)
                    onUpdate(item.id, { fees: isNaN(num) ? 0 : num })
                  }}
                  placeholder="0"
                  className="input-no-focus w-16 bg-transparent text-[0.65rem] text-morandi-muted text-right"
                />
              </div>
            </td>
          </>
        )}
      </tr>

      {/* 永豐 provider 子列：產生付款連結（2026-05-22 William 拍板）*/}
      {isSinopacProvider && !readonly && (
        <tr className="bg-morandi-gold/5 border-b border-border/50">
          <td colSpan={totalColumns} className="py-3 px-4">
            {!generatedLink ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-[0.65rem] text-morandi-secondary mb-1">
                    客戶 Email <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={e => setLinkEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                    disabled={linkGenerating}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[0.65rem] text-morandi-secondary mb-1">
                    連結有效
                  </label>
                  <select
                    value={linkDays}
                    onChange={e => setLinkDays(Number(e.target.value))}
                    disabled={linkGenerating}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value={1}>1 天</option>
                    <option value={3}>3 天</option>
                    <option value={7}>7 天</option>
                    <option value={14}>14 天</option>
                    <option value={30}>30 天</option>
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateLink}
                  disabled={linkGenerating || !item.amount}
                  className="h-8 gap-1.5"
                >
                  {linkGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  產生付款連結
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">連結已產生</span>
                  {generatedExpiresAt && (
                    <span className="text-xs text-morandi-muted">
                      有效至 {new Date(generatedExpiresAt).toLocaleString('zh-TW')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 h-8 px-2 rounded-md border border-input bg-card text-xs font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="h-8 px-2"
                    title="複製連結"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(generatedLink, '_blank')}
                    className="h-8 px-2"
                    title="開新分頁預覽"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setGeneratedLink(null)
                      setGeneratedExpiresAt(null)
                    }}
                    className="h-8 px-2 text-xs text-morandi-muted"
                  >
                    再產一筆
                  </Button>
                </div>
                <p className="text-[0.65rem] text-morandi-muted">
                  Phase 1 不會自動寄信、請複製連結手動傳給客戶（{linkEmail}）
                </p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
