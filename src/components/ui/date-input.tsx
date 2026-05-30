'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'

const COMPONENT_LABELS = {
  PICK_DATE: '選擇日期',
} as const
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, parse, isValid } from 'date-fns'

interface DateInputProps {
  value: string // ISO 8601 格式 (YYYY-MM-DD)
  onChange: (value: string) => void
  _placeholder?: string
  disabled?: boolean
  className?: string
  min?: string
  max?: string
  /** 日曆預設顯示月份（YYYY-MM-DD）— 用於起訖日連動 */
  defaultMonth?: string
  /** HTML form 必填、3 段都會帶 required */
  required?: boolean
}

export function DateInput({
  value,
  onChange,
  _placeholder = 'YYYY-MM-DD',
  disabled = false,
  className,
  min,
  max,
  defaultMonth,
  required,
}: DateInputProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  // 將 ISO 格式轉換為顯示格式
  const formatToDisplay = (isoDate: string): { year: string; month: string; day: string } => {
    if (!isoDate || isoDate.length < 10) {
      return { year: '', month: '', day: '' }
    }
    const [year, month, day] = isoDate.split('-')
    return { year, month, day }
  }

  const initial = formatToDisplay(value)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [day, setDay] = useState(initial.day)

  const yearRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)

  // 同步外部 value 的變化
  useEffect(() => {
    const formatted = formatToDisplay(value)
    setYear(formatted.year)
    setMonth(formatted.month)
    setDay(formatted.day)
  }, [value])

  // 組合日期並回傳 ISO 格式
  const emitDate = (y: string, m: string, d: string) => {
    // 全部清空時視為清除日期
    if (!y && !m && !d) {
      onChange('')
      return
    }
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      const isoDate = `${y}-${m}-${d}`

      // 驗證日期有效性
      const date = new Date(isoDate)
      if (isNaN(date.getTime())) return

      // 檢查 min/max 限制
      if (min && isoDate < min) return
      if (max && isoDate > max) return

      onChange(isoDate)
    }
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setYear(val)
    if (val.length === 4) {
      monthRef.current?.focus()
      monthRef.current?.select()
    }
    emitDate(val, month, day)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')

    // 避免預設零的問題：如果輸入的第一個數字 > 1，自動補零
    if (val.length === 1 && parseInt(val) > 1) {
      val = '0' + val
    }

    // 限制最多 2 位數
    val = val.slice(0, 2)

    // 限制範圍 01-12
    if (val.length === 2) {
      const num = parseInt(val)
      if (num < 1) val = '01'
      if (num > 12) val = '12'
    }

    setMonth(val)

    if (val.length === 2) {
      dayRef.current?.focus()
      dayRef.current?.select()
    }

    emitDate(year, val, day)
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')

    // 避免預設零的問題：如果輸入的第一個數字 > 3，自動補零
    if (val.length === 1 && parseInt(val) > 3) {
      val = '0' + val
    }

    // 限制最多 2 位數
    val = val.slice(0, 2)

    // 限制範圍 01-31
    if (val.length === 2) {
      const num = parseInt(val)
      if (num < 1) val = '01'
      if (num > 31) val = '31'
    }

    setDay(val)
    emitDate(year, month, val)
  }

  const handleYearKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && year.length === 0 && e.currentTarget.selectionStart === 0) {
      // 在年份欄位開頭按 Backspace，不做任何事
      return
    }
  }

  const handleMonthKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && month.length === 0 && e.currentTarget.selectionStart === 0) {
      yearRef.current?.focus()
      const len = year.length
      yearRef.current?.setSelectionRange(len, len)
    }
  }

  const handleDayKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && day.length === 0 && e.currentTarget.selectionStart === 0) {
      monthRef.current?.focus()
      const len = month.length
      monthRef.current?.setSelectionRange(len, len)
    }
  }

  // 轉換為 Date 物件供 Calendar 使用
  const dateValue =
    value && value.match(/^\d{4}-\d{2}-\d{2}$/) ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const minDate =
    min && min.match(/^\d{4}-\d{2}-\d{2}$/) ? parse(min, 'yyyy-MM-dd', new Date()) : undefined
  const maxDate =
    max && max.match(/^\d{4}-\d{2}-\d{2}$/) ? parse(max, 'yyyy-MM-dd', new Date()) : undefined
  const defaultMonthDate =
    defaultMonth && defaultMonth.match(/^\d{4}-\d{2}-\d{2}$/)
      ? parse(defaultMonth, 'yyyy-MM-dd', new Date())
      : undefined
  // 日曆預設聚焦月：當前值 > defaultMonth > min > 今天
  const calendarDefaultMonth =
    dateValue && isValid(dateValue)
      ? dateValue
      : defaultMonthDate && isValid(defaultMonthDate)
        ? defaultMonthDate
        : minDate && isValid(minDate)
          ? minDate
          : undefined

  // 從日曆選擇日期
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && isValid(date)) {
      const formatted = format(date, 'yyyy-MM-dd')
      onChange(formatted)
      setIsCalendarOpen(false)
    }
  }

  return (
    <div
      className={cn(
        // 5/13 William 反饋：父層 grid 擠太窄時日期會超出 input border、加 min-w-fit 保 content
        'flex items-center h-10 w-full min-w-fit rounded-md border border-input bg-card px-3 text-sm transition-colors',
        'focus-within:outline-none focus-within:border-morandi-gold',
        disabled && 'cursor-not-allowed opacity-60 bg-input-disabled-bg',
        className
      )}
    >
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        value={year}
        onChange={handleYearChange}
        onKeyDown={handleYearKeyDown}
        placeholder="YYYY"
        disabled={disabled}
        required={required}
        className="w-14 !h-auto !p-0 !border-0 !rounded-none !bg-transparent !outline-none !ring-0 !shadow-none placeholder:text-morandi-secondary/50 text-center"
        style={{ boxShadow: 'none' }}
        maxLength={4}
      />
      <span className="text-morandi-secondary/50 px-1">-</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        value={month}
        onChange={handleMonthChange}
        onKeyDown={handleMonthKeyDown}
        placeholder="MM"
        disabled={disabled}
        required={required}
        className="w-10 !h-auto !p-0 !border-0 !rounded-none !bg-transparent !outline-none !ring-0 !shadow-none placeholder:text-morandi-secondary/50 text-center"
        style={{ boxShadow: 'none' }}
        maxLength={2}
      />
      <span className="text-morandi-secondary/50 px-1">-</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        value={day}
        onChange={handleDayChange}
        onKeyDown={handleDayKeyDown}
        placeholder="DD"
        disabled={disabled}
        required={required}
        className="w-10 !h-auto !p-0 !border-0 !rounded-none !bg-transparent !outline-none !ring-0 !shadow-none placeholder:text-morandi-secondary/50 text-center"
        style={{ boxShadow: 'none' }}
        maxLength={2}
      />
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="ml-auto text-morandi-secondary hover:text-morandi-primary transition-colors"
            aria-label={COMPONENT_LABELS.PICK_DATE}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto border-0 bg-transparent p-0 shadow-none"
          align="end"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={dateValue && isValid(dateValue) ? dateValue : undefined}
            onSelect={
              handleCalendarSelect as (date: Date | { from: Date; to?: Date } | undefined) => void
            }
            disabled={minDate || maxDate ? { before: minDate, after: maxDate } : undefined}
            defaultMonth={calendarDefaultMonth}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
