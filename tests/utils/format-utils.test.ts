import { describe, it, expect } from 'vitest'
import { formatCurrency, formatMoney, formatTWD, formatUSD } from '@/lib/utils/format-currency'
import {
  formatDate,
  formatDateTW,
  formatDateCompact,
  formatDateTime,
  isSameDay,
  daysBetween,
  parseLocalDate,
  toTaipeiDateString,
  formatWeekday,
  formatDateChinese,
} from '@/lib/utils/format-date'
import { formatTimeInput, isValidTimeFormat, fullWidthToHalf } from '@/lib/utils/format-time-input'

describe('format-currency', () => {
  it('should format TWD', () => {
    expect(formatCurrency(1000, 'TWD')).toBe('NT$ 1,000')
    expect(formatTWD(1000)).toBe('NT$ 1,000')
  })

  it('should format USD', () => {
    expect(formatUSD(1000)).toBe('$ 1,000')
  })

  it('should handle negative amounts', () => {
    expect(formatCurrency(-500, 'TWD')).toBe('-NT$ 500')
  })

  it('should handle null/undefined', () => {
    expect(formatCurrency(null)).toBe('')
    expect(formatCurrency(undefined)).toBe('')
    expect(formatMoney(null)).toBe('')
  })

  it('should format money without symbol', () => {
    expect(formatMoney(12345)).toBe('12,345')
  })
})

describe('format-date', () => {
  it('should format date as YYYY-MM-DD', () => {
    expect(formatDate('2025-01-28')).toBe('2025-01-28')
    expect(formatDate(null)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('should format TW date as YYYY-MM-DD', () => {
    const result = formatDateTW(new Date(2025, 0, 28))
    expect(result).toBe('2025-01-28')
  })

  it('should format compact date as MM-DD', () => {
    const result = formatDateCompact(new Date(2025, 0, 5))
    expect(result).toBe('01-05')
  })

  it('should check same day', () => {
    expect(isSameDay('2025-01-28', '2025-01-28')).toBe(true)
    expect(isSameDay('2025-01-28', '2025-01-29')).toBe(false)
  })

  it('should calculate days between', () => {
    expect(daysBetween('2025-01-28', '2025-01-30')).toBe(2)
  })

  it('should parse local date', () => {
    const d = parseLocalDate('2025-01-28')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2025)
    expect(d!.getMonth()).toBe(0)
    expect(d!.getDate()).toBe(28)
  })

  it('should handle invalid parse', () => {
    expect(parseLocalDate(null)).toBeNull()
    expect(parseLocalDate('invalid')).toBeNull()
  })

  it('should format weekday', () => {
    // 2025-01-28 is Tuesday
    const result = formatWeekday(new Date(2025, 0, 28))
    expect(result).toBe('週二')
  })

  it('should format Chinese date', () => {
    expect(formatDateChinese(new Date(2025, 0, 28))).toBe('2025年1月28日')
  })
})

describe('format-time-input', () => {
  it('should format 4-digit time', () => {
    expect(formatTimeInput('0700')).toBe('07:00')
    expect(formatTimeInput('1430')).toBe('14:30')
  })

  it('should format 3-digit time', () => {
    expect(formatTimeInput('700')).toBe('07:00')
  })

  it('should pass through valid HH:MM', () => {
    expect(formatTimeInput('07:00')).toBe('07:00')
  })

  it('should handle full-width input', () => {
    expect(formatTimeInput('０７００')).toBe('07:00')
    expect(fullWidthToHalf('０７：００')).toBe('07:00')
  })

  it('should handle empty', () => {
    expect(formatTimeInput('')).toBe('')
  })

  it('should validate time format', () => {
    expect(isValidTimeFormat('07:00')).toBe(true)
    expect(isValidTimeFormat('23:59')).toBe(true)
    expect(isValidTimeFormat('25:00')).toBe(false)
    expect(isValidTimeFormat('')).toBe(true) // empty is valid (optional)
  })
})
