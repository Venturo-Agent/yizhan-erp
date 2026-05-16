'use client'

import { getTodayString } from '@/lib/utils/format-date'
import { useEffect } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { useLayoutContext } from '@/lib/auth/useLayoutContext'
import { useTranslations } from 'next-intl'

const WEEKDAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

interface RequestDateInputProps {
  value: string
  onChange: (date: string, isSpecialBilling: boolean) => void
  label?: string
}

export function RequestDateInput({
  value,
  onChange,
  label,
}: RequestDateInputProps) {
  const t = useTranslations('finance')
  const resolvedLabel = label ?? t('requestDateLabel')
  // SSOT：workspace.default_billing_day_of_week（admin 在 /settings/company 設定）
  // null = 不指定、不區分正常/特殊出帳
  const { payload } = useLayoutContext()
  const defaultBillingDay = payload.workspace?.default_billing_day_of_week ?? null

  // 預設帶入今天（不指定時所有日期都當「正常出帳」、isSpecial = false）
  useEffect(() => {
    if (!value) {
      const today = getTodayString()
      const isSpecial =
        defaultBillingDay !== null &&
        new Date(today + 'T00:00:00').getDay() !== defaultBillingDay
      onChange(today, isSpecial)
    }
  }, [defaultBillingDay])

  const handleDateChange = (selectedDate: string) => {
    if (defaultBillingDay === null) {
      onChange(selectedDate, false)
      return
    }
    const isDefaultDay = selectedDate
      ? new Date(selectedDate + 'T00:00:00').getDay() === defaultBillingDay
      : false
    onChange(selectedDate, !isDefaultDay)
  }

  const isSpecialBilling =
    defaultBillingDay !== null &&
    !!value &&
    new Date(value + 'T00:00:00').getDay() !== defaultBillingDay

  // 跟 Combobox 同高、不放 label 跟提示文字（避免 header flex row 高度不齊）
  // special billing 用底色提示、滑鼠 hover 看 title 完整文字
  const defaultDayName = defaultBillingDay !== null ? WEEKDAY_NAMES[defaultBillingDay] : null
  const tooltip =
    !value
      ? undefined
      : defaultBillingDay === null
        ? '一般請款（未設定預設出帳日、不區分正常/特殊）'
        : isSpecialBilling
          ? `特殊出帳：非${defaultDayName}請款`
          : `正常出帳：${defaultDayName}請款`

  return (
    <div title={tooltip}>
      <DatePicker
        value={value}
        onChange={date => handleDateChange(date)}
        className={cn(isSpecialBilling && 'bg-morandi-gold/10 border-morandi-gold/30')}
        placeholder={resolvedLabel || t('paymentItemSelectDate')}
      />
    </div>
  )
}
