// src/hooks/useListSlim.ts
// 瘦身版列表 hooks：只 select 列表頁需要的欄位，減少 payload

import { createCloudHook } from './createCloudHook'
import type { Tour, Order, Quote, Itinerary } from '@/stores/types'

// ============================================
// Orders 列表瘦身版
// ============================================

// /orders 列表頁實際用到的欄位
// A1（5/13 拍板）：砍 orders.code、order_number 為 SSOT
const ORDERS_LIST_FIELDS = [
  'id',
  'order_number',
  'tour_id',
  'tour_name',
  'contact_person',
  'sales_person',
  'assistant',
  'payment_status',
  'total_amount',
  'paid_amount', // TourOverviewTab 用於計算收款率
  'remaining_amount',
  'member_count',
  'created_at',
].join(',')

/**
 * 瘦身版 Orders hook - 只抓列表需要的欄位
 * payload 從 select('*') 的 ~30 欄位縮減到 12 欄位
 */
export const useOrdersListSlim = createCloudHook<Order>('orders', {
  select: ORDERS_LIST_FIELDS,
  orderBy: { column: 'created_at', ascending: false },
})

// ============================================
// Tours 列表瘦身版
// ============================================

// /orders 列表頁實際用到的 tours 欄位
const TOURS_LIST_FIELDS = [
  'id',
  'code',
  'name',
  'departure_date',
  'selling_price_per_person', // 🆕 價格鏈：建立訂單時需要
].join(',')

/**
 * 瘦身版 Tours hook - 只抓列表需要的欄位
 * payload 從 select('*') 的 ~40 欄位縮減到 4 欄位
 */
export const useToursListSlim = createCloudHook<Tour>('tours', {
  select: TOURS_LIST_FIELDS,
  orderBy: { column: 'departure_date', ascending: false },
})

// ============================================
// Quotes 列表瘦身版（用於 /tours 連結報價）
// ============================================

const QUOTES_LIST_FIELDS = ['id', 'tour_id', 'name', 'total_cost', 'group_size'].join(',')

/**
 * 瘦身版 Quotes hook - 只抓連結功能需要的欄位
 */
export const useQuotesListSlim = createCloudHook<Quote>('quotes', {
  select: QUOTES_LIST_FIELDS,
  orderBy: { column: 'created_at', ascending: false },
})

// ============================================
// Itineraries 列表瘦身版（用於 /tours 連結行程）
// ============================================

const ITINERARIES_LIST_FIELDS = ['id', 'tour_id'].join(',')

/**
 * 瘦身版 Itineraries hook - 只抓連結功能需要的欄位
 */
const _useItinerariesListSlim = createCloudHook<Itinerary>('itineraries', {
  select: ITINERARIES_LIST_FIELDS,
  orderBy: { column: 'created_at', ascending: false },
})

