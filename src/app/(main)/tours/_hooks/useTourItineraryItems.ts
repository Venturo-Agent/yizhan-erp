'use client'

/**
 * useTourItineraryItems — 核心表操作 hook
 *
 * 提供：
 * - 根據 tour_id 取得所有核心項目
 * - 根據 itinerary_id 取得所有核心項目
 * - 同步行程編輯器的 daily_itinerary 到核心表
 *
 * 轉換函式（activityToItem / mealToItem / accommodationToItem / carryOverPricing）
 * 已拆到 itinerary-item-converters.ts。
 */

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { invalidateTourItineraryItems } from '@/data'
import type { DailyItinerary, Meals } from '@/components/editor/tour-form/types'
import type { TourItineraryItem, MealSubCategory } from '../_types/tour-itinerary-item.types'
import { MEAL_SUB_CATEGORIES } from '../_types/tour-itinerary-item.types'
import useSWR from 'swr'
import {
  activityToItem,
  mealToItem,
  accommodationToItem,
  carryOverPricing,
  resolveAccommodation,
  type OldItemPricingData,
  type TourItineraryItemInsert,
} from './itinerary-item-converters'

// === Labels ===
const SYNC_LABELS = {
  SYNC_START: 'Syncing itinerary items to core table',
  SYNC_COMPLETE: 'Core table sync complete',
  SYNC_ERROR: 'Core table sync failed',
  FETCH_ERROR: 'Failed to fetch core table items',
} as const

const ITINERARY_SELECT_FIELDS =
  'id, tour_id, day_number, sort_order, category, sub_category, title, description, resource_type, resource_name, resource_id, supplier_id, supplier_name, service_date, service_date_end, unit_price, quantity, total_cost, pricing_type, adult_price, child_price, infant_price, quote_note, estimated_cost, confirmed_cost, actual_expense, booking_status, booking_reference, booking_confirmed_at, confirmation_status, confirmation_item_id, handled_by, request_status, request_id, quote_status, quoted_cost, show_on_brochure, show_on_quote, show_on_web, workspace_id, created_at, updated_at, latitude, longitude, google_maps_url, day_title, day_route, day_note, day_blocks, is_same_accommodation, breakfast_preset, lunch_preset, dinner_preset'

/** 批次查詢景點描述並 merge 進 items */
async function mergeAttractionData(
  data: Array<{ resource_type: string | null; resource_id: string | null; description: string | null; [key: string]: unknown }>
): Promise<TourItineraryItem[]> {
  const attractionIds = data
    .filter(item => item.resource_type === 'attraction' && item.resource_id)
    .map(item => item.resource_id as string)

  const attractionMap = new Map<string, { description?: string; image?: string }>()
  if (attractionIds.length > 0) {
    const { data: attractions } = await supabase
      .from('attractions')
      .select('id, description, images')
      .in('id', attractionIds)

    if (attractions) {
      for (const attr of attractions) {
        attractionMap.set(attr.id, {
          description: attr.description || undefined,
          image: attr.images?.[0] || undefined,
        })
      }
    }
  }

  return data.map(item => {
    const attr = item.resource_id ? attractionMap.get(item.resource_id) : null
    return {
      ...item,
      description: item.description || attr?.description || null,
    }
  }) as TourItineraryItem[]
}

// === 根據 tour_id 取得核心項目 ===
export function useTourItineraryItemsByTour(tour_id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tour_id ? `tour_itinerary_items:tour:${tour_id}` : null,
    async () => {
      if (!tour_id) return []
      const { data, error } = await supabase
        .from('tour_itinerary_items')
        .select(ITINERARY_SELECT_FIELDS)
        .eq('tour_id', tour_id)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })
        .limit(500)
      if (error) throw error
      return mergeAttractionData(data || [])
    }
  )

  return {
    items: data ?? [],
    error,
    loading: isLoading,
    refresh: mutate,
  }
}

// === 根據 itinerary_id 取得核心項目 ===
export function useTourItineraryItemsByItinerary(itinerary_id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    itinerary_id ? `tour_itinerary_items:itinerary:${itinerary_id}` : null,
    async () => {
      if (!itinerary_id) return []
      const { data, error } = await supabase
        .from('tour_itinerary_items')
        .select(ITINERARY_SELECT_FIELDS)
        .eq('itinerary_id', itinerary_id)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })
        .limit(500)
      if (error) throw error
      return mergeAttractionData(data || [])
    }
  )

  return {
    items: data ?? [],
    error,
    loading: isLoading,
    refresh: mutate,
  }
}

// === 同步 hook ===
export function useSyncItineraryToCore() {
  const { user } = useAuthStore()

  /**
   * 將 daily_itinerary 同步到核心表
   *
   * 策略：delete-then-insert（因為行程項目沒有穩定 ID）
   * 未來可改為 upsert（當 activity 有 itinerary_item_id 時）
   */
  const syncToCore = useCallback(
    async (params: {
      itinerary_id: string
      tour_id: string | null
      daily_itinerary: DailyItinerary[]
    }) => {
      const { itinerary_id, tour_id, daily_itinerary } = params
      const workspace_id = user?.workspace_id
      if (!workspace_id) {
        logger.warn(SYNC_LABELS.SYNC_ERROR, 'No workspace_id')
        return { success: false, message: 'No workspace_id' }
      }

      logger.log(SYNC_LABELS.SYNC_START, { itinerary_id, tour_id, days: daily_itinerary.length })

      try {
        // 1. 取得所有舊項目（檢查需求單狀態 + 報價欄位）
        const { data: old_items, error: fetch_error } = await supabase
          .from('tour_itinerary_items')
          .select(
            'id,title,category,request_id,supplier_name,service_date,resource_id,unit_price,quantity,total_cost,quote_status,quote_note,pricing_type,adult_price,child_price,infant_price,estimated_cost,quoted_cost,sub_category,show_on_quote,day_number'
          )
          .eq('itinerary_id', itinerary_id)

        if (fetch_error) throw fetch_error

        // 2. 建立新項目的指紋集合（用於比對是否「還存在」）
        const newItemFingerprints = new Set<string>()

        for (let day_index = 0; day_index < daily_itinerary.length; day_index++) {
          const day = daily_itinerary[day_index]

          if (day.activities) {
            for (const activity of day.activities) {
              newItemFingerprints.add(`activities:${activity.id}`)
            }
          }

          if (day.accommodation) {
            newItemFingerprints.add(`accommodation:${day.accommodation}`)
          }

          if (day.meals) {
            const mealTypes: Array<'breakfast' | 'lunch' | 'dinner'> = [
              'breakfast',
              'lunch',
              'dinner',
            ]
            for (const mealType of mealTypes) {
              const meal = day.meals[mealType]
              if (meal && typeof meal === 'string' && meal.trim()) {
                newItemFingerprints.add(`meal:${meal.trim()}`)
              }
            }
          }
        }

        // 3. 分類舊項目：刪除 vs 修改
        const deletedItems: typeof old_items = []
        const modifiedRequestIds = new Set<string>()
        const oldPricingByDayCategory = new Map<string, OldItemPricingData>()

        if (old_items) {
          for (const oldItem of old_items) {
            if (oldItem.category === 'accommodation' && oldItem.day_number) {
              oldPricingByDayCategory.set(`accommodation:${oldItem.day_number}`, oldItem)
            }
            if (oldItem.category === 'meals' && oldItem.day_number && oldItem.sub_category) {
              oldPricingByDayCategory.set(
                `meals:${oldItem.day_number}:${oldItem.sub_category}`,
                oldItem
              )
            }

            let fingerprint = ''
            if (oldItem.category === 'activities' && oldItem.resource_id) {
              fingerprint = `activities:${oldItem.resource_id}`
            } else if (oldItem.category === 'accommodation') {
              fingerprint = `accommodation:${oldItem.title}`
            } else if (oldItem.category === 'meals') {
              fingerprint = `meal:${oldItem.title}`
            }

            if (!newItemFingerprints.has(fingerprint)) {
              deletedItems.push(oldItem)
            } else if (oldItem.request_id) {
              modifiedRequestIds.add(oldItem.request_id)
            }
          }
        }

        // 4. 處理刪除項目（產生取消單資訊）
        const cancellationsByRequestId = new Map<
          string,
          {
            request_id: string
            supplier_name: string
            category: string
            items: Array<{ title: string; service_date: string | null }>
          }
        >()

        for (const item of deletedItems) {
          if (!item.request_id) continue
          if (!cancellationsByRequestId.has(item.request_id)) {
            cancellationsByRequestId.set(item.request_id, {
              request_id: item.request_id,
              supplier_name: item.supplier_name || '',
              category: item.category || '',
              items: [],
            })
          }
          const group = cancellationsByRequestId.get(item.request_id)!
          group.items.push({ title: item.title || '', service_date: item.service_date })
        }

        // 5. 刪除所有舊的行程項目（行程是 SSOT、不保護下游資料）
        const { error: delete_error } = await supabase
          .from('tour_itinerary_items')
          .delete()
          .eq('itinerary_id', itinerary_id)

        if (delete_error) throw delete_error

        // 6. 建立新的行程項目
        const new_items: TourItineraryItemInsert[] = []

        for (let day_index = 0; day_index < daily_itinerary.length; day_index++) {
          const day = daily_itinerary[day_index]
          const day_number = day_index + 1
          const service_date = day.date && /^\d{4}-\d{2}-\d{2}/.test(day.date) ? day.date : null
          let sort = 0

          // Activities（從景點資料庫）
          if (day.activities && day.activities.length > 0) {
            for (const activity of day.activities) {
              const newItem = activityToItem(
                activity,
                day_number,
                sort,
                service_date,
                itinerary_id,
                tour_id,
                workspace_id
              )
              new_items.push(newItem)
              sort++
            }
          }

          // Meals
          if (day.meals) {
            const meals = day.meals as Meals
            const mealIds = (day as unknown as Record<string, unknown>).meal_ids as
              | { breakfast?: string; lunch?: string; dinner?: string }
              | undefined
            const meal_entries: [string, MealSubCategory, string | undefined][] = [
              [meals.breakfast, MEAL_SUB_CATEGORIES.BREAKFAST, mealIds?.breakfast],
              [meals.lunch, MEAL_SUB_CATEGORIES.LUNCH, mealIds?.lunch],
              [meals.dinner, MEAL_SUB_CATEGORIES.DINNER, mealIds?.dinner],
            ]
            for (const [meal_name, sub_cat, meal_resource_id] of meal_entries) {
              const item = mealToItem(
                meal_name,
                sub_cat,
                day_number,
                sort,
                service_date,
                itinerary_id,
                tour_id,
                workspace_id,
                meal_resource_id
              )
              if (item) {
                const oldItem = oldPricingByDayCategory.get(`meals:${day_number}:${sub_cat}`)
                if (oldItem) {
                  carryOverPricing(item, oldItem, meal_name.trim())
                }
                new_items.push(item)
              }
              sort++
            }
          }

          // Accommodation — 續住時解析完整飯店名稱
          if (day.accommodation) {
            // day.accommodation is truthy at this point (checked above)
          const dayWithAccommodation = { ...day, accommodation: day.accommodation! }
          const { name: resolvedName, resource_id: resolvedId } = resolveAccommodation(
              dayWithAccommodation,
              day,
              day_index,
              daily_itinerary
            )

            const item = accommodationToItem(
              resolvedName,
              day_number,
              sort,
              service_date,
              itinerary_id,
              tour_id,
              workspace_id,
              resolvedId
            )

            if (item) {
              const oldItem = oldPricingByDayCategory.get(`accommodation:${day_number}`)
              if (oldItem) {
                carryOverPricing(item, oldItem, resolvedName)
              }
              new_items.push(item)
            }
            sort++
          }
        }

        // 7. 批次插入新項目
        if (new_items.length > 0) {
          const { error: insert_error } = await supabase
            .from('tour_itinerary_items')
            .insert(new_items)

          if (insert_error) throw insert_error
        }

        await invalidateTourItineraryItems()
        logger.log(SYNC_LABELS.SYNC_COMPLETE, {
          deleted: '所有舊項目（行程是 SSOT）',
          inserted: new_items.length,
        })

        return {
          success: true,
          inserted: new_items.length,
          cancellations: Array.from(cancellationsByRequestId.values()),
        }
      } catch (error) {
        logger.error(SYNC_LABELS.SYNC_ERROR, error)
        return { success: false, message: String(error) }
      }
    },
    [user?.workspace_id]
  )

  return { syncToCore }
}
