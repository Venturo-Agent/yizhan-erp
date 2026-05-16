'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const COMPONENT_LABELS = {
  PREV_MONTH: '上一月',
  NEXT_MONTH: '下一月',
  PREV_12_YEARS: '上 12 年',
  NEXT_12_YEARS: '下 12 年',
} as const

interface CalendarProps {
  mode?: 'single' | 'range'
  selected?: Date | { from: Date; to?: Date }
  onSelect?: (date: Date | { from: Date; to?: Date } | undefined) => void
  disabled?: ((date: Date) => boolean) | { before?: Date; after?: Date }
  locale?: Intl.Locale | string
  initialFocus?: boolean
  className?: string
  defaultMonth?: Date
  /** 在這些日期格子下方顯示金色事件圓點 */
  events?: Date[]
}

interface DayInfo {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isInRange?: boolean
  isRangeStart?: boolean
  isRangeEnd?: boolean
  hasEvent?: boolean
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
  defaultMonth,
  events,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    defaultMonth || (selected instanceof Date ? selected : new Date())
  )
  const [showYearPicker, setShowYearPicker] = React.useState(false)
  const [yearRangeStart, setYearRangeStart] = React.useState(() => {
    const year = (defaultMonth || (selected instanceof Date ? selected : new Date())).getFullYear()
    return Math.floor(year / 12) * 12
  })

  // 生成當月的所有日期（包含前後月份補齊，固定 6 行 42 天）
  const generateCalendarDays = (): DayInfo[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())

    const days: DayInfo[] = []
    const currentDate = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const dateToCheck = new Date(currentDate)
      dateToCheck.setHours(0, 0, 0, 0)

      const isCurrentMonth = currentDate.getMonth() === month
      const isToday = dateToCheck.getTime() === today.getTime()
      const isSelected = checkIfSelected(dateToCheck)
      const { isInRange, isRangeStart, isRangeEnd } = checkIfInRange(dateToCheck)
      const hasEvent = events?.some(e => sameDay(e, dateToCheck)) ?? false

      days.push({
        date: new Date(currentDate),
        isCurrentMonth,
        isToday,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
        hasEvent,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  const checkIfSelected = (date: Date): boolean => {
    if (!selected) return false

    if (selected instanceof Date) {
      const selectedDate = new Date(selected)
      selectedDate.setHours(0, 0, 0, 0)
      return date.getTime() === selectedDate.getTime()
    }

    if ('from' in selected) {
      const fromDate = new Date(selected.from)
      fromDate.setHours(0, 0, 0, 0)

      if (!selected.to) {
        return date.getTime() === fromDate.getTime()
      }

      const toDate = new Date(selected.to)
      toDate.setHours(0, 0, 0, 0)

      return date.getTime() === fromDate.getTime() || date.getTime() === toDate.getTime()
    }

    return false
  }

  const checkIfInRange = (
    date: Date
  ): { isInRange: boolean; isRangeStart: boolean; isRangeEnd: boolean } => {
    if (mode !== 'range' || !selected || selected instanceof Date || !('from' in selected)) {
      return { isInRange: false, isRangeStart: false, isRangeEnd: false }
    }

    const range = selected
    const fromDate = new Date(range.from)
    fromDate.setHours(0, 0, 0, 0)

    if (!range.to) {
      return {
        isInRange: false,
        isRangeStart: date.getTime() === fromDate.getTime(),
        isRangeEnd: false,
      }
    }

    const toDate = new Date(range.to)
    toDate.setHours(0, 0, 0, 0)

    const isInRange = date.getTime() > fromDate.getTime() && date.getTime() < toDate.getTime()
    const isRangeStart = date.getTime() === fromDate.getTime()
    const isRangeEnd = date.getTime() === toDate.getTime()

    return { isInRange, isRangeStart, isRangeEnd }
  }

  const isDateDisabled = (date: Date): boolean => {
    if (!disabled) return false

    if (typeof disabled === 'function') {
      return disabled(date)
    }

    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)

    if (disabled.before) {
      const beforeDate = new Date(disabled.before)
      beforeDate.setHours(0, 0, 0, 0)
      if (dateToCheck < beforeDate) return true
    }

    if (disabled.after) {
      const afterDate = new Date(disabled.after)
      afterDate.setHours(0, 0, 0, 0)
      if (dateToCheck > afterDate) return true
    }

    return false
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return

    if (mode === 'single') {
      onSelect?.(date)
    } else if (mode === 'range') {
      const isRangeSelected =
        selected && !((selected as Date) instanceof Date) && 'from' in selected
      const rangeHasTo = isRangeSelected && 'to' in selected && selected.to !== undefined

      if (!isRangeSelected || rangeHasTo) {
        onSelect?.({ from: date })
      } else {
        const from = selected.from
        if (date < from) {
          onSelect?.({ from: date, to: from })
        } else {
          onSelect?.({ from, to: date })
        }
      }
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  React.useEffect(() => {
    if (showYearPicker) {
      setYearRangeStart(Math.floor(currentMonth.getFullYear() / 12) * 12)
    }
  }, [showYearPicker, currentMonth])

  const selectYear = (year: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setFullYear(year)
      return newMonth
    })
    setShowYearPicker(false)
  }

  const days = generateCalendarDays()

  return (
    <div
      className={cn(
        'w-[20rem] rounded-xl border border-border bg-card p-4 shadow-md',
        className
      )}
    >
      {/* Header — title 左 / chevrons 右 */}
      <div className="flex items-center justify-between pb-3.5 px-1">
        <button
          type="button"
          onClick={() => setShowYearPicker(v => !v)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-morandi-primary transition-colors hover:bg-morandi-container/40 hover:text-morandi-gold"
        >
          <span>
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </span>
          <span className="text-[0.625rem] text-morandi-secondary">
            {showYearPicker ? '▲' : '▼'}
          </span>
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => navigateMonth('prev')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-morandi-secondary transition-colors hover:bg-morandi-container/40 hover:text-morandi-gold"
            aria-label={COMPONENT_LABELS.PREV_MONTH}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigateMonth('next')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-morandi-secondary transition-colors hover:bg-morandi-container/40 hover:text-morandi-gold"
            aria-label={COMPONENT_LABELS.NEXT_MONTH}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Year picker view */}
      {showYearPicker ? (
        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setYearRangeStart(y => y - 12)}
              className="flex h-6 w-6 items-center justify-center rounded text-morandi-secondary transition-colors hover:bg-morandi-container/40 hover:text-morandi-gold"
              aria-label={COMPONENT_LABELS.PREV_12_YEARS}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-medium text-morandi-secondary">
              {yearRangeStart} – {yearRangeStart + 11}
            </span>
            <button
              type="button"
              onClick={() => setYearRangeStart(y => y + 12)}
              className="flex h-6 w-6 items-center justify-center rounded text-morandi-secondary transition-colors hover:bg-morandi-container/40 hover:text-morandi-gold"
              aria-label={COMPONENT_LABELS.NEXT_12_YEARS}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map(year => {
              const isCurrentYear = year === currentMonth.getFullYear()
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => selectYear(year)}
                  className={cn(
                    'rounded-md py-2.5 text-sm font-medium transition-colors',
                    isCurrentYear
                      ? 'bg-morandi-gold text-white font-semibold'
                      : 'text-morandi-primary hover:bg-morandi-gold/10 hover:text-morandi-gold'
                  )}
                >
                  {year}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className="py-1 text-center text-xs font-medium text-cal-weekday-text"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map(day => {
              const isDisabled = isDateDisabled(day.date)
              return (
                <button
                  key={day.date.toISOString()}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDateClick(day.date)}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-lg text-[0.8125rem] font-medium transition-colors',
                    // 預設色（當月）
                    day.isCurrentMonth && !day.isSelected && !day.isToday && 'text-morandi-primary',
                    // 上下月（淡）
                    !day.isCurrentMonth && !day.isSelected && 'text-morandi-muted font-normal',
                    // 今天（金字 + ring inset，與 selected 有視覺區分）
                    day.isToday && !day.isSelected && 'text-cal-today-fg font-bold ring-1 ring-cal-today-ring ring-inset',
                    // 選中（cal-selected-bg 底 + 白字）
                    day.isSelected && 'bg-cal-selected-bg text-cal-selected-fg',
                    // 範圍內（淡金底）
                    day.isInRange && !day.isSelected && 'bg-morandi-gold/10',
                    // hover
                    !isDisabled && !day.isSelected && 'hover:bg-cal-day-hover',
                    // disabled
                    isDisabled && 'cursor-not-allowed opacity-40'
                  )}
                >
                  {day.date.getDate()}
                  {/* 事件圓點 */}
                  {day.hasEvent && !day.isSelected && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-morandi-gold" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
