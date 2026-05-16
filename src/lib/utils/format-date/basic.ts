/**
 * 基本日期格式化工具
 * 統一全專案日期顯示格式
 */

/**
 * 格式化日期為 YYYY-MM-DD
 * @param date - ISO 字串或 Date 物件
 * @returns YYYY-MM-DD 格式的日期字串
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為公司統一格式 (YYYY-MM-DD)
 * 規範：全公司日期顯示一律 YYYY-MM-DD、月日補零
 * 函式名稱保留 formatDateTW 以維持既有 import、行為等同 formatDate
 * @param date - ISO 字串或 Date 物件
 * @returns 2024-01-15 格式的日期字串
 */
export function formatDateTW(date: string | Date | null | undefined): string {
  return formatDate(date)
}

/**
 * 格式化日期為簡短格式 (MM-DD)
 * 規範：補零、用 - 連接、跟全站 YYYY-MM-DD 一致
 * @param date - ISO 字串或 Date 物件
 * @returns 01-15 格式的日期字串
 */
export function formatDateCompact(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * 等同 formatDateCompact、向後相容別名
 */
export const formatDateCompactPadded = formatDateCompact

/**
 * 格式化日期為顯示格式 (同 formatDate / formatDateTW，YYYY-MM-DD)
 */
export const formatDateDisplay = formatDateTW

/**
 * 格式化月份為英文短格式
 * @param date - ISO 字串或 Date 物件
 * @returns JAN, FEB, MAR 等
 */
export function formatMonthShort(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    return months[d.getMonth()]
  } catch {
    return ''
  }
}

/**
 * 取得今天的日期字串 (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return formatDate(new Date())
}

/**
 * 判斷兩個日期是否為同一天
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * 計算兩個日期間的天數差
 */
export function daysBetween(start: Date | string, end: Date | string): number {
  const d1 = typeof start === 'string' ? new Date(start) : start
  const d2 = typeof end === 'string' ? new Date(end) : end

  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 取得日期的日 (1-31)
 * @param date - ISO 字串或 Date 物件
 * @returns 日期數字
 */
export function getDay(date: string | Date | null | undefined): number {
  if (!date) return 0

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 0

    return d.getDate()
  } catch {
    return 0
  }
}

/**
 * 格式化為 ISO 日期格式 (YYYY-MM-DD)，使用台北時區
 * 用於 FullCalendar 等需要純日期字串的場景
 * @param date - Date 物件
 * @returns YYYY-MM-DD 格式
 */
export function formatDateISO(date: Date | null | undefined): string {
  if (!date) return ''

  try {
    if (isNaN(date.getTime())) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為簡短英文格式 (JAN 15)
 * @param date - ISO 字串或 Date 物件
 * @returns "JAN 15" 格式的日期字串
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    // Handle MM/DD format strings
    if (typeof date === 'string') {
      const mmddMatch = date.match(/^(\d{1,2})\/(\d{1,2})$/)
      if (mmddMatch) {
        const months = [
          'JAN',
          'FEB',
          'MAR',
          'APR',
          'MAY',
          'JUN',
          'JUL',
          'AUG',
          'SEP',
          'OCT',
          'NOV',
          'DEC',
        ]
        const month = parseInt(mmddMatch[1], 10) - 1
        const day = parseInt(mmddMatch[2], 10)
        if (month >= 0 && month < 12) return `${months[month]} ${day}`
      }
    }

    const d = typeof date === 'string' ? new Date(date.replace(/\//g, '-')) : date
    if (isNaN(d.getTime())) return ''

    const month = formatMonthShort(d)
    const day = d.getDate()
    return `${month} ${day}`
  } catch {
    return typeof date === 'string' ? date : ''
  }
}

/**
 * 格式化日期為英文月日格式 (Jan 15)
 * @param date - ISO 字串或 Date 物件
 * @returns Jan 15 格式
 */
export function formatDateMonthDayEN(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${months[d.getMonth()]} ${d.getDate()}`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為「MM-DD」短格式（規格 §1：monthDay）
 * 範例：2026-05-09 → "05-09"
 */
export function formatMonthDay(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
}
