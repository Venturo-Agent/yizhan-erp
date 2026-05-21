'use client'

/**
 * useItinerarySave — 行程表儲存邏輯 hook
 *
 * 從 TourItineraryTab 抽出，包含：
 * - detectAccommodationChanges：比對舊新住宿、回傳變更清單
 * - doSave：主儲存邏輯（itinerary upsert + syncToCore + day_meta）
 *
 * 此 hook 不持有任何 UI state，所有 state setter 都由呼叫方傳入。
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores'
import { createItinerary, updateItinerary } from '@/data'
import { updateTour } from '@/data/entities/tours'
import { useSyncItineraryToCore } from '@/app/(main)/tours/_hooks/useTourItineraryItems'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { DailyItinerary } from '@/components/editor/tour-form/types'
import type { Tour } from '@/stores/types'
import type { FlightInfo } from '@/types/flight.types'
import type { Database, Json } from '@/lib/supabase/types'
import type { DailyScheduleItem } from '../_components/itinerary/DayRow'
import type { AccommodationChange } from '../_components/itinerary/AccommodationChangeDialog'

const DAILY_ITINERARY_SYNC_FAILED = '每日行程表同步失敗（主存檔已完成）'
const CORE_TABLE_SYNC_FAILED = '核心表同步失敗'

interface UseItinerarySaveParams {
  tour: Tour
  title: string
  dailySchedule: DailyScheduleItem[]
  outboundFlights: FlightInfo[]
  returnFlights: FlightInfo[]
  outboundFlightDate: string
  returnFlightDate: string
  currentItineraryId: string | null
  coreItems: Array<{
    category: string | null
    day_number: number | null
    title: string | null
    resource_id?: string | null
    unit_price?: number | null
  }>
  setCurrentItineraryId: (id: string) => void
  setSaving: (v: boolean) => void
  getPreviousAccommodation: (index: number) => string
  refresh: () => void
  refreshCoreItems: () => void
}

export function useItinerarySave({
  tour,
  title,
  dailySchedule,
  outboundFlights,
  returnFlights,
  outboundFlightDate,
  returnFlightDate,
  currentItineraryId,
  coreItems,
  setCurrentItineraryId,
  setSaving,
  getPreviousAccommodation,
  refresh,
  refreshCoreItems,
}: UseItinerarySaveParams) {
  const { user: currentUser } = useAuthStore()
  const { syncToCore } = useSyncItineraryToCore()

  /**
   * 偵測住宿變更，有影響時回傳變更清單
   */
  const detectAccommodationChanges = useCallback(async (): Promise<AccommodationChange[]> => {
    const changes: AccommodationChange[] = []

    // 從核心表取得目前住宿
    const oldAccommodationByDay: Record<
      number,
      { title: string; resourceId: string | null; unitPrice: number | null }
    > = {}
    for (const item of coreItems) {
      if (item.category === 'accommodation' && item.day_number) {
        let title = item.title || ''
        // 清除續住前綴
        while (title.match(/^續住\s*[（(](.+?)[）)]$/)) {
          title = title.replace(/^續住\s*[（(](.+?)[）)]$/, '$1')
        }
        oldAccommodationByDay[item.day_number] = {
          title,
          resourceId: item.resource_id || null,
          unitPrice: item.unit_price || null,
        }
      }
    }

    // 比較新的 dailySchedule
    for (let i = 0; i < dailySchedule.length; i++) {
      const day = dailySchedule[i]
      const dayNum = i + 1
      const old = oldAccommodationByDay[dayNum]
      if (!old) continue

      let newHotel = day.accommodation || ''
      if (day.sameAsPrevious) {
        for (let j = i - 1; j >= 0; j--) {
          if (dailySchedule[j].accommodation && !dailySchedule[j].sameAsPrevious) {
            newHotel = dailySchedule[j].accommodation
            break
          }
        }
      }

      if (!newHotel || old.title === newHotel) continue

      changes.push({
        dayNumber: dayNum,
        oldHotel: old.title,
        newHotel,
        hasQuote: (old.unitPrice ?? 0) > 0,
        quotedPrice: old.unitPrice || undefined,
        hasRequest: false,
      })
    }

    return changes
  }, [coreItems, dailySchedule])

  /**
   * 主儲存：itinerary upsert → syncToCore（background）→ day_meta 回寫
   */
  const doSave = useCallback(async () => {
    setSaving(true)
    try {
      // 建立完整資料（給 syncToCore 用）
      const fullDailyItinerary = dailySchedule.map((day, idx) => {
        let dateLabel = ''
        let dateISO = ''
        if (tour.departure_date) {
          const date = new Date(tour.departure_date)
          date.setDate(date.getDate() + idx)
          const weekdays = ['日', '一', '二', '三', '四', '五', '六']
          dateLabel = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`
          dateISO = date.toISOString().split('T')[0]
        }

        const isFirst = idx === 0
        const isLast = idx === dailySchedule.length - 1
        const defaultTitle = isFirst
          ? '抵達目的地'
          : isLast
            ? '返回台灣'
            : `第${day.day} 天行程`
        const dayTitle = day.route?.trim() || defaultTitle
        const breakfast = day.hotelBreakfast ? '飯店早餐' : day.meals.breakfast
        const lunch = day.lunchSelf ? '敬請自理' : day.meals.lunch
        const dinner = day.dinnerSelf ? '敬請自理' : day.meals.dinner
        let accommodation = day.accommodation || ''
        if (day.sameAsPrevious) {
          accommodation = getPreviousAccommodation(idx) || '續住'
        }

        return {
          day: day.day,
          dayLabel: `Day ${day.day}`,
          date: dateISO || dateLabel,
          title: dayTitle,
          route: day.route || '',
          highlight: '',
          description: day.note || '',
          activities: (day.attractions || []).map(a => ({
            icon: '📍',
            title: a.name,
            description: '',
            attraction_id: a.id,
          })),
          recommendations: [],
          meals: { breakfast, lunch, dinner },
          accommodation: day.sameAsPrevious ? getPreviousAccommodation(idx) || '' : accommodation,
          isSameAccommodation: day.sameAsPrevious || false,
          images: [],
          accommodation_id: day.accommodationId || undefined,
          meal_ids: day.mealIds || undefined,
        }
      })

      // 🔧 修復：daily_itinerary 必須保留完整資料（activities, meals, accommodation）
      const displayDailyItinerary = fullDailyItinerary.map(day => ({
        day: day.day,
        dayLabel: day.dayLabel,
        date: day.date,
        title: day.title,
        route: day.route || '',
        highlight: day.highlight || '',
        description: day.description || '',
        activities: day.activities || [],
        meals: day.meals,
        accommodation: day.accommodation || '',
        images: day.images || [],
        isSameAccommodation: day.isSameAccommodation || false,
        accommodation_id: day.accommodation_id || undefined,
        meal_ids: day.meal_ids || undefined,
      }))

      const itineraryData = {
        tour_id: tour.id,
        workspace_id: currentUser?.workspace_id,
        title,
        tagline: '',
        subtitle: '',
        description: '',
        departure_date: tour.departure_date || '',
        tour_code: tour.code || '',
        cover_image: '',
        // SSOT：country/city 屬於 tours，itineraries 不保存副本
        country: '',
        city: '',
        // 5/13 W 拍板：itineraries.status 改英文 enum
        status: 'draft' as 'draft' | 'published',
        features: [],
        focus_cards: [],
        daily_itinerary: displayDailyItinerary,
        outbound_flight:
          outboundFlights.length > 0
            ? outboundFlights.map((f, i) => ({
                airline: f.airline || '',
                flightNumber: f.flightNumber || '',
                departureAirport: f.departureAirport || '',
                departureTime: f.departureTime || '',
                departureDate: f.departureDate || (i === 0 ? outboundFlightDate : '') || '',
                arrivalAirport: f.arrivalAirport || '',
                arrivalTime: f.arrivalTime || '',
                duration: '',
              }))
            : undefined,
        return_flight:
          returnFlights.length > 0
            ? returnFlights.map((f, i) => ({
                airline: f.airline || '',
                flightNumber: f.flightNumber || '',
                departureAirport: f.departureAirport || '',
                departureTime: f.departureTime || '',
                departureDate: f.departureDate || (i === 0 ? returnFlightDate : '') || '',
                arrivalAirport: f.arrivalAirport || '',
                arrivalTime: f.arrivalTime || '',
                duration: '',
              }))
            : undefined,
      }

      let savedItineraryId = currentItineraryId

      // Main save (must succeed)
      if (currentItineraryId) {
        await updateItinerary(currentItineraryId, itineraryData)
        toast.success('行程表已更新')
      } else {
        const newItinerary = await createItinerary({
          ...itineraryData,
          created_by: currentUser?.id || undefined,
        } as Parameters<typeof createItinerary>[0])
        if (newItinerary?.id) {
          savedItineraryId = newItinerary.id
          setCurrentItineraryId(newItinerary.id)
          // 回寫 tours.itinerary_id（讓需求分頁等功能能找到行程）
          await updateTour(tour.id, { itinerary_id: newItinerary.id })
          toast.success('行程表已建立')
        }
      }

      // SSOT：航班只存於 itineraries.outbound_flight / return_flight，不 dual-write
      // Background sync: 只寫核心表
      if (savedItineraryId) {
        const syncedItineraryId = savedItineraryId
        syncToCore({
          itinerary_id: syncedItineraryId,
          tour_id: tour.id,
          daily_itinerary: fullDailyItinerary as DailyItinerary[],
        })
          .then(async result => {
            if (result && 'success' in result && !result.success) {
              logger.error('syncToCore failed:', result.message)
              toast.error('核心表同步失敗，請稍後再試')
              return
            }

            // 寫 day-level metadata 到 items 的 day_meta anchor row
            // （syncToCore 會 delete-by-itinerary_id 整批清空、所以必須在它跑完後才寫）
            try {
              const workspaceId = currentUser?.workspace_id
              if (!workspaceId) throw new Error('No workspace_id')
              const sb = createSupabaseBrowserClient()
              // 1. 清掉舊的 day_meta rows
              await sb
                .from('tour_itinerary_items')
                .delete()
                .eq('tour_id', tour.id)
                .eq('category', 'day_meta')

              // 2. 重新寫一輪
              type DayMetaInsert = Database['public']['Tables']['tour_itinerary_items']['Insert']
              const dayMetaRows: DayMetaInsert[] = dailySchedule.map(day => ({
                tour_id: tour.id,
                itinerary_id: syncedItineraryId,
                workspace_id: workspaceId,
                day_number: day.day,
                sort_order: -1,
                category: 'day_meta',
                title: day.route || null,
                day_title: day.route || null,
                day_route: day.route || null,
                day_note: day.note || null,
                day_blocks: (day.blocks as Json) ?? null,
                is_same_accommodation: day.sameAsPrevious || false,
                breakfast_preset: day.hotelBreakfast ? 'hotel' : day.breakfastAirline ? 'airline' : null,
                lunch_preset: day.lunchSelf ? 'self' : day.lunchAirline ? 'airline' : null,
                dinner_preset: day.dinnerSelf ? 'self' : day.dinnerAirline ? 'airline' : null,
                created_by: currentUser?.id || undefined,
                updated_by: currentUser?.id || undefined,
              }))
              if (dayMetaRows.length > 0) {
                const { error: insertError } = await sb
                  .from('tour_itinerary_items')
                  .insert(dayMetaRows)
                if (insertError) throw insertError
              }
            } catch (err) {
              logger.error('day_meta sync failed', err)
              toast.error(DAILY_ITINERARY_SYNC_FAILED)
            }

            refreshCoreItems()

            // 顯示取消摘要（如果有）
            if (
              result &&
              'cancellations' in result &&
              result.cancellations &&
              result.cancellations.length > 0
            ) {
              const cancelList = result.cancellations
                .map((c: Record<string, unknown>) =>
                  (c.items as Record<string, unknown>[])
                    .map(
                      (i: Record<string, unknown>) =>
                        `${(i.service_date as string) || ''} ${i.title as string}`
                    )
                    .join('、')
                )
                .join('\n')

              toast.warning(
                `📋 行程變更摘要\n\n已產生 ${result.cancellations.length} 個取消通知：\n${cancelList}\n\n請前往需求單頁面發送取消通知給供應商`,
                {
                  duration: 10000,
                  style: { whiteSpace: 'pre-line', maxWidth: '600px' },
                }
              )
            }
          })
          .catch(err => {
            logger.error('syncToCore error (background):', err)
            toast.error(CORE_TABLE_SYNC_FAILED)
          })
      }

      refresh()
    } catch (error) {
      logger.error('儲存行程表失敗:', error)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }, [
    tour,
    title,
    dailySchedule,
    outboundFlights,
    returnFlights,
    outboundFlightDate,
    returnFlightDate,
    currentItineraryId,
    currentUser,
    getPreviousAccommodation,
    setCurrentItineraryId,
    setSaving,
    syncToCore,
    refresh,
    refreshCoreItems,
  ])

  return { detectAccommodationChanges, doSave }
}
