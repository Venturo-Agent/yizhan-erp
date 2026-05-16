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
  actions?: React.ReactNode
  /** embedded：合進大卡時不畫自己的外殼 */
  embedded?: boolean
}

export const QuickQuoteHeader: React.FC<QuickQuoteHeaderProps> = ({
  formData,
  isEditing,
  onFieldChange,
  actions,
  embedded = false,
}) => {
  const t = useTranslations('orders')
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <div className={embedded ? 'p-6' : 'bg-card border border-border rounded-xl p-6'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-morandi-primary">
          {t('quickQuoteClientInfo')}
        </h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('quickQuoteClientName')}
          </label>
          <Input
            value={formData.customer_name}
            onChange={e => onFieldChange('customer_name', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('quickQuoteContactPhone')}
          </label>
          <Input
            value={formData.contact_phone}
            onChange={e => onFieldChange('contact_phone', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('quickQuoteAddress')}
          </label>
          <Input
            value={formData.contact_address}
            onChange={e => onFieldChange('contact_address', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('quickQuoteGroupCode')}
          </label>
          <Input
            value={formData.tour_code}
            onChange={e => onFieldChange('tour_code', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('quickQuoteSalesAgent')}
          </label>
          <Input
            value={formData.handler_name}
            onChange={e => onFieldChange('handler_name', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {t('quickQuoteIssueDate')}
          </label>
          <DatePicker
            value={formData.issue_date}
            onChange={date => onFieldChange('issue_date', date || '')}
            disabled={!isEditing}
            placeholder={t('quickQuoteDateSelect')}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}
