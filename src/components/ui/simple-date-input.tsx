'use client'

import React, { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { UI_LABELS } from './constants/labels'

interface SimpleDateInputProps {
  value: string // YYYY-MM-DD 格式
  onChange: (value: string) => void
  min?: string
  className?: string
  placeholder?: string
  required?: boolean
  defaultMonth?: string // YYYY-MM-DD 格式，用於指定日曆預設顯示的月份
}

export function SimpleDateInput({
  value,
  onChange,
  min,
  className,
  placeholder = '選擇日期',
  required = false,
  defaultMonth,
}: SimpleDateInputProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const yearRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)

  // 分解日期
  const parts = value ? value.split('-') : []
  const year = parts[0] || ''
  const month = parts[1] || ''
  const day = parts[2] || ''

  // 轉換為 Date 物件（只有完整格式才解析）
  const dateValue =
    value && value.match(/^\d{4}-\d{2}-\d{2}$/) ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const minDate =
    min && min.match(/^\d{4}-\d{2}-\d{2}$/) ? parse(min, 'yyyy-MM-dd', new Date()) : undefined
  const defaultMonthDate =
    defaultMonth && defaultMonth.match(/^\d{4}-\d{2}-\d{2}$/)
      ? parse(defaultMonth, 'yyyy-MM-dd', new Date())
      : undefined

  // 計算日曆預設顯示的月份（優先級：當前值 > defaultMonth > min > 今天）
  const calendarDefaultMonth =
    dateValue && isValid(dateValue)
      ? dateValue
      : defaultMonthDate && isValid(defaultMonthDate)
        ? defaultMonthDate
        : minDate && isValid(minDate)
          ? minDate
          : undefined

  // 判斷是否為完整有效日期
  const isCompleteDate =
    year.length === 4 && month.length === 2 && day.length === 2 && dateValue && isValid(dateValue)

  // 格式化顯示文字（只有完整日期才顯示）
  const displayText = isCompleteDate ? format(dateValue!, 'yyyy-MM-dd') : ''

  // 從日曆選擇
  const handleCalendarSelect = (date: Date | { from: Date; to?: Date } | undefined) => {
    if (date && date instanceof Date) {
      const formatted = format(date, 'yyyy-MM-dd')
      onChange(formatted)
      setIsCalendarOpen(false)
    } else if (date && typeof date === 'object' && 'from' in date && date.from) {
      const formatted = format(date.from, 'yyyy-MM-dd')
      onChange(formatted)
      setIsCalendarOpen(false)
    }
  }

  // 處理年份輸入
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    const newValue = `${val}${month ? '-' + month : ''}${day ? '-' + day : ''}`
    onChange(newValue)
    if (val.length === 4) {
      monthRef.current?.focus()
    }
  }

  // 處理月份輸入
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (val.length === 2 && parseInt(val) > 12) val = '12'
    if (val === '00') val = ''

    const newValue = `${year}${val ? '-' + val : ''}${day ? '-' + day : ''}`
    onChange(newValue)

    if (val.length === 2 && parseInt(val) > 0 && parseInt(val) <= 12) {
      dayRef.current?.focus()
    }
  }

  // 處理日期輸入
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (val.length === 2 && parseInt(val) > 31) val = '31'
    if (val === '00') val = ''

    const newValue = `${year}${month ? '-' + month : ''}${val ? '-' + val : ''}`
    onChange(newValue)
  }

  // 鍵盤導航
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'year' | 'month' | 'day'
  ) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget
      if (input.value.length === 0 || input.selectionStart === 0) {
        if (type === 'day') monthRef.current?.focus()
        if (type === 'month') yearRef.current?.focus()
      }
    }
    if (e.key === '/' || e.key === '-') {
      e.preventDefault()
      if (type === 'year') monthRef.current?.focus()
      if (type === 'month') dayRef.current?.focus()
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* 5/13 William 反饋：父層 grid 擠太窄時日期會超出 input border、加 min-w-fit 保 content */}
      <div className="flex items-center gap-3 h-10 w-full min-w-fit rounded-md border border-input bg-card px-3 text-sm focus-within:border-morandi-gold transition-colors">
        {/* 顯示模式：已選擇日期 */}
        {displayText ? (
          <>
            <span className="flex-1 text-morandi-primary">{displayText}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-morandi-secondary/60 hover:text-morandi-red transition-colors"
              title={UI_LABELS.LABEL_6342}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        ) : (
          /* 輸入模式：未選擇日期 */
          <div className="flex items-center flex-1 gap-1">
            <input
              ref={yearRef}
              type="text"
              inputMode="numeric"
              value={year}
              onChange={handleYearChange}
              onKeyDown={e => handleKeyDown(e, 'year')}
              placeholder="YYYY"
              className="!bg-transparent !outline-none !border-0 !shadow-none !ring-0 !p-0 !m-0 !h-auto text-center placeholder:text-muted-foreground/40"
              style={{ width: '3.125rem', boxShadow: 'none' }}
              maxLength={4}
              required={required}
            />
            <span className="text-morandi-secondary/50">-</span>
            <input
              ref={monthRef}
              type="text"
              inputMode="numeric"
              value={month}
              onChange={handleMonthChange}
              onKeyDown={e => handleKeyDown(e, 'month')}
              placeholder="MM"
              className="!bg-transparent !outline-none !border-0 !shadow-none !ring-0 !p-0 !m-0 !h-auto text-center placeholder:text-muted-foreground/40"
              style={{ width: '2rem', boxShadow: 'none' }}
              maxLength={2}
              required={required}
            />
            <span className="text-morandi-secondary/50">-</span>
            <input
              ref={dayRef}
              type="text"
              inputMode="numeric"
              value={day}
              onChange={handleDayChange}
              onKeyDown={e => handleKeyDown(e, 'day')}
              placeholder="DD"
              className="!bg-transparent !outline-none !border-0 !shadow-none !ring-0 !p-0 !m-0 !h-auto text-center placeholder:text-muted-foreground/40"
              style={{ width: '2rem', boxShadow: 'none' }}
              maxLength={2}
              required={required}
            />
          </div>
        )}

        {/* 日曆按鈕（內嵌） */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-morandi-secondary/60 hover:text-morandi-primary transition-colors"
              title={UI_LABELS.SELECT_5234}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-0 bg-transparent p-0 shadow-none"
            align="start"
            side="bottom"
            sideOffset={4}
            avoidCollisions={false}
          >
            <Calendar
              mode="single"
              selected={dateValue && isValid(dateValue) ? dateValue : undefined}
              onSelect={handleCalendarSelect}
              disabled={minDate ? { before: minDate } : undefined}
              defaultMonth={calendarDefaultMonth}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
