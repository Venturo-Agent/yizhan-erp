/**
 * usePackageItinerary helpers
 * 純邏輯 helper — 不含 React hooks、不含 UI、不含 side effects
 * 搬移自 usePackageItinerary.ts 以降低主檔行數
 */

import { stripHtml } from '@/lib/utils/string-utils'
import type { Itinerary, ItineraryVersionRecord } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'
import type { DailyScheduleItem, ItineraryFormData, SimpleActivity } from './types'

// ============================================
// 常數
// ============================================

export const COMPONENT_LABELS = {
  ITINERARY_UPDATED: '行程表更新成功',
  SAVED_AS_NEW_VERSION: '已另存為新版本',
  SAVE_AS_NEW_VERSION_FAILED: '另存新版本失敗：',
  UNKNOWN_ERROR: '未知錯誤',
} as const

// ============================================
// 每日行程初始化
// ============================================

/**
 * 產生指定天數的空白每日行程陣列
 */
export function buildEmptyDailySchedule(days: number): DailyScheduleItem[] {
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    route: '',
    meals: { breakfast: '', lunch: '', dinner: '' },
    accommodation: '',
    sameAsPrevious: false,
    hotelBreakfast: false,
    lunchSelf: false,
    dinnerSelf: false,
    activities: undefined,
  }))
}

// ============================================
// 從行程表資料載入每日排程
// ============================================

type RawDayData = {
  title?: string
  meals?: { breakfast?: string; lunch?: string; dinner?: string }
  accommodation?: string
  activities?: Array<{ id?: string; title?: string; startTime?: string; endTime?: string }>
}

interface LoadDailyDataResult {
  schedule: DailyScheduleItem[]
  hasActivities: boolean
  formPatch: Partial<Pick<ItineraryFormData, 'title' | 'outboundFlight' | 'returnFlight'>>
}

/**
 * 從 Itinerary 資料（含版本）轉換成 DailyScheduleItem[]
 * 純函數：只做資料轉換，不 setState
 */
export function buildDailyScheduleFromItinerary(
  itinerary: Itinerary,
  versionIndex: number,
  days: number
): LoadDailyDataResult {
  const versionRecordsData = (itinerary.version_records || []) as ItineraryVersionRecord[]

  let dailyData: RawDayData[] | null = null

  if (versionIndex === -1) {
    dailyData = (itinerary.daily_itinerary || []) as unknown as RawDayData[]
  } else if (versionRecordsData[versionIndex]) {
    dailyData = (versionRecordsData[versionIndex].daily_itinerary || []) as unknown as RawDayData[]
  }

  const formPatch: Partial<Pick<ItineraryFormData, 'title' | 'outboundFlight' | 'returnFlight'>> = {
    title: stripHtml(itinerary.title) || undefined,
    outboundFlight:
      (itinerary.flight_info?.outbound as FlightInfo | null | undefined) ||
      (itinerary as { outbound_flight?: FlightInfo }).outbound_flight ||
      null,
    returnFlight:
      (itinerary.flight_info?.return as FlightInfo | null | undefined) ||
      (itinerary as { return_flight?: FlightInfo }).return_flight ||
      null,
  }

  if (!dailyData || dailyData.length === 0) {
    return {
      schedule: buildEmptyDailySchedule(days),
      hasActivities: false,
      formPatch,
    }
  }

  const schedule = dailyData.map((day, idx) => {
    const isHotelBreakfast = day.meals?.breakfast === '飯店早餐'
    const isLunchSelf = day.meals?.lunch === '敬請自理' || day.meals?.lunch === '自理'
    const isDinnerSelf = day.meals?.dinner === '敬請自理' || day.meals?.dinner === '自理'
    let sameAsPrevious = false
    if (idx > 0) {
      const prevAccommodation = dailyData![idx - 1]?.accommodation
      sameAsPrevious =
        Boolean(day.accommodation?.includes('續住')) ||
        Boolean(prevAccommodation && day.accommodation === prevAccommodation)
    }
    const activities: SimpleActivity[] = (day.activities || []).map((act, actIdx) => ({
      id: act.id || `activity-${idx}-${actIdx}`,
      title: act.title || '',
      startTime: act.startTime || '',
      endTime: act.endTime || '',
    }))
    return {
      day: idx + 1,
      route: day.title || '',
      meals: {
        breakfast: isHotelBreakfast ? '' : day.meals?.breakfast || '',
        lunch: isLunchSelf ? '' : day.meals?.lunch || '',
        dinner: isDinnerSelf ? '' : day.meals?.dinner || '',
      },
      accommodation: sameAsPrevious ? '' : day.accommodation || '',
      sameAsPrevious,
      hotelBreakfast: isHotelBreakfast,
      lunchSelf: isLunchSelf,
      dinnerSelf: isDinnerSelf,
      activities: activities.length > 0 ? activities : undefined,
    }
  })

  const hasActivities = schedule.some(d => d.activities && d.activities.length > 0)

  return { schedule, hasActivities, formPatch }
}

// ============================================
// 航班 payload 建構
// ============================================

export interface FlightPayload {
  airline: string | null
  flightNumber: string | null
  departureAirport: string | null
  departureTime: string | null
  departureDate: string
  arrivalAirport: string | null
  arrivalTime: string | null
  duration: string
}

/**
 * 將 FlightInfo 轉成寫入 DB 的格式（統一結構、不散落在 handleSubmit）
 */
export function buildFlightPayload(flight: FlightInfo): FlightPayload {
  return {
    airline: flight.airline ?? null,
    flightNumber: flight.flightNumber ?? null,
    departureAirport: flight.departureAirport ?? null,
    departureTime: flight.departureTime ?? null,
    departureDate: '',
    arrivalAirport: flight.arrivalAirport ?? null,
    arrivalTime: flight.arrivalTime ?? null,
    duration: '',
  }
}
