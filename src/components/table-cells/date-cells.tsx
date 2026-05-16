'use client'

import React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTW, formatDateTime } from '@/lib/utils/format-date'
import { TABLE_CELLS_LABELS } from './constants/labels'

// ========== 類型定義 ==========

interface DateCellProps {
  date?: string | Date | null
  format?: 'short' | 'long' | 'time'
  fallback?: string
  className?: string
  showIcon?: boolean
}

interface DateRangeCellProps {
  start?: string | Date | null
  end?: string | Date | null
  format?: 'short' | 'long'
  showDuration?: boolean
  className?: string
}

// ========== 輔助函數 ==========

/**
 * 格式化日期（使用統一的格式化工具）
 */
function formatDateLocal(date: Date, format: 'short' | 'long' | 'time' = 'short'): string {
  if (format === 'time') {
    return formatDateTime(date)
  }

  if (format === 'long') {
    // 長格式：2024年1月15日 (週一)
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
    const weekday = weekdays[date.getDay()]
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekday})`
  }

  // short format (default) - 使用統一的 formatDateTW
  return formatDateTW(date)
}

/**
 * 計算日期區間天數
 */
function calculateDuration(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1 // +1 包含起始日
}

// ========== 組件 ==========

/**
 * DateCell - 日期單元格
 *
 * 統一的日期顯示組件，處理空值、無效日期等邊界情況
 *
 * @example
 * ```tsx
 * <DateCell date={tour.departure_date} showIcon />
 * <DateCell date={order.created_at} format="time" />
 * ```
 */
export function DateCell({
  date,
  format = 'short',
  fallback = '未設定',
  className,
  showIcon = true,
}: DateCellProps) {
  if (!date) {
    return <span className={cn('text-sm text-morandi-red', className)}>{fallback}</span>
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return (
      <span className={cn('text-sm text-morandi-red', className)}>
        {TABLE_CELLS_LABELS.LABEL_5349}
      </span>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm text-morandi-primary', className)}>
      {showIcon && <Calendar size="0.875em" className="text-morandi-secondary flex-shrink-0" />}
      <span>{formatDateLocal(dateObj, format)}</span>
    </div>
  )
}

/**
 * DateRangeCell - 日期區間單元格
 *
 * 顯示開始和結束日期，可選顯示天數
 *
 * @example
 * ```tsx
 * <DateRangeCell start={tour.departure_date} end={tour.return_date} showDuration />
 * ```
 */
export function DateRangeCell({
  start,
  end,
  format = 'short',
  showDuration = true,
  className,
}: DateRangeCellProps) {
  if (!start || !end) {
    return <span className="text-sm text-morandi-secondary">-</span>
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return <span className="text-sm text-morandi-red">{TABLE_CELLS_LABELS.LABEL_5349}</span>
  }

  const duration = calculateDuration(startDate, endDate)

  return (
    <div className={cn('text-sm', className)}>
      <div className="text-morandi-primary">
        {formatDateLocal(startDate, format)} ~ {formatDateLocal(endDate, format)}
      </div>
      {showDuration && (
        <div className="text-xs text-morandi-secondary">
          {TABLE_CELLS_LABELS.LABEL_5332} {duration} 天
        </div>
      )}
    </div>
  )
}
