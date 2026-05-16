import { describe, it, expect, vi } from 'vitest'

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mock constants
vi.mock('@/lib/pnr-parser/constants', () => ({
  SSR_CATEGORIES: { VGML: 'meal', WCHR: 'medical' },
  OSI_KEYWORDS: [
    { keywords: ['CONTACT', 'PHONE'], category: 'contact' },
    { keywords: ['VIP'], category: 'vip' },
  ],
  MONTH_MAP: {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  } as Record<string, number>,
  AIRPORT_MAP_EN: { BANGKOK: 'BKK', TOKYO: 'NRT' } as Record<string, string>,
  AIRPORT_MAP_ZH: { 曼谷: 'BKK', 東京: 'NRT' } as Record<string, string>,
}))

// Mock types
vi.mock('@/lib/pnr-parser/types', () => ({
  SSRCategory: {
    MEAL: 'meal',
    MEDICAL: 'medical',
    OTHER: 'other',
    SEAT: 'seat',
    BAGGAGE: 'baggage',
    FREQUENT: 'frequent',
    PASSENGER: 'passenger',
  },
  OSICategory: { GENERAL: 'general', CONTACT: 'contact', VIP: 'vip', MEDICAL: 'medical' },
}))

import {
  mergeMultilineEntries,
  parseAmadeusDate,
  isUrgent,
  extractAirportCode,
  extractTripComAirportCode,
} from '@/lib/pnr-parser/utils'

describe('mergeMultilineEntries', () => {
  it('合併跨行條目', () => {
    const input = '1. FIRST LINE\n      CONTINUATION\n2. SECOND LINE'
    const result = mergeMultilineEntries(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toContain('FIRST LINE')
    expect(result[0]).toContain('CONTINUATION')
    expect(result[1]).toContain('SECOND LINE')
  })

  it('空輸入返回空陣列', () => {
    expect(mergeMultilineEntries('')).toEqual([])
  })

  it('跳過空行', () => {
    const input = '1. LINE ONE\n\n\n2. LINE TWO'
    const result = mergeMultilineEntries(input)
    expect(result).toHaveLength(2)
  })
})

describe('parseAmadeusDate', () => {
  it('解析有效日期', () => {
    const result = parseAmadeusDate('15', 'MAR')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getDate()).toBe(15)
    expect(result!.getMonth()).toBe(2) // March = 2
  })

  it('解析帶時間', () => {
    const result = parseAmadeusDate('15', 'MAR', '1430')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getHours()).toBe(14)
    expect(result!.getMinutes()).toBe(30)
  })

  it('無效月份返回 null', () => {
    expect(parseAmadeusDate('15', 'XYZ')).toBeNull()
  })

  it('無效日期返回 null', () => {
    expect(parseAmadeusDate('0', 'JAN')).toBeNull()
    expect(parseAmadeusDate('32', 'JAN')).toBeNull()
    expect(parseAmadeusDate('abc', 'JAN')).toBeNull()
  })
})

describe('isUrgent', () => {
  it('null 返回 false', () => {
    expect(isUrgent(null)).toBe(false)
  })

  it('3 天內返回 true', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isUrgent(tomorrow)).toBe(true)
  })

  it('10 天後返回 false', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    expect(isUrgent(future)).toBe(false)
  })

  it('已過期返回 true', () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    expect(isUrgent(past)).toBe(true)
  })
})

describe('extractAirportCode', () => {
  it('從英文名稱提取', () => {
    expect(extractAirportCode('Bangkok International')).toBe('BKK')
  })

  it('從括號中提取三字碼', () => {
    expect(extractAirportCode('Some Airport (CNX)')).toBe('CNX')
  })

  it('未知名稱截取前三碼', () => {
    const result = extractAirportCode('ABCDEF')
    expect(result).toHaveLength(3)
  })
})

describe('extractTripComAirportCode', () => {
  it('從中文名稱提取', () => {
    expect(extractTripComAirportCode('曼谷國際機場')).toBe('BKK')
  })

  it('從括號中提取', () => {
    expect(extractTripComAirportCode('某機場 (CNX)')).toBe('CNX')
  })
})
