/**
 * itinerary-item-converters.ts
 *
 * 行程編輯器 → 核心表 row 的轉換函式，以及報價資料保留（carryOverPricing）輔助。
 * 從 useTourItineraryItems.ts 拆出，方便獨立測試。
 */

import type { Activity, Meals } from '@/components/editor/tour-form/types'
import type { MealSubCategory } from '../_types/tour-itinerary-item.types'
import { ITINERARY_ITEM_CATEGORIES, MEAL_SUB_CATEGORIES } from '../_types/tour-itinerary-item.types'
import type { Database } from '@/lib/supabase/types'

export type TourItineraryItemInsert = Database['public']['Tables']['tour_itinerary_items']['Insert']

// === Activity → 核心表 row 轉換 ===
export function activityToItem(
  activity: Activity,
  day_number: number,
  sort_order: number,
  service_date: string | null,
  itinerary_id: string,
  tour_id: string | null,
  workspace_id: string
): TourItineraryItemInsert {
  return {
    itinerary_id,
    tour_id,
    workspace_id,
    day_number,
    sort_order,
    category: ITINERARY_ITEM_CATEGORIES.ACTIVITIES,
    title: activity.title || null,
    description: activity.description || null,
    service_date: service_date || null,
    resource_type: activity.attraction_id ? 'attraction' : null,
    resource_id: activity.attraction_id || null,
  }
}

// === Meal → 核心表 row 轉換 ===
export function mealToItem(
  meal_name: string,
  sub_category: MealSubCategory,
  day_number: number,
  sort_order: number,
  service_date: string | null,
  itinerary_id: string,
  tour_id: string | null,
  workspace_id: string,
  resource_id?: string
): TourItineraryItemInsert | null {
  if (!meal_name || meal_name.trim() === '') return null
  return {
    itinerary_id,
    tour_id,
    workspace_id,
    day_number,
    sort_order,
    category: ITINERARY_ITEM_CATEGORIES.MEALS,
    sub_category,
    title: meal_name,
    service_date: service_date || null,
    resource_type: resource_id ? 'restaurant' : null,
    resource_id: resource_id || null,
  }
}

// === Accommodation → 核心表 row 轉換 ===
export function accommodationToItem(
  accommodation: string,
  day_number: number,
  sort_order: number,
  service_date: string | null,
  itinerary_id: string,
  tour_id: string | null,
  workspace_id: string,
  resource_id?: string
): TourItineraryItemInsert | null {
  if (!accommodation || accommodation.trim() === '') return null
  return {
    itinerary_id,
    tour_id,
    workspace_id,
    day_number,
    sort_order,
    category: ITINERARY_ITEM_CATEGORIES.ACCOMMODATION,
    title: accommodation,
    resource_name: accommodation,
    service_date: service_date || null,
    resource_type: resource_id ? 'hotel' : null,
    resource_id: resource_id || null,
  }
}

/** 舊項目報價資料的最小型別（從 select 回傳的欄位） */
export type OldItemPricingData = {
  id: string
  title: string | null
  category: string | null
  request_id: string | null
  supplier_name: string | null
  service_date: string | null
  resource_id: string | null
  unit_price: number | null
  quantity: number | null
  total_cost: number | null
  quote_status: string | null
  quote_note: string | null
  pricing_type: string | null
  adult_price: number | null
  child_price: number | null
  infant_price: number | null
  estimated_cost: number | null
  quoted_cost: number | null
  sub_category: string | null
  show_on_quote: boolean | null
  day_number: number | null
}

/** 將舊報價欄位複製到新項目（價格永遠保留） */
export function carryOverPricing(
  newItem: TourItineraryItemInsert,
  oldItem: OldItemPricingData,
  newTitle: string
): void {
  newItem.unit_price = oldItem.unit_price
  newItem.quantity = oldItem.quantity
  newItem.total_cost = oldItem.total_cost
  newItem.quote_status = oldItem.quote_status
  newItem.pricing_type = oldItem.pricing_type
  newItem.adult_price = oldItem.adult_price
  newItem.child_price = oldItem.child_price
  newItem.infant_price = oldItem.infant_price
  newItem.estimated_cost = oldItem.estimated_cost
  newItem.quoted_cost = oldItem.quoted_cost
  newItem.sub_category = oldItem.sub_category || newItem.sub_category
  newItem.show_on_quote = oldItem.show_on_quote

  // 名稱有變 → 加備註提醒（但價格保留）
  if (oldItem.title && oldItem.title !== newTitle) {
    newItem.quote_note = `⚠️ 行程變更：原為「${oldItem.title}」，價格已保留，請確認是否需要調整`
  } else {
    // 名稱沒變 → 保留原本的備註
    newItem.quote_note = oldItem.quote_note
  }
}

/** 解析「續住 / 同上」住宿名稱，回傳實際飯店名稱與 resource_id */
export function resolveAccommodation(
  day: { accommodation: string; isSameAccommodation?: boolean },
  dayUnknown: unknown,
  day_index: number,
  daily_itinerary: Array<{ accommodation?: string }>
): { name: string; resource_id: string | undefined } {
  let resolvedAccommodation = day.accommodation
  // accommodation_id 是執行期動態欄位（不在 DailyItinerary 型別、從 unknown 取）
  let resolvedAccommodationId = (dayUnknown as Record<string, unknown>).accommodation_id as
    | string
    | undefined

  if (
    day.isSameAccommodation ||
    resolvedAccommodation.startsWith('續住') ||
    resolvedAccommodation.startsWith('同上')
  ) {
    const match = resolvedAccommodation.match(/(?:續住|同上)\s*[（(](.+?)[）)]/)
    if (match) {
      resolvedAccommodation = match[1]
    }

    if (day_index > 0) {
      for (let prev = day_index - 1; prev >= 0; prev--) {
        const prevDay = daily_itinerary[prev]
        const prevDayUnknown = prevDay as unknown as Record<string, unknown>
        const prevAcc = prevDay.accommodation
        if (prevAcc && !prevAcc.startsWith('續住') && !prevAcc.startsWith('同上')) {
          if (!match) resolvedAccommodation = prevAcc
          if (!resolvedAccommodationId) {
            resolvedAccommodationId = prevDayUnknown.accommodation_id as string | undefined
          }
          break
        }
      }
    }
  }

  return { name: resolvedAccommodation, resource_id: resolvedAccommodationId }
}

export { MEAL_SUB_CATEGORIES }
export type { Meals }
