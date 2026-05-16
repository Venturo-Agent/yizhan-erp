'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { CurrencyCell } from '@/components/table-cells'
import { useTranslations } from 'next-intl'

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

  return (
    <>
      {/* 費用說明 - 只在編輯模式或有內容時顯示 */}
      {(isEditing || expenseDescription) && (
        <div className={embedded ? 'space-y-3 p-6' : 'space-y-3'}>
          <h2 className="text-lg font-semibold text-morandi-primary">
            {t('quickQuoteSectionCostDesc')}
          </h2>
          {isEditing ? (
            <textarea
              value={expenseDescription}
              onChange={e => onExpenseDescriptionChange(e.target.value)}
              placeholder={t('quickQuoteSectionDescPlaceholder')}
              className="w-full min-h-[100px] p-3 border border-border rounded-md text-sm resize-y bg-card focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
            />
          ) : (
            <p className="text-sm text-morandi-secondary whitespace-pre-wrap">
              {expenseDescription}
            </p>
          )}
        </div>
      )}

      {/* 金額統計 */}
      <div className={embedded ? 'p-6' : 'bg-card border border-border rounded-xl p-6'}>
        <h2 className="text-lg font-semibold text-morandi-primary mb-4">
          {t('quickQuoteSectionAmountSummary')}
        </h2>
        <div className={`grid gap-4 ${isEditing ? 'grid-cols-5' : 'grid-cols-3'}`}>
          {isEditing && (
            <div className="p-4 bg-morandi-container/10 rounded-lg">
              <label className="text-sm font-medium text-morandi-primary">
                {t('quickQuoteSectionTotalCost')}
              </label>
              <CurrencyCell amount={totalCost} className="mt-1 text-2xl font-bold" />
            </div>
          )}
          <div className="p-4 bg-morandi-container/10 rounded-lg">
            <label className="text-sm font-medium text-morandi-primary">
              {t('quickQuoteSectionReceivable')}
            </label>
            <CurrencyCell amount={totalAmount} className="mt-1 text-2xl font-bold" />
          </div>
          {isEditing && (
            <div className="p-4 bg-morandi-container/10 rounded-lg">
              <label className="text-sm font-medium text-morandi-primary">
                {t('quickQuoteSectionTotalProfit')}
              </label>
              <CurrencyCell
                amount={totalProfit}
                variant={totalProfit >= 0 ? 'income' : 'expense'}
                className="mt-1 text-2xl font-bold"
              />
            </div>
          )}
          <div className="p-4 bg-morandi-container/10 rounded-lg">
            <label className="text-sm font-medium text-morandi-primary">
              {t('quickQuoteSectionReceived')}
            </label>
            {isEditing ? (
              <Input
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
                className="mt-1 text-xl font-bold"
                step="0.01"
                placeholder=""
              />
            ) : (
              <CurrencyCell amount={receivedAmount} className="mt-1 text-2xl font-bold" />
            )}
          </div>
          <div className="p-4 bg-morandi-container/10 rounded-lg">
            <label className="text-sm font-medium text-morandi-primary">
              {t('quickQuoteSectionRemainder')}
            </label>
            <CurrencyCell
              amount={balanceAmount}
              variant={balanceAmount > 0 ? 'expense' : 'income'}
              className="mt-1 text-2xl font-bold"
            />
          </div>
        </div>
      </div>
    </>
  )
}
