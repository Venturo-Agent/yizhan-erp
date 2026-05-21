'use client'

/**
 * useItineraryLoader — 行程表載入邏輯 hook
 *
 * 從 TourItineraryTab 抽出，負責：
 * - 從 itineraries / coreItems / tourItineraryDays 組合出初始 dailySchedule
 * - 載入航班資料（兼容舊格式：單一物件 / 新格式：陣列）
 * - 查詢景點驗證狀態
 * - 核心表（day_meta）優先、fallback 到 itinerary.daily_itinerary
 *
 * 以 useEffect 觸發，依 tour.id / itineraries.length / coreItems.length 變動重載。
 */

import { useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tour } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'
import type { DailyScheduleItem } from '../_components/itinerary/DayRow'

interface UseItineraryLoaderParams {
  tour: Tour
  itineraries: Array<{
    id: string
    tour_id?: string | null
    outbound_flight?: unknown
    return_flight?: unknown
    daily_itinerary?: unknown
  }>
  coreItems: Array<{
    id: string
    day_number: number | null
    category: string | null
    sub_category?: string | null
    title: string | null
    resource_id?: string | null
    day_route?: string | null
    day_note?: string | null
    day_blocks?: unknown
    is_same_accommodation?: boolean | null
    breakfast_preset?: string | null
    lunch_preset?: string | null
    dinner_preset?: string | null
  }>
  tourItineraryDays: Array<{
    id: string
    day_number: number | null
    category: string | null
    sub_category?: string | null
    title: string | null
    resource_id?: string | null
    day_route?: string | null
    day_note?: string | null
    day_blocks?: unknown
    is_same_accommodation?: boolean | null
    breakfast_preset?: string | null
    lunch_preset?: string | null
    dinner_preset?: string | null
  }>
  calculateDays: () => number
  initializeDailySchedule: (days: number) => DailyScheduleItem[]
  // State setters
  setLoading: (v: boolean) => void
  setCurrentItineraryId: (id: string) => void
  setTitle: (v: string) => void
  setOutboundFlights: (v: FlightInfo[]) => void
  setReturnFlights: (v: FlightInfo[]) => void
  setOutboundFlightDate: (v: string) => void
  setReturnFlightDate: (v: string) => void
  setDailySchedule: (v: DailyScheduleItem[]) => void
  setNumDays: (v: number) => void
}

export function useItineraryLoader({
  tour,
  itineraries,
  coreItems,
  tourItineraryDays,
  calculateDays,
  initializeDailySchedule,
  setLoading,
  setCurrentItineraryId,
  setTitle,
  setOutboundFlights,
  setReturnFlights,
  setOutboundFlightDate,
  setReturnFlightDate,
  setDailySchedule,
  setNumDays,
}: UseItineraryLoaderParams) {
  useEffect(() => {
    const loadItinerary = async () => {
      setLoading(true)
      try {
        const itinerary = itineraries.find(i => i.tour_id === tour.id)

        if (itinerary) {
          setCurrentItineraryId(itinerary.id)
          // 行程標題永遠從核心表 tour.name 讀取，不受展示頁面影響
          setTitle(tour.name || '')

          // 載入航班資料（兼容舊格式：單一物件 / 新格式：陣列）
          const emptyFlight: FlightInfo = {
            airline: '',
            flightNumber: '',
            departureAirport: '',
            departureTime: '',
            arrivalAirport: '',
            arrivalTime: '',
          }
          if (itinerary.outbound_flight) {
            const outbound = itinerary.outbound_flight
            const outboundArr = (Array.isArray(outbound) ? outbound : [outbound]) as FlightInfo[]
            setOutboundFlights(outboundArr)
            const firstDate = (outboundArr[0] as FlightInfo & { departureDate?: string })
              ?.departureDate
            if (firstDate) setOutboundFlightDate(firstDate)
          } else {
            setOutboundFlights([{ ...emptyFlight }])
          }
          if (itinerary.return_flight) {
            const returnFlt = itinerary.return_flight
            const returnArr = (
              Array.isArray(returnFlt) ? returnFlt : [returnFlt]
            ) as FlightInfo[]
            setReturnFlights(returnArr)
            const firstDate = (returnArr[0] as FlightInfo & { departureDate?: string })
              ?.departureDate
            if (firstDate) setReturnFlightDate(firstDate)
          } else {
            setReturnFlights([{ ...emptyFlight }])
          }

          if (itinerary.daily_itinerary && Array.isArray(itinerary.daily_itinerary)) {
            // 從核心表建立 day→meals/accommodation/activities 對應
            const coreMealsByDay: Record<
              number,
              { breakfast: string; lunch: string; dinner: string }
            > = {}
            const coreAccomByDay: Record<number, string> = {}
            const coreAccomIdByDay: Record<number, string> = {}
            const coreMealIdsByDay: Record<
              number,
              { breakfast?: string; lunch?: string; dinner?: string }
            > = {}
            const coreActivitiesByDay: Record<
              number,
              Array<{ title: string; attraction_id?: string; verified?: boolean }>
            > = {}
            for (const item of coreItems) {
              const dn = item.day_number
              if (!dn) continue
              if (item.category === 'meals' && item.sub_category) {
                if (!coreMealsByDay[dn])
                  coreMealsByDay[dn] = { breakfast: '', lunch: '', dinner: '' }
                if (!coreMealIdsByDay[dn]) coreMealIdsByDay[dn] = {}
                const key =
                  item.sub_category === 'breakfast'
                    ? 'breakfast'
                    : item.sub_category === 'lunch'
                      ? 'lunch'
                      : 'dinner'
                coreMealsByDay[dn][key] = item.title || ''
                if (item.resource_id) {
                  coreMealIdsByDay[dn][key] = item.resource_id
                }
              } else if (item.category === 'accommodation') {
                coreAccomByDay[dn] = item.title || ''
                if (item.resource_id) {
                  coreAccomIdByDay[dn] = item.resource_id
                }
              } else if (item.category === 'activities') {
                if (!coreActivitiesByDay[dn]) coreActivitiesByDay[dn] = []
                coreActivitiesByDay[dn].push({
                  title: item.title || '',
                  attraction_id: item.resource_id || undefined,
                })
              }
            }

            // 查詢所有景點的驗證狀態
            const allAttractionIds = Object.values(coreActivitiesByDay)
              .flat()
              .filter(a => a.attraction_id)
              .map(a => a.attraction_id!)
            const verifiedMap: Record<string, boolean> = {}
            if (allAttractionIds.length > 0) {
              const sb = createSupabaseBrowserClient()
              const { data: verifiedData } = await sb
                .from('attractions')
                .select('id, data_verified')
                .in('id', allAttractionIds)
              for (const v of verifiedData || []) {
                verifiedMap[v.id] = v.data_verified ?? true
              }
            }

            // 核心表優先：若 items 有 day_meta rows，day-level metadata 從新表讀
            const daysByNumber: Record<number, (typeof tourItineraryDays)[number]> = {}
            for (const d of tourItineraryDays) {
              if (d.day_number) daysByNumber[d.day_number] = d
            }
            const hasNewTableRows = tourItineraryDays.length > 0

            const schedule = (
              itinerary.daily_itinerary as Array<{
                title?: string
                description?: string
                meals?: { breakfast?: string; lunch?: string; dinner?: string }
                accommodation?: string
                isSameAccommodation?: boolean
                activities?: Array<{ title?: string; attraction_id?: string }>
              }>
            ).map((day, idx) => {
              const dayNum = idx + 1
              const coreMeals = coreMealsByDay[dayNum]
              const coreAccom = coreAccomByDay[dayNum]
              const coreActs = coreActivitiesByDay[dayNum]
              const dayRow = daysByNumber[dayNum]

              const breakfast = coreMeals?.breakfast || day.meals?.breakfast || ''
              const lunch = coreMeals?.lunch || day.meals?.lunch || ''
              const dinner = coreMeals?.dinner || day.meals?.dinner || ''
              // 清除續住嵌套文字，還原成原始酒店名
              let accommodation = coreAccom || day.accommodation || ''
              while (accommodation.match(/^續住\s*\((.+)\)$/)) {
                accommodation = accommodation.replace(/^續住\s*\((.+)\)$/, '$1')
              }

              const activities = coreActs || day.activities || []
              const attractions = activities
                .filter(a => a.attraction_id)
                .map(a => ({
                  id: a.attraction_id!,
                  name: a.title || '',
                  verified: verifiedMap[a.attraction_id!] ?? true,
                }))

              // route = 完整的行程文字（包含景點名稱）
              let routeText = day.title || ''
              // 過濾預設文字（這些只是 placeholder，不是真正的 route）
              const defaultTexts = ['抵達目的地', '返回台灣']
              const defaultPattern = /^第\s*\d+\s*天行程$/
              if (defaultTexts.includes(routeText) || defaultPattern.test(routeText)) {
                routeText = ''
              }

              // 核心表優先：如果該 tour 有 day_meta row，override day-level 欄位
              const route = hasNewTableRows ? (dayRow?.day_route ?? '') : routeText
              const note = hasNewTableRows
                ? dayRow?.day_note || undefined
                : day.description || undefined
              const blocks = hasNewTableRows
                ? ((dayRow?.day_blocks as DailyScheduleItem['blocks']) ?? undefined)
                : undefined
              const sameAsPrevious = hasNewTableRows
                ? (dayRow?.is_same_accommodation ?? false)
                : day.isSameAccommodation || false
              const hotelBreakfast = hasNewTableRows
                ? dayRow?.breakfast_preset === 'hotel'
                : breakfast === '飯店早餐'
              const breakfastAirline = hasNewTableRows
                ? dayRow?.breakfast_preset === 'airline'
                : false
              const lunchSelf = hasNewTableRows
                ? dayRow?.lunch_preset === 'self'
                : lunch === '敬請自理'
              const dinnerSelf = hasNewTableRows
                ? dayRow?.dinner_preset === 'self'
                : dinner === '敬請自理'
              const lunchAirline = hasNewTableRows ? dayRow?.lunch_preset === 'airline' : false
              const dinnerAirline = hasNewTableRows ? dayRow?.dinner_preset === 'airline' : false

              return {
                day: dayNum,
                route,
                meals: { breakfast, lunch, dinner },
                accommodation,
                hotelBreakfast,
                breakfastAirline,
                lunchSelf,
                dinnerSelf,
                lunchAirline,
                dinnerAirline,
                sameAsPrevious,
                attractions: attractions.length > 0 ? attractions : undefined,
                blocks,
                note,
                accommodationId: coreAccomIdByDay[dayNum] || undefined,
                mealIds: coreMealIdsByDay[dayNum] || undefined,
              }
            })
            setDailySchedule(schedule)
            setNumDays(schedule.length)
          } else {
            const days = calculateDays()
            setNumDays(days)
            setDailySchedule(initializeDailySchedule(days))
          }
        } else {
          const days = calculateDays()
          setTitle(tour.name || '')
          setNumDays(days)
          setDailySchedule(initializeDailySchedule(days))
          setOutboundFlightDate(tour.departure_date || '')
          setReturnFlightDate(tour.return_date || '')
        }
      } catch (err) {
        logger.error('載入行程表失敗', err)
      } finally {
        setLoading(false)
      }
    }

    loadItinerary()
  }, [
    tour.id,
    tour.name,
    tour.departure_date,
    tour.return_date,
    itineraries.length,
    coreItems.length,
  ])
}
