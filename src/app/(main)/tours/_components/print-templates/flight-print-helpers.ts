/**
 * flight-print-helpers - 航班列印用的工具函式
 * （純函式、不依賴 React，從 flight-print-template.ts 抽離）
 */
import { SSRCategory } from '@/lib/pnr-parser/types'
import type { EnhancedSSR, EnhancedOSI } from '@/lib/pnr-parser'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNR = any

export function calculateDuration(
  depTime: string | undefined,
  arrTime: string | undefined
): string | null {
  if (!depTime || !arrTime || depTime.length < 4 || arrTime.length < 4) return null
  const depHour = parseInt(depTime.substring(0, 2))
  const depMin = parseInt(depTime.substring(2, 4))
  const arrHour = parseInt(arrTime.substring(0, 2))
  const arrMin = parseInt(arrTime.substring(2, 4))
  let totalMin = arrHour * 60 + arrMin - (depHour * 60 + depMin)
  if (totalMin < 0) totalMin += 24 * 60
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hours}h ${String(mins).padStart(2, '0')}m`
}

export function formatPnrDate(dateStr: string): string {
  const months: Record<string, number> = {
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
  }
  const day = parseInt(dateStr.substring(0, 2))
  const monthStr = dateStr.substring(2, 5).toUpperCase()
  const month = months[monthStr] ?? 0
  const currentYear = new Date().getFullYear()
  const date = new Date(currentYear, month, day)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${currentYear}年${String(month + 1).padStart(2, '0')}月${String(day).padStart(2, '0')}日 (${weekdays[date.getDay()]})`
}

export function formatTime(time: string | undefined): string {
  if (!time || time.length < 4) return ''
  return `${time.substring(0, 2)}:${time.substring(2, 4)}`
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Extract baggage info for a specific segment from SSR/OSI */
export function getBaggageForSegment(pnr: PNR | undefined, segmentIndex: number): string | null {
  if (!pnr) return null

  // Try SSR baggage first
  const ssrBaggage = pnr.special_requests?.filter(
    (ssr: EnhancedSSR) => ssr.category === SSRCategory.BAGGAGE
  )
  if (ssrBaggage && ssrBaggage.length > 0) {
    // Find segment-specific baggage
    const segSpecific = ssrBaggage.find((ssr: EnhancedSSR) =>
      ssr.segments?.includes(segmentIndex + 1)
    )
    if (segSpecific) {
      return segSpecific.description || segSpecific.raw
    }
    // If no segment-specific, use the first one (applies to all)
    if (ssrBaggage[0].description) return ssrBaggage[0].description
    return ssrBaggage[0].raw
  }

  // Try OSI baggage (Trip.com style)
  const osiBaggage = pnr.other_info?.filter(
    (osi: EnhancedOSI) => osi.message.includes('託運行李') || osi.message.includes('手提行李')
  )
  if (osiBaggage && osiBaggage.length > 0) {
    return osiBaggage.map((o: EnhancedOSI) => o.message).join(' / ')
  }

  return null
}

/** Get non-baggage, non-meal SSR tags for display */
export function getDisplaySSRTags(pnr: PNR | undefined): EnhancedSSR[] {
  if (!pnr?.special_requests) return []
  return pnr.special_requests.filter(
    (ssr: EnhancedSSR) => ssr.category !== SSRCategory.BAGGAGE && ssr.category !== SSRCategory.MEAL
  )
}

/** Get meal SSR tags */
export function getMealSSRTags(pnr: PNR | undefined): EnhancedSSR[] {
  if (!pnr?.special_requests) return []
  return pnr.special_requests.filter((ssr: EnhancedSSR) => ssr.category === SSRCategory.MEAL)
}
