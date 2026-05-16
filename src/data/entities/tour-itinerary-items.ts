'use client'

/**
 * Tour Itinerary Items Entity — 核心表 CRUD
 *
 * 「一 row 走到底」— 行程項目從建立到領隊回填的完整生命週期
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { TourItineraryItem } from '@/app/(main)/tours/_types/tour-itinerary-item.types'

const tourItineraryItemEntity = createEntityHook<TourItineraryItem>('tour_itinerary_items', {
  workspaceScoped: true,
  list: {
    // 2026-05-15 補 day_title / day_route / day_note / day_blocks / 餐 preset / 同住宿 flag（行程編輯器新功能）
    select:
      'id,tour_id,itinerary_id,workspace_id,day_number,sort_order,category,sub_category,title,description,service_date,service_date_end,resource_type,resource_id,resource_name,latitude,longitude,google_maps_url,unit_price,quantity,total_cost,currency,pricing_type,adult_price,child_price,infant_price,unit_price_formula,quantity_formula,adult_price_formula,child_price_formula,infant_price_formula,quote_note,quote_item_id,supplier_id,supplier_name,request_id,request_status,request_sent_at,request_reply_at,reply_content,reply_cost,estimated_cost,quoted_cost,confirmation_item_id,confirmed_cost,booking_reference,booking_status,confirmation_date,confirmation_note,actual_expense,expense_note,expense_at,receipt_images,quote_status,confirmation_status,leader_status,created_at,updated_at,created_by,show_on_web,show_on_brochure,updated_by,show_on_quote,driver_name,driver_phone,vehicle_plate,vehicle_type,booking_confirmed_at,assignee_id,assigned_at,assigned_by,handled_by,room_details,override_title,override_description,override_by,override_at,is_reserved,reserved_at,day_title,day_route,day_note,day_blocks,is_same_accommodation,breakfast_preset,lunch_preset,dinner_preset',
    orderBy: { column: 'day_number', ascending: true },
  },
  slim: {
    select:
      'id,tour_id,itinerary_id,day_number,sort_order,category,sub_category,title,service_date,quote_status,confirmation_status,leader_status,request_status',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

// Hooks
export const useTourItineraryItems = tourItineraryItemEntity.useList
const _useTourItineraryItemsSlim = tourItineraryItemEntity.useListSlim
const _useTourItineraryItem = tourItineraryItemEntity.useDetail
const _useTourItineraryItemsPaginated = tourItineraryItemEntity.usePaginated
const _useTourItineraryItemDictionary = tourItineraryItemEntity.useDictionary

// Actions
const _createTourItineraryItem = tourItineraryItemEntity.create
const _updateTourItineraryItem = tourItineraryItemEntity.update
const _deleteTourItineraryItem = tourItineraryItemEntity.delete
export const invalidateTourItineraryItems = tourItineraryItemEntity.invalidate
