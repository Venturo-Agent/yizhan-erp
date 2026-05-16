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
  /** 最小可選日期 */
  minDate?: Date
  /** 最大可選日期 */
  maxDate?: Date
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
    />
  )
}
