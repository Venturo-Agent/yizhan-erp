/**
 * 行程資料豐富化（enrich）— 把 daily_itinerary 內的 reference 換成完整資料
 *
 * 為什麼要這層：
 * - 旅遊團的 daily_itinerary JSONB 只存 reference id（attraction_id / accommodation_id）
 *   原始 activity object：{ icon, title, description: '', attraction_id }
 *   原始 daily：{ accommodation: '飯店名', accommodation_id: 'uuid' }
 * - 真正的描述 / 圖片 / 亮點都在 attractions / hotels 表
 * - 沒這層補完、Canvas渲染出來會「只有標題、沒圖沒描述」（5/17 William 抓 bug）
 *
 * 設計：
 * - 收集所有 attraction_id / accommodation_id 一次查（避免 N+1）
 * - 回傳 enrich 後的 daily_itinerary 結構（跟原 type 相容）
 * - 找不到對應 row 不算錯、保留原本 activity 資訊（fallback）
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DailyItinerary, Activity } from '@/app/(public)/p/tour/[code]/_components/tour-types'

interface AttractionRow {
  id: string
  name: string | null
  description: string | null
  images: string[] | null
  category: string | null
  address: string | null
  tags: string[] | null
  duration_minutes: number | null
}

interface HotelRow {
  id: string
  name: string | null
  description: string | null
  images: string[] | null
  category: string | null
  address: string | null
  highlights: string[] | null
}

interface ActivityRaw extends Activity {
  // 原始 daily_itinerary 內的 activity 還可能有這些欄位、超過 Activity type、用 raw 接住
  attraction_id?: string
}

interface DailyRaw extends DailyItinerary {
  // 原始 daily_itinerary 還可能有 accommodation_id / day / route 等欄位
  accommodation_id?: string
  activities?: ActivityRaw[]
}

/**
 * 收集所有 daily_itinerary 內出現過的 attraction_id / accommodation_id
 */
function collectReferenceIds(daily: DailyRaw[]): {
  attractionIds: string[]
  hotelIds: string[]
} {
  const attractionIds = new Set<string>()
  const hotelIds = new Set<string>()

  for (const day of daily) {
    if (Array.isArray(day.activities)) {
      for (const a of day.activities) {
        if (a.attraction_id) attractionIds.add(a.attraction_id)
      }
    }
    if (day.accommodation_id) hotelIds.add(day.accommodation_id)
  }

  return {
    attractionIds: Array.from(attractionIds),
    hotelIds: Array.from(hotelIds),
  }
}

/**
 * Enrich 主入口
 *
 * 把 daily_itinerary 內每個 activity 的 description / images / category 從 attractions 補進來、
 * 把 hotel 描述 / images / highlights 從 hotels 補進來。
 */
export async function enrichDailyItinerary(
  supabase: SupabaseClient,
  daily: DailyItinerary[] | null | undefined
): Promise<DailyItinerary[]> {
  if (!daily || daily.length === 0) return []

  const rawDaily = daily as DailyRaw[]
  const { attractionIds, hotelIds } = collectReferenceIds(rawDaily)

  // 並行查兩張表
  const [attractionsRes, hotelsRes] = await Promise.all([
    attractionIds.length > 0
      ? supabase
          .from('attractions')
          .select('id, name, description, images, category, address, tags, duration_minutes')
          .in('id', attractionIds)
      : Promise.resolve({ data: [] as AttractionRow[], error: null }),
    hotelIds.length > 0
      ? supabase
          .from('hotels')
          .select('id, name, description, images, category, address, highlights')
          .in('id', hotelIds)
      : Promise.resolve({ data: [] as HotelRow[], error: null }),
  ])

  // 建 lookup map（id → row）
  const attractionMap = new Map<string, AttractionRow>()
  for (const a of (attractionsRes.data ?? []) as AttractionRow[]) {
    attractionMap.set(a.id, a)
  }
  const hotelMap = new Map<string, HotelRow>()
  for (const h of (hotelsRes.data ?? []) as HotelRow[]) {
    hotelMap.set(h.id, h)
  }

  // 走訪每一天、把 reference 換成完整資料
  // 注意：不動原本 activity.title（業務可能在 daily_itinerary 改過顯示名）
  return rawDaily.map(day => {
    const enrichedActivities: ActivityRaw[] | undefined = Array.isArray(day.activities)
      ? day.activities.map(a => {
          if (!a.attraction_id) return a
          const att = attractionMap.get(a.attraction_id)
          if (!att) return a
          // 用 attraction 表的內容補空 / fallback
          // _attraction：把景點庫的分類 / 亮點標籤 / 建議時長 / 自己的圖一起帶下去
          // 給 adapter 拼景點卡用（underscore 前綴避免跟 source schema 欄位衝突、跟 _hotelData 同模式）
          // 圖跟著 activity 走、不靠 day.images 位置對應、避免「沒圖的被 filter 掉害後面錯位」
          return {
            ...a,
            title: a.title || att.name || '',
            description: a.description || att.description || '',
            _attraction: {
              category: att.category ?? undefined,
              tags: att.tags ?? undefined,
              duration_minutes: att.duration_minutes ?? undefined,
              image_url: att.images?.[0] ?? undefined,
            },
          }
        })
      : (day.activities ?? [])

    // 從 activities 收集圖片：每個 activity 的第一張圖
    // 沒圖的 activity 留空、auto-generate adapter 會處理（前 N 張塞進 daily.images 對應 layout）
    const collectedImages: string[] = enrichedActivities
      ? enrichedActivities
          .map(a => {
            if (!a.attraction_id) return ''
            const att = attractionMap.get(a.attraction_id)
            return att?.images?.[0] ?? ''
          })
          .filter((url): url is string => Boolean(url))
      : []

    // 飯店補完
    let accommodation = day.accommodation
    const hotelData = day.accommodation_id ? hotelMap.get(day.accommodation_id) : undefined
    if (hotelData) {
      accommodation = accommodation || hotelData.name || ''
    }

    // 飯店完整資料塞進 day._hotelData、adapter 可以拿來生 hotel card
    // 用 underscore 前綴避免跟 source data 欄位衝突
    return {
      ...day,
      activities: enrichedActivities,
      images: day.images && day.images.length > 0 ? day.images : collectedImages,
      accommodation,
      _hotelData: hotelData
        ? {
            name: hotelData.name ?? '',
            description: hotelData.description ?? undefined,
            image_url: hotelData.images?.[0],
            highlights: hotelData.highlights ?? undefined,
            address: hotelData.address ?? undefined,
            category: hotelData.category ?? undefined,
          }
        : undefined,
    } as DailyItinerary
  })
}

/**
 * 從 enriched daily 取出每天的飯店資料（給 adapter 拼 hotel card 用）
 *
 * 用法：
 *   const enriched = await enrichDailyItinerary(supabase, daily)
 *   const hotelData = getHotelDataForDay(enriched[0])  // 拿 Day 1 的飯店完整資訊
 */
/**
 * Enrich 後從景點庫帶下來的景點 meta（給 adapter 拼景點卡）
 * 藏在 activity._attraction、由 buildRouteCardBlock 取出接進 CanvasAttraction
 */
export interface EnrichedAttractionMeta {
  category?: string
  tags?: string[]
  duration_minutes?: number
  image_url?: string
}

export interface EnrichedHotelData {
  name: string
  description?: string
  image_url?: string
  highlights?: string[]
  address?: string
  category?: string
}

export function getHotelDataForDay(day: DailyItinerary): EnrichedHotelData | null {
  const withExtra = day as DailyItinerary & { _hotelData?: EnrichedHotelData }
  return withExtra._hotelData ?? null
}

/**
 * 取得單一天指定 accommodation 的完整 hotel 資料（畫面要顯示星級 / 描述 / 圖時用）
 *
 * 為什麼獨立：
 * - daily_itinerary 內 accommodation_id 是 reference
 * - CanvasHotelCard 需要 name + description + image
 * - 這個 helper 給 adapter 用、把 enriched daily 內藏的 hotel reference 抽出來
 */
export async function fetchHotelsByIds(
  supabase: SupabaseClient,
  hotelIds: string[]
): Promise<Map<string, HotelRow>> {
  const map = new Map<string, HotelRow>()
  if (hotelIds.length === 0) return map

  const { data } = await supabase
    .from('hotels')
    .select('id, name, description, images, category, address, highlights')
    .in('id', hotelIds)

  for (const h of (data ?? []) as HotelRow[]) {
    map.set(h.id, h)
  }
  return map
}
