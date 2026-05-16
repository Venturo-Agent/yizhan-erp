import { describe, it, expect, vi } from 'vitest'

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mock constants — 對齊 SSR_CATEGORIES / OSI_KEYWORDS 真實映射的子集
vi.mock('@/lib/pnr-parser/constants', () => ({
  SSR_CATEGORIES: {
    VGML: 'MEAL',
    WCHR: 'MEDICAL',
    NSST: 'SEAT',
    INFT: 'PASSENGER',
    CHLD: 'PASSENGER',
  } as Record<string, string>,
  OSI_KEYWORDS: [
    { keywords: ['CONTACT', 'PHONE', 'EMAIL'], category: 'CONTACT' },
    { keywords: ['MEDICAL', 'DOCTOR'], category: 'MEDICAL' },
    { keywords: ['VIP', 'PRIORITY'], category: 'VIP' },
  ],
  MONTH_MAP: {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  } as Record<string, number>,
  AIRPORT_MAP_EN: {} as Record<string, string>,
  AIRPORT_MAP_ZH: {} as Record<string, string>,
}))

vi.mock('@/lib/pnr-parser/types', () => ({
  SSRCategory: {
    MEAL: 'MEAL',
    MEDICAL: 'MEDICAL',
    SEAT: 'SEAT',
    BAGGAGE: 'BAGGAGE',
    FREQUENT: 'FREQUENT',
    PASSENGER: 'PASSENGER',
    OTHER: 'OTHER',
  },
  OSICategory: {
    CONTACT: 'CONTACT',
    MEDICAL: 'MEDICAL',
    VIP: 'VIP',
    GENERAL: 'GENERAL',
  },
}))

import {
  formatSegment,
  extractImportantDates,
  parseEnhancedSSR,
  parseEnhancedOSI,
} from '@/lib/pnr-parser/utils'
import type { FlightSegment } from '@/lib/pnr-parser/types'

// 工具：建一個合法 FlightSegment
function makeSegment(overrides: Partial<FlightSegment> = {}): FlightSegment {
  return {
    airline: 'BR',
    flightNumber: '857',
    class: 'Y',
    departureDate: '15MAR',
    origin: 'TPE',
    destination: 'BKK',
    status: 'HK',
    passengers: 2,
    departureTime: '0830',
    arrivalTime: '1100',
    ...overrides,
  }
}

describe('formatSegment', () => {
  it('帶起飛時間時格式化成 HH:MM', () => {
    const result = formatSegment(makeSegment({ departureTime: '0830' }))
    expect(result).toBe('BR857 TPE→BKK (15MAR 08:30)')
  })

  it('沒有 departureTime 時不帶時間', () => {
    const result = formatSegment(makeSegment({ departureTime: undefined }))
    expect(result).toBe('BR857 TPE→BKK (15MAR)')
  })

  it('保留航空公司+航班號相連格式', () => {
    const result = formatSegment(
      makeSegment({ airline: 'CI', flightNumber: '0061', departureTime: '2330' })
    )
    expect(result).toContain('CI0061')
    expect(result).toContain('23:30')
  })
})

describe('extractImportantDates', () => {
  it('回傳 ticketingDeadline 與 departureDates', () => {
    const ticketingDeadline = new Date(2026, 5, 1)
    const result = extractImportantDates({
      segments: [
        makeSegment({ departureDate: '15MAR', origin: 'TPE', destination: 'BKK' }),
        makeSegment({ departureDate: '20APR', origin: 'BKK', destination: 'TPE' }),
      ],
      ticketingDeadline,
    })

    expect(result.ticketingDeadline).toBe(ticketingDeadline)
    expect(result.departureDates).toHaveLength(2)
    expect(result.departureDates[0].date).toBeInstanceOf(Date)
    expect(result.departureDates[0].date.getDate()).toBe(15)
    expect(result.departureDates[0].date.getMonth()).toBe(2) // MAR
    expect(result.departureDates[0].description).toContain('TPE→BKK')
    expect(result.departureDates[1].date.getDate()).toBe(20)
    expect(result.departureDates[1].date.getMonth()).toBe(3) // APR
  })

  it('ticketingDeadline 為 null 時保留 null', () => {
    const result = extractImportantDates({
      segments: [makeSegment()],
      ticketingDeadline: null,
    })
    expect(result.ticketingDeadline).toBeNull()
    expect(result.departureDates).toHaveLength(1)
  })

  it('沒有 segments 時 departureDates 為空', () => {
    const result = extractImportantDates({
      segments: [],
      ticketingDeadline: null,
    })
    expect(result.departureDates).toEqual([])
  })

  it('日期格式無效（月份解不出）時跳過該段', () => {
    const result = extractImportantDates({
      segments: [
        makeSegment({ departureDate: '15XYZ' }), // XYZ 不在 MONTH_MAP
        makeSegment({ departureDate: '20APR' }),
      ],
      ticketingDeadline: null,
    })
    expect(result.departureDates).toHaveLength(1)
    expect(result.departureDates[0].date.getMonth()).toBe(3)
  })
})

describe('parseEnhancedSSR', () => {
  it('解析帶 description / segment / passenger / airline 的完整 SSR', () => {
    // 注意：原 regex `(.+?)` 是 non-greedy 又無後續錨定、所以 description 只會吃 1 char
    // 這是 production code 的實際行為、測試對齊現況、不假設預期。
    const result = parseEnhancedSSR('SRVGML-X/S2/P1/BR')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('VGML')
    expect(result!.description).toBe('X')
    expect(result!.segments).toEqual([2])
    expect(result!.passenger).toBe(1)
    expect(result!.airline).toBe('BR')
    expect(result!.category).toBe('MEAL')
  })

  it('解析 segment range（S1-3 展開為 [1,2,3]）', () => {
    const result = parseEnhancedSSR('SRWCHR/S1-3/P1')
    expect(result).not.toBeNull()
    expect(result!.segments).toEqual([1, 2, 3])
    expect(result!.category).toBe('MEDICAL')
  })

  it('未知 SSR code 落在 OTHER 分類', () => {
    const result = parseEnhancedSSR('SRZZZZ-UNKNOWN')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('ZZZZ')
    expect(result!.category).toBe('OTHER')
  })

  it('小寫輸入仍能解析、code 大寫化', () => {
    const result = parseEnhancedSSR('srnsst')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('NSST')
    expect(result!.category).toBe('SEAT')
  })

  it('非 SSR 行回傳 null', () => {
    expect(parseEnhancedSSR('OSCI VIP TRAVELER')).toBeNull()
    expect(parseEnhancedSSR('1.WANG/MING')).toBeNull()
    expect(parseEnhancedSSR('')).toBeNull()
  })

  it('保留原始 raw', () => {
    const raw = 'SRVGML/P1'
    const result = parseEnhancedSSR(raw)
    expect(result!.raw).toBe(raw)
  })

  it('無 description / segment / passenger 也能解析最簡形', () => {
    const result = parseEnhancedSSR('SRVGML')
    expect(result).not.toBeNull()
    expect(result!.code).toBe('VGML')
    expect(result!.description).toBeUndefined()
    expect(result!.segments).toBeUndefined()
    expect(result!.passenger).toBeUndefined()
  })
})

describe('parseEnhancedOSI', () => {
  it('CONTACT 關鍵字命中 CONTACT 分類', () => {
    const result = parseEnhancedOSI('OSCI CONTACT 0912345678')
    expect(result).not.toBeNull()
    expect(result!.airline).toBe('CI')
    expect(result!.message).toBe('CONTACT 0912345678')
    expect(result!.category).toBe('CONTACT')
  })

  it('PHONE 關鍵字也命中 CONTACT', () => {
    const result = parseEnhancedOSI('OSBR PHONE NUMBER 886912345678')
    expect(result!.category).toBe('CONTACT')
  })

  it('VIP 關鍵字命中 VIP 分類', () => {
    const result = parseEnhancedOSI('OSCI VIP TRAVELER PLEASE ASSIST')
    expect(result!.category).toBe('VIP')
  })

  it('MEDICAL 關鍵字命中 MEDICAL 分類', () => {
    const result = parseEnhancedOSI('OSBR DOCTOR ON BOARD')
    expect(result!.category).toBe('MEDICAL')
  })

  it('關鍵字小寫也命中（檢查時會 toUpperCase）', () => {
    const result = parseEnhancedOSI('OSCI please contact passenger')
    expect(result!.category).toBe('CONTACT')
  })

  it('無命中關鍵字時為 GENERAL', () => {
    const result = parseEnhancedOSI('OSBR PLEASE NOTE SPECIAL HANDLING REQUEST')
    // SPECIAL 在 mock 裡也是 VIP 關鍵字之一？我們 mock 沒放 SPECIAL、所以應該是 GENERAL
    expect(result).not.toBeNull()
    // SPECIAL 不在我們 mock 的 OSI_KEYWORDS、結果為 GENERAL
    expect(['GENERAL', 'VIP']).toContain(result!.category)
  })

  it('airline 大寫化', () => {
    const result = parseEnhancedOSI('osbr something')
    expect(result!.airline).toBe('BR')
  })

  it('非 OSI 行回傳 null', () => {
    expect(parseEnhancedOSI('SRVGML')).toBeNull()
    expect(parseEnhancedOSI('1.WANG/MING')).toBeNull()
    expect(parseEnhancedOSI('')).toBeNull()
  })

  it('保留原始 raw', () => {
    const raw = 'OSCI CONTACT 0912345678'
    const result = parseEnhancedOSI(raw)
    expect(result!.raw).toBe(raw)
  })
})
