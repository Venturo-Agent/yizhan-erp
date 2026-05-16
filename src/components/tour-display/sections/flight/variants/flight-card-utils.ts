// ============================================
// 航班卡片共用工具函數與型別
// ============================================

const MONTHS_EN = [
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
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface FormattedDate {
  full: string // "21 OCT 2024"
  short: string // "10.21"
  day: string // "Mon"
  month: string // "OCT"
  date: number // 21
  year: number // 2024
}

export function parseFlightDate(dateStr: string | undefined | null): FormattedDate | null {
  if (!dateStr) return null

  try {
    // 嘗試 "MM/DD" 格式
    const mmddMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (mmddMatch) {
      const month = parseInt(mmddMatch[1], 10) - 1
      const date = parseInt(mmddMatch[2], 10)
      if (month >= 0 && month < 12 && date >= 1 && date <= 31) {
        return {
          full: `${date} ${MONTHS_EN[month]}`,
          short: `${month + 1}.${date.toString().padStart(2, '0')}`,
          day: '--',
          month: MONTHS_EN[month],
          date,
          year: 0,
        }
      }
    }

    // 嘗試 "MM/DD/YYYY" 格式
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyyMatch) {
      const month = parseInt(mmddyyyyMatch[1], 10) - 1
      const date = parseInt(mmddyyyyMatch[2], 10)
      const year = parseInt(mmddyyyyMatch[3], 10)
      const d = new Date(year, month, date)
      if (month >= 0 && month < 12 && date >= 1 && date <= 31) {
        return {
          full: `${date} ${MONTHS_EN[month]} ${year}`,
          short: `${month + 1}.${date.toString().padStart(2, '0')}`,
          day: DAYS_EN[d.getDay()],
          month: MONTHS_EN[month],
          date,
          year,
        }
      }
    }

    // 嘗試 ISO "YYYY-MM-DD" 格式
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear()
      if (year < 2020 || year > 2100) return null
      const month = d.getMonth()
      const date = d.getDate()
      return {
        full: `${date} ${MONTHS_EN[month]} ${year}`,
        short: `${month + 1}.${date.toString().padStart(2, '0')}`,
        day: DAYS_EN[d.getDay()],
        month: MONTHS_EN[month],
        date,
        year,
      }
    }

    return null
  } catch {
    return null
  }
}

export function extractCityName(airport: string | undefined | null): string {
  if (!airport) return '--'
  // 移除機場代碼，只保留城市名
  // "桃園 (TPE)" → "桃園"
  // "Tokyo Narita (NRT)" → "Tokyo Narita"
  return airport.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim() || '--'
}

// 各樣式卡片的共用 props 介面
export interface FlightCardVariantProps {
  flight: import('@/types/flight.types').FlightInfo
  type: 'outbound' | 'return'
  theme: import('@/app/(main)/tours/_themes').TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}
