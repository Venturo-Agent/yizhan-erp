'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { DateInput } from './date-input'

interface DatePickerProps {
  value?: string | Date | null
  onChange?: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  /** 日期格式：'YYYY-MM-DD' (預設) 或 'YYYY/MM/DD' — 影響 onChange 回傳格式 */
  format?: 'dash' | 'slash'
  /** 最小可選日期（Date 或 YYYY-MM-DD / YYYY/MM/DD 字串）*/
  minDate?: Date | string
  /** 最大可選日期（Date 或 YYYY-MM-DD / YYYY/MM/DD 字串）*/
  maxDate?: Date | string
  /** 日曆預設顯示月份（用於起訖日連動時、預設聚焦在起日的月） */
  defaultMonth?: Date | string
  /** HTML form 必填 */
  required?: boolean
  /** 是否顯示清除按鈕（DateInput 內建支援） */
  clearable?: boolean
}

/**
 * 統一的日期選擇器組件
 *
 * DateInput 的薄包裝、提供 3 段直打版（YYYY/MM/DD）+ 月曆 popover。
 *
 * 對外 API 維持相容（value / onChange / disabled / className / minDate / maxDate）。
 */
function toIsoString(val: string | Date | null | undefined): string {
  if (!val) return ''
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return ''
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return val.replace(/\//g, '-')
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  className,
  buttonClassName,
  format = 'dash',
  minDate,
  maxDate,
  defaultMonth,
  required,
}: DatePickerProps) {
  const handleChange = (iso: string) => {
    if (!onChange) return
    if (format === 'slash') {
      onChange(iso.replace(/-/g, '/'))
    } else {
      onChange(iso)
    }
  }

  return (
    <DateInput
      value={toIsoString(value)}
      onChange={handleChange}
      disabled={disabled}
      className={cn(className, buttonClassName)}
      min={toIsoString(minDate)}
      max={toIsoString(maxDate)}
      defaultMonth={toIsoString(defaultMonth)}
      required={required}
    />
  )
}
