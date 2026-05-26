'use client'

/**
 * QuickDateButtons — 快速選日期按鈕（今日 / 昨日 / 本月 / 上月 / 本季 / 本年）
 *
 * 用法：
 *   <QuickDateButtons onSelect={({ start, end }) => { setStartDate(start); setEndDate(end) }} />
 *
 * onlyEnd=true 模式（資產負債表 / 試算表用）：只提供「至今日 / 至本月底 / 至上月底 / 至本季末 / 至本年末」
 */

import { Button } from '@/components/ui/button'

const LABELS = {
  TODAY: '今日',
  YESTERDAY: '昨日',
  THIS_MONTH: '本月',
  LAST_MONTH: '上月',
  THIS_QUARTER: '本季',
  THIS_YEAR: '本年',
  AS_OF_TODAY: '至今日',
  AS_OF_MONTH_END: '至本月底',
  AS_OF_LAST_MONTH_END: '至上月底',
  AS_OF_QUARTER_END: '至本季末',
  AS_OF_YEAR_END: '至本年末',
} as const

interface QuickDateButtonsProps {
  onSelect: (range: { start: string; end: string }) => void
  /** 只提供「至 X」單一日期模式（給時點快照報表用）、預設 false */
  onlyEnd?: boolean
}

function fmt(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function today(): Date {
  return new Date()
}

function yesterday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthEnd(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function lastMonthStart(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() - 1, 1)
}

function lastMonthEnd(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 0)
}

function quarterStart(d = new Date()): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1)
}

function quarterEnd(d = new Date()): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3 + 3, 0)
}

function yearStart(d = new Date()): Date {
  return new Date(d.getFullYear(), 0, 1)
}

function yearEnd(d = new Date()): Date {
  return new Date(d.getFullYear(), 11, 31)
}

export function QuickDateButtons({ onSelect, onlyEnd = false }: QuickDateButtonsProps) {
  const buttons: { label: string; start: string; end: string }[] = onlyEnd
    ? [
        { label: LABELS.AS_OF_TODAY, start: fmt(today()), end: fmt(today()) },
        { label: LABELS.AS_OF_MONTH_END, start: fmt(monthEnd()), end: fmt(monthEnd()) },
        {
          label: LABELS.AS_OF_LAST_MONTH_END,
          start: fmt(lastMonthEnd()),
          end: fmt(lastMonthEnd()),
        },
        { label: LABELS.AS_OF_QUARTER_END, start: fmt(quarterEnd()), end: fmt(quarterEnd()) },
        { label: LABELS.AS_OF_YEAR_END, start: fmt(yearEnd()), end: fmt(yearEnd()) },
      ]
    : [
        { label: LABELS.TODAY, start: fmt(today()), end: fmt(today()) },
        { label: LABELS.YESTERDAY, start: fmt(yesterday()), end: fmt(yesterday()) },
        { label: LABELS.THIS_MONTH, start: fmt(monthStart()), end: fmt(monthEnd()) },
        { label: LABELS.LAST_MONTH, start: fmt(lastMonthStart()), end: fmt(lastMonthEnd()) },
        { label: LABELS.THIS_QUARTER, start: fmt(quarterStart()), end: fmt(quarterEnd()) },
        { label: LABELS.THIS_YEAR, start: fmt(yearStart()), end: fmt(yearEnd()) },
      ]

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {buttons.map(b => (
        <Button
          key={b.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect({ start: b.start, end: b.end })}
          className="text-xs"
        >
          {b.label}
        </Button>
      ))}
    </div>
  )
}
