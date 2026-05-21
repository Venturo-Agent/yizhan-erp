'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { useTranslations } from 'next-intl'

interface FormData {
  customer_name: string
  contact_phone: string
  contact_address: string
  tour_code: string
  handler_name: string
  issue_date: string
}

interface QuickQuoteHeaderProps {
  formData: FormData
  isEditing: boolean
  onFieldChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  /** embedded：合進大卡時不畫自己的外殼 */
  embedded?: boolean
}

// Excel 風 input：無框、置中、focus 時不顯眼
const inputCls =
  'h-7 text-sm text-center border-0 bg-transparent shadow-none px-0 py-0 focus-visible:ring-0 rounded-none'

export const QuickQuoteHeader: React.FC<QuickQuoteHeaderProps> = ({
  formData,
  isEditing,
  onFieldChange,
  embedded = false,
}) => {
  const t = useTranslations('orders')
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const labelCellCls =
    'px-2 py-1 text-xs text-center text-muted-foreground table-divider whitespace-nowrap w-[88px] bg-morandi-gold-header/40'

  return (
    <div
      className={
        embedded
          ? 'border-b border-border'
          : 'border border-border bg-card rounded-xl shadow-sm overflow-hidden'
      }
    >
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: '88px' }} />
          <col />
          <col style={{ width: '88px' }} />
          <col />
        </colgroup>
        {/*
          欄位順序對齊列印版（PrintableQuickQuoteInfoGrid）：
          團體名稱 / 團體編號 → 聯絡電話 / 承辦業務 → 通訊地址（跨欄）→ 開單日期（跨欄）
          列印是 2-column grid、編輯是 4-cell（label+input × 2）/ row、業務對照不會錯位
        */}
        <tbody>
          <tr className="border-b border-border/60">
            <td className={labelCellCls}>{t('quickQuoteClientName')}</td>
            <td className="px-2 py-1 table-divider">
              <Input
                value={formData.customer_name}
                onChange={e => onFieldChange('customer_name', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isEditing}
                className={inputCls}
              />
            </td>
            <td className={labelCellCls}>{t('quickQuoteGroupCode')}</td>
            <td className="px-2 py-1">
              <Input
                value={formData.tour_code}
                onChange={e => onFieldChange('tour_code', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isEditing}
                className={inputCls}
              />
            </td>
          </tr>
          <tr className="border-b border-border/60">
            <td className={labelCellCls}>{t('quickQuoteContactPhone')}</td>
            <td className="px-2 py-1 table-divider">
              <Input
                value={formData.contact_phone}
                onChange={e => onFieldChange('contact_phone', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isEditing}
                className={inputCls}
              />
            </td>
            <td className={labelCellCls}>{t('quickQuoteSalesAgent')}</td>
            <td className="px-2 py-1">
              <Input
                value={formData.handler_name}
                onChange={e => onFieldChange('handler_name', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isEditing}
                className={inputCls}
              />
            </td>
          </tr>
          <tr className="border-b border-border/60">
            <td className={labelCellCls}>{t('quickQuoteAddress')}</td>
            <td className="px-2 py-1" colSpan={3}>
              <Input
                value={formData.contact_address}
                onChange={e => onFieldChange('contact_address', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isEditing}
                className={inputCls}
              />
            </td>
          </tr>
          <tr>
            <td className={labelCellCls}>{t('quickQuoteIssueDate')}</td>
            <td className="px-2 py-1" colSpan={3}>
              <DatePicker
                value={formData.issue_date}
                onChange={date => onFieldChange('issue_date', date || '')}
                disabled={!isEditing}
                placeholder={t('quickQuoteDateSelect')}
                className={inputCls}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
