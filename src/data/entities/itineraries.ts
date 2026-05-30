'use client'

/**
 * Itineraries Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Itinerary } from '@/stores/types'

const itineraryEntity = createEntityHook<Itinerary>('itineraries', {
  workspaceScoped: true, // 2026-05-29 B11：從 WORKSPACE_SCOPED_TABLES fallback 名單搬進顯式宣告
  list: {
    // 註：移除已廢棄的 city / country / erp_itinerary_id（Online 已暫停）欄位
    // 2026-05-15 補 country / city / price_note / price_tiers / template_* / hidden_items_*（行程模板系統）
    select:
      'id,code,title,subtitle,tagline,tour_id,tour_code,duration_days,departure_date,status,is_template,is_latest,author_name,parent_id,version,leader,cover_style,flight_style,itinerary_style,hotel_style,leader_style,features_style,pricing_style,show_features,show_hotels,show_leader_meeting,show_notices,show_price_tiers,show_pricing_details,show_faqs,show_cancellation_policy,archived_at,closed_at,workspace_id,created_at,created_by,updated_at,updated_by,daily_itinerary,outbound_flight,return_flight,cover_image,description,features,focus_cards,meeting_info,hotels,itinerary_subtitle,version_records,faqs,notices,cancellation_policy,country,city,price_note,price_tiers,cover_template_id,daily_template_id,flight_template_id,template_id,template_code,template_name,hidden_items_for_web,hidden_items_for_brochure',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,tour_id,title,duration_days',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useItineraries = itineraryEntity.useList
const _useItinerariesSlim = itineraryEntity.useListSlim
const _useItinerary = itineraryEntity.useDetail
const _useItinerariesPaginated = itineraryEntity.usePaginated
const _useItineraryDictionary = itineraryEntity.useDictionary

export const createItinerary = itineraryEntity.create
export const updateItinerary = itineraryEntity.update
const _deleteItinerary = itineraryEntity.delete
export const invalidateItineraries = itineraryEntity.invalidate
