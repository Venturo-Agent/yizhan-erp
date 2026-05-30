'use client'

import React from 'react'
import { CurrencyCell } from '@/components/table-cells'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface QuickQuoteSummaryProps {
  totalCost: number
  totalAmount: number
  totalProfit: number
  receivedAmount: number
  balanceAmount: number
  isEditing: boolean
  expenseDescription: string
  /** embedded：合進大卡時不畫自己的外殼 */
  embedded?: boolean
  onReceivedAmountChange: (value: number) => void
  onExpenseDescriptionChange: (value: string) => void
}

// Excel 風 cell + input class（跟 Header / ItemsTable 對齊）
const labelCellCls =
  'px-2 py-1 text-xs text-center text-muted-foreground table-divider whitespace-nowrap w-[96px] bg-morandi-gold-header/40'
const valueCellCls = 'px-2 py-1 text-center text-sm font-medium'
const inputCls =
  'w-full h-7 text-sm text-center border-0 bg-transparent shadow-none px-0 py-0 focus-visible:ring-0 rounded-none outline-none'

export const QuickQuoteSummary: React.FC<QuickQuoteSummaryProps> = ({
  totalCost,
  totalAmount,
  totalProfit,
  receivedAmount,
  balanceAmount,
  isEditing,
  expenseDescription,
  embedded = false,
  onReceivedAmountChange,
  onExpenseDescriptionChange,
}) => {
  const t = useTranslations('orders')
  const normalizeNumber = (val: string): string => {
    // 全形轉半形
    val = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    val = val.replace(/[．]/g, '.')
    val = val.replace(/[－]/g, '-')
    return val
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  // 顯示金額 summary：編輯模式 5 欄、非編輯 3 欄
  const summaryColCount = isEditing ? 5 : 3

  // 統一容器：embedded 不畫框
  const sectionWrapperCls = embedded
    ? ''
    : 'border border-border bg-card rounded-xl shadow-sm overflow-hidden'

  const showCostDesc = isEditing || expenseDescription

  return (
    <>
      {/* 費用說明 */}
      {showCostDesc && (
        <div className={cn(sectionWrapperCls, embedded && 'border-b border-border')}>
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '96px' }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className={labelCellCls}>{t('quickQuoteSectionCostDesc')}</td>
                <td className="px-2 py-1">
                  {isEditing ? (
                    <textarea
                      value={expenseDescription}
                      onChange={e => onExpenseDescriptionChange(e.target.value)}
                      placeholder={t('quickQuoteSectionDescPlaceholder')}
                      className="w-full min-h-[64px] text-sm border-0 bg-transparent px-0 py-1 resize-y focus:outline-none focus-visible:ring-0"
                    />
                  ) : (
                    <p className="text-sm text-morandi-secondary whitespace-pre-wrap py-1">
                      {expenseDescription}
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 金額統計 — Excel 風 table、label row + value row */}
      <div className={sectionWrapperCls}>
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            {Array.from({ length: summaryColCount }).map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead className="bg-morandi-gold-header">
            <tr>
              {isEditing && (
                <th
                  className={cn(
                    labelCellCls,
                    'w-auto bg-transparent text-morandi-primary font-medium'
                  )}
                >
                  {t('quickQuoteSectionTotalCost')}
                </th>
              )}
              <th
                className={cn(
                  labelCellCls,
                  'w-auto bg-transparent text-morandi-primary font-medium'
                )}
              >
                {t('quickQuoteSectionReceivable')}
              </th>
              {isEditing && (
                <th
                  className={cn(
                    labelCellCls,
                    'w-auto bg-transparent text-morandi-primary font-medium'
                  )}
                >
                  {t('quickQuoteSectionTotalProfit')}
                </th>
              )}
              <th
                className={cn(
                  labelCellCls,
                  'w-auto bg-transparent text-morandi-primary font-medium'
                )}
              >
                {t('quickQuoteSectionReceived')}
              </th>
              <th
                className={cn(
                  'px-2 py-1 text-xs text-center whitespace-nowrap bg-transparent text-morandi-primary font-medium'
                )}
              >
                {t('quickQuoteSectionRemainder')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {isEditing && (
                <td className={cn(valueCellCls, 'table-divider')}>
                  <CurrencyCell amount={totalCost} className="text-base font-semibold" />
                </td>
              )}
              <td className={cn(valueCellCls, 'table-divider')}>
                <CurrencyCell amount={totalAmount} className="text-base font-semibold" />
              </td>
              {isEditing && (
                <td className={cn(valueCellCls, 'table-divider')}>
                  <CurrencyCell
                    amount={totalProfit}
                    variant={totalProfit >= 0 ? 'income' : 'expense'}
                    className="text-base font-semibold"
                  />
                </td>
              )}
              <td className={cn(valueCellCls, 'table-divider')}>
                {isEditing ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={receivedAmount === 0 ? '' : receivedAmount}
                    onChange={e => {
                      const val = normalizeNumber(e.target.value)
                      if (val === '' || val === '-') {
                        onReceivedAmountChange(0)
                      } else {
                        const num = parseFloat(val)
                        if (!isNaN(num)) {
                          onReceivedAmountChange(num)
                        }
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className={cn(inputCls, 'text-base font-semibold')}
                    placeholder=""
                  />
                ) : (
                  <CurrencyCell amount={receivedAmount} className="text-base font-semibold" />
                )}
              </td>
              <td className={cn(valueCellCls)}>
                <CurrencyCell
                  amount={balanceAmount}
                  variant={balanceAmount > 0 ? 'expense' : 'income'}
                  className="text-base font-semibold"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
