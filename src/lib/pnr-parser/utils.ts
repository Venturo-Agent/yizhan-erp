/**
 * PNR 解析器工具函數
 */

import { logger } from '@/lib/utils/logger'
import { FlightSegment, EnhancedSSR, EnhancedOSI, SSRCategory, OSICategory } from './types'
import {
  SSR_CATEGORIES,
  OSI_KEYWORDS,
  MONTH_MAP,
  AIRPORT_MAP_EN,
  AIRPORT_MAP_ZH,
} from './constants'

/**
 * 驗證 PNR record locator 格式
 *
 * 標準：5-8 字、純英數大寫、無特殊字符
 * 拒絕：1.CHU / D2-SKV / abc123 / 含空白
 *
 * 故意嚴格、寧可拒絕讓 user 手動填、也不要靜默寫壞資料。
 */
export function isValidRecordLocator(locator: string | null | undefined): boolean {
  if (!locator) return false
  const cleaned = locator.trim()
  if (cleaned.length < 5 || cleaned.length > 8) return false
  return /^[A-Z0-9]+$/.test(cleaned)
}

/**
 * 合併跨行的 PNR 行（以空格開頭的行是上一行的延續）
 */
export function mergeMultilineEntries(rawPNR: string): string[] {
  const rawLines = rawPNR.split('\n')
  const mergedLines: string[] = []

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const hasLeadingSpaces = /^\s{4,}/.test(line)
    const isIndependentLine = /^\d+[\s.]/.test(trimmed)
    const isContinuation = hasLeadingSpaces && !isIndependentLine && mergedLines.length > 0

    if (isContinuation) {
      mergedLines[mergedLines.length - 1] += ' ' + trimmed
    } else {
      mergedLines.push(trimmed)
    }
  }

  return mergedLines
}

/**
 * 解析 Amadeus 日期格式 (DDMMM) 轉換為 Date
 */
export function parseAmadeusDate(day: string, monthStr: string, time?: string): Date | null {
  const month = MONTH_MAP[monthStr]
  if (month === undefined) return null

  const dayNum = parseInt(day, 10)
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) return null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  let year = currentYear
  if (month < currentMonth || (month === currentMonth && dayNum < now.getDate())) {
    year++
  }

  let hour = 0
  let minute = 0
  if (time && time.length === 4) {
    hour = parseInt(time.slice(0, 2), 10)
    minute = parseInt(time.slice(2, 4), 10)
  }

  return new Date(year, month, dayNum, hour, minute)
}

/**
 * 格式化航班資訊為可讀字串
 */
export function formatSegment(segment: FlightSegment): string {
  const { airline, flightNumber, origin, destination, departureDate, departureTime } = segment
  const time = departureTime ? ` ${departureTime.slice(0, 2)}:${departureTime.slice(2)}` : ''
  return `${airline}${flightNumber} ${origin}→${destination} (${departureDate}${time})`
}

/**
 * 從 PNR 提取所有重要日期
 */
export function extractImportantDates(parsed: {
  segments: FlightSegment[]
  ticketingDeadline: Date | null
}): {
  ticketingDeadline: Date | null
  departureDates: Array<{ date: Date; description: string }>
} {
  const departureDates: Array<{ date: Date; description: string }> = []

  for (const segment of parsed.segments) {
    const date = parseAmadeusDate(
      segment.departureDate.slice(0, 2),
      segment.departureDate.slice(2, 5)
    )
    if (date) {
      departureDates.push({
        date,
        description: formatSegment(segment),
      })
    }
  }

  return {
    ticketingDeadline: parsed.ticketingDeadline,
    departureDates,
  }
}

/**
 * 檢查 PNR 是否需要緊急處理（出票期限在 3 天內）
 */
export function isUrgent(ticketingDeadline: Date | null): boolean {
  if (!ticketingDeadline) return false
  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  return ticketingDeadline <= threeDaysLater
}

/**
 * 解析增強型 SSR
 */
export function parseEnhancedSSR(line: string): EnhancedSSR | null {
  const match = line.match(
    /^SR([A-Z]{4})(?:-(.+?))?(?:\/S(\d+(?:-\d+)?))?(?:\/P(\d+))?(?:\/([A-Z]{2}))?/i
  )
  if (!match) return null

  const code = match[1].toUpperCase()
  const description = match[2]?.trim()
  const segmentStr = match[3]
  const passenger = match[4] ? parseInt(match[4]) : undefined
  const airline = match[5]

  let segments: number[] | undefined
  if (segmentStr) {
    if (segmentStr.includes('-')) {
      const [start, end] = segmentStr.split('-').map(Number)
      segments = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    } else {
      segments = [parseInt(segmentStr)]
    }
  }

  return {
    code,
    description,
    segments,
    passenger,
    airline,
    raw: line,
    category: SSR_CATEGORIES[code] || SSRCategory.OTHER,
  }
}

/**
 * 解析增強型 OSI
 */
export function parseEnhancedOSI(line: string): EnhancedOSI | null {
  const match = line.match(/^OS([A-Z]{2})\s+(.+)/i)
  if (!match) return null

  const airline = match[1].toUpperCase()
  const message = match[2].trim()

  let category = OSICategory.GENERAL
  for (const { keywords, category: cat } of OSI_KEYWORDS) {
    if (keywords.some(keyword => message.toUpperCase().includes(keyword))) {
      category = cat
      break
    }
  }

  return {
    airline,
    message,
    raw: line,
    category,
  }
}

/**
 * 從地點名稱提取機場代碼（英文）
 */
export function extractAirportCode(locationName: string): string {
  const upperName = locationName.toUpperCase()

  for (const [key, code] of Object.entries(AIRPORT_MAP_EN)) {
    if (upperName.includes(key)) {
      return code
    }
  }

  const codeMatch = upperName.match(/\(([A-Z]{3})\)/)
  if (codeMatch) {
    return codeMatch[1]
  }

  return upperName.replace(/[^A-Z]/g, '').slice(0, 3) || 'XXX'
}

/**
 * 從中文機場名稱提取機場代碼
 */
export function extractTripComAirportCode(airportName: string): string {
  const cleanName = airportName.replace(/國際機場|機場/g, '').trim()

  for (const [key, code] of Object.entries(AIRPORT_MAP_ZH)) {
    if (cleanName.includes(key)) {
      return code
    }
  }

  const codeMatch = airportName.match(/\(([A-Z]{3})\)/)
  if (codeMatch) {
    return codeMatch[1]
  }

  logger.warn('  ⚠️ 未知機場:', airportName)
  return 'XXX'
}
