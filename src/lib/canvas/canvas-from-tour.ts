/**
 * Canvas Canvas 自動生成器
 *
 * 從現有 tour + itinerary + employee + workspace 資料、自動產出 Canvas。
 *
 * 為什麼要這層：
 * - Canvas的 Canvas JSON 結構（types.ts）跟 itineraries.daily_itinerary JSONB 不一致
 * - 業務還沒做 override（Phase 2 才能編輯）、預設用 source data 跑一份出來
 * - 之後 Phase 2 有 override 時、merge override 蓋掉 auto-generate 的欄位
 *
 * 對應規格 § 4.2「景點版型選擇邏輯」：
 *   景點 1 個 → 1up
 *   景點 2 個 → 2up
 *   景點 3+ → 3up（取前 3）
 *   景點 0 → transit（移動日、無圖）
 */

import type {
  Canvas,
  CanvasSection,
  CanvasCoverData,
  CanvasTimelineDay,
  CanvasDaySection,
  CanvasDayBlock,
  CanvasAttraction,
  CanvasStayItem,
} from '@/components/canvas-renderer/types'

import type { CanvasLeaderMeetingSection } from '@/components/canvas-renderer/types'

import type {
  TourData,
  DailyItinerary,
  Activity,
  HotelInfo,
  EmployeeInfo,
  CompanyInfo,
  LeaderInfo,
  MeetingInfo,
} from '@/app/(public)/p/tour/[code]/_components/tour-types'
import { getHotelDataForDay, type EnrichedAttractionMeta } from './enrich-itinerary'

// ============ Adapter 入口 ============

export interface CanvasFromTourInput {
  tour: TourData
  heroImage?: string | null
  employee?: EmployeeInfo | null
  companyInfo?: CompanyInfo
}

export function buildCanvasFromTour(input: CanvasFromTourInput): Canvas {
  const { tour, heroImage, employee, companyInfo } = input
  const itinerary = tour.itinerary
  const dailyItinerary = itinerary?.daily_itinerary ?? []
  const hotels = itinerary?.hotels ?? []

  const brand = {
    name: companyInfo?.name ?? '旅行社',
    english_name: undefined,
  }

  const sections: CanvasSection[] = []

  // ============ Cover ============
  sections.push({
    type: 'cover',
    data: buildCover(tour, heroImage, brand.name),
  })

  // ============ Overview Timeline ============
  if (dailyItinerary.length > 0) {
    sections.push({
      type: 'overview_timeline',
      data: {
        days: dailyItinerary.map((day, i) => buildTimelineDay(day, i)),
      },
    })
  }

  // ============ Day sections ============
  dailyItinerary.forEach((day, i) => {
    sections.push(buildDaySection(day, i))
  })

  // ============ Stays ============
  // 工單3 D2-A：舊系統 show_hotels=false → stays section 首次生成帶 hidden:true
  // （只讀一次當初值、之後 canvas 自理、不雙向同步回 show_hotels — 紅線 E）
  // TODO(工單3): show_features / show_pricing_details / show_leader_meeting / show_faqs /
  //              show_notices / show_cancellation_policy / show_price_tiers 對應 canvas 哪塊尚未拍板
  //              （規格書 §六 開放問題）→ 先不映射、待拍板再接
  if (hotels.length > 0) {
    sections.push({
      type: 'stays',
      hidden: itinerary?.show_hotels === false ? true : undefined,
      data: {
        items: hotels.map((h, i) => buildStayItem(h, i)),
      },
    })
  }

  // ============ Leader & Meeting（領隊・集合、行前資訊群）============
  // 工單2 / D3-A：獨立 section、收在 stays 之後 appendix 之前。
  // 有料才生（leader 或 meeting_info 任一有實質內容才 push）、全空不生（優雅降級、不開天窗）。
  // 工單3 D2-A：舊系統 show_leader_meeting=false → 首次生成帶 hidden:true
  //            （只讀一次當初值、之後 canvas 自理、不雙向同步回 show_leader_meeting — 紅線 E）
  const leaderMeeting = buildLeaderMeetingSection(itinerary?.leader, itinerary?.meeting_info)
  if (leaderMeeting) {
    leaderMeeting.hidden = itinerary?.show_leader_meeting === false ? true : undefined
    sections.push(leaderMeeting)
  }

  // ============ Appendix ============
  sections.push({
    type: 'appendix',
    data: {
      contact: {
        employee_name: employee?.display_name ?? undefined,
        employee_email: employee?.email ?? undefined,
        company_name: companyInfo?.name,
        company_phone: companyInfo?.phone,
      },
    },
  })

  return {
    theme: 'classic',
    brand,
    sections,
  }
}

// ============ 局部建構器 ============

function buildCover(
  tour: TourData,
  heroImage: string | null | undefined,
  brandName: string
): CanvasCoverData {
  const itinerary = tour.itinerary
  const daysCount = tour.days_count ?? itinerary?.daily_itinerary?.length ?? 0
  const departureDate = tour.departure_date

  // eyebrow：例「2026 私人包團・X 日」
  const yearMatch = departureDate?.match(/(\d{4})/)?.[1]
  const eyebrowParts: string[] = []
  if (yearMatch) eyebrowParts.push(yearMatch)
  if (daysCount > 0) eyebrowParts.push(`${daysCount} 日行程`)
  const eyebrow = eyebrowParts.length > 0 ? eyebrowParts.join(' · ') : undefined

  // title：itinerary.title fallback 到「{daysCount} 日專屬行程」
  const title = itinerary?.title ?? (daysCount > 0 ? `${daysCount} 日專屬行程。` : '專屬行程。')

  return {
    eyebrow,
    title,
    subtitle: itinerary?.subtitle ?? undefined,
    departure_date: departureDate ?? undefined,
    brand: { name: brandName },
    cover_image: heroImage ? { url: heroImage } : undefined,
  }
}

function buildTimelineDay(day: DailyItinerary, index: number): CanvasTimelineDay {
  return {
    day_index: index + 1,
    title: day.title || day.dayLabel || `Day ${index + 1}`,
    summary: day.highlight ?? day.description ?? '',
  }
}

function buildDaySection(day: DailyItinerary, index: number): CanvasDaySection {
  const dayIndex = index + 1
  const blocks: CanvasDayBlock[] = []

  // 1) Day Header
  blocks.push({
    id: `d${dayIndex}-header`,
    type: 'day_header',
    data: {
      day_index: dayIndex,
      date: day.dayLabel || `Day ${dayIndex}`,
      title: day.title || `Day ${dayIndex}`,
      summary: day.description ?? day.highlight ?? undefined,
    },
  })

  // 2) Route Card（從 activities 自動選版型）
  const activities = day.activities ?? []
  if (activities.length > 0) {
    blocks.push(buildRouteCardBlock(activities, day.images ?? [], dayIndex))
  }

  // 3) Restaurant Cards（如果有 meals）
  if (day.meals) {
    const meals = [
      { type: 'lunch' as const, name: day.meals.lunch },
      { type: 'dinner' as const, name: day.meals.dinner },
    ]
    meals.forEach((meal, mi) => {
      if (!meal.name) return
      blocks.push({
        id: `d${dayIndex}-meal-${mi}`,
        type: 'restaurant_card',
        data: {
          meal: meal.type,
          name: meal.name,
        },
      })
    })
  }

  // 4) Hotel Card（如果有 accommodation）
  // 優先用 enriched hotel data（含 image / description / highlights）
  // 沒 enrich 就 fallback 只用名字
  if (day.accommodation) {
    const hotelData = getHotelDataForDay(day)
    blocks.push({
      id: `d${dayIndex}-hotel`,
      type: 'hotel_card',
      data: {
        name: hotelData?.name || day.accommodation,
        description: hotelData?.description,
        location: hotelData?.address,
        image: hotelData?.image_url ? { url: hotelData.image_url } : undefined,
      },
    })
  }

  return {
    type: 'day',
    day_index: dayIndex,
    date: day.dayLabel || `Day ${dayIndex}`,
    blocks,
  }
}

function buildRouteCardBlock(
  activities: Activity[],
  images: string[],
  dayIndex: number
): CanvasDayBlock {
  // 規格 § 4.2：景點數 → 版型
  const count = activities.length
  const layout = count === 0 ? 'transit' : count === 1 ? '1up' : count === 2 ? '2up' : '3up'

  // 取前 3（3up 超過 3 個會截斷）
  const take = layout === '3up' ? 3 : count
  const attractions: CanvasAttraction[] = activities.slice(0, take).map((a, i) => {
    // enrich 把景點庫的料藏在 a._attraction（分類 / 亮點標籤 / 建議時長 / 圖）
    const meta = (a as Activity & { _attraction?: EnrichedAttractionMeta })._attraction
    return {
      id: `d${dayIndex}-attr-${i}`,
      name: a.title,
      // 描述 enrich 後會有值（attractions 表的 description）、原本 daily 的 activity.description 都是空字串
      description: a.description || undefined,
      // 圖優先用景點自己帶的（_attraction.image_url、精確對應）、fallback day.images[i]（舊行為相容）
      image: meta?.image_url ? { url: meta.image_url } : images[i] ? { url: images[i] } : undefined,
      // 分類 → eyebrow 標籤、「歷史文化 / History & Culture」取中文部分
      category: meta?.category ? cleanCategory(meta.category) : undefined,
      // 亮點清單 → 取景點庫 tags 前 4 個（一筆 8 個太多、卡片放不下）
      highlights: meta?.tags && meta.tags.length > 0 ? meta.tags.slice(0, 4) : undefined,
      // 建議停留 → 分鐘轉「約 X 小時 / 分鐘」
      suggested_duration:
        meta?.duration_minutes != null ? formatDuration(meta.duration_minutes) : undefined,
    }
  })

  return {
    id: `d${dayIndex}-routes`,
    type: 'route_card',
    layout,
    data: {
      attractions,
    },
  }
}

/**
 * 景點分類「歷史文化 / History & Culture」→ 取中文「歷史文化」當 eyebrow 標籤
 * 標籤要簡潔、中英全塞會太長
 */
function cleanCategory(category: string): string {
  return category.split('/')[0].trim()
}

/**
 * 建議停留分鐘數 → 業務語言（句末不收句號、依排印規範）
 * < 60 分 →「建議停留約 45 分鐘」；>= 60 →「建議停留約 2.5 小時」（整數不帶小數）
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `建議停留約 ${minutes} 分鐘`
  const hours = minutes / 60
  return Number.isInteger(hours)
    ? `建議停留約 ${hours} 小時`
    : `建議停留約 ${hours.toFixed(1)} 小時`
}

/**
 * 領隊・集合 section 生成（有料才生、全空回 null）
 *
 * 為什麼要查「值非空白」而非「物件存在」：
 * - DB 實測（2026-05-27）leader/meeting_info 大多是「有 key 但值是空字串」的空殼
 *   （譬如 {name:"", domesticPhone:"", overseasPhone:""}）
 * - 只看物件存在會把空殼也生出來、開天窗 → 必須看欄位值有沒有實質內容
 *
 * 欄位映射：itinerary.types.ts 的 camelCase（domesticPhone）→ canvas 的 snake_case（domestic_phone）
 */
function buildLeaderMeetingSection(
  leader: LeaderInfo | null | undefined,
  meetingInfo: MeetingInfo | null | undefined
): CanvasLeaderMeetingSection | null {
  const leaderName = leader?.name?.trim()
  const leaderEnglish = leader?.englishName?.trim()
  const leaderDomestic = leader?.domesticPhone?.trim()
  const leaderOverseas = leader?.overseasPhone?.trim()
  const meetingTime = meetingInfo?.time?.trim()
  const meetingLocation = meetingInfo?.location?.trim()

  const hasLeader = Boolean(leaderName || leaderEnglish || leaderDomestic || leaderOverseas)
  const hasMeeting = Boolean(meetingTime || meetingLocation)

  // 兩塊都沒料 → 不生（優雅降級、不開天窗）
  if (!hasLeader && !hasMeeting) return null

  return {
    type: 'leader_meeting',
    data: {
      leader: hasLeader
        ? {
            name: leaderName || undefined,
            english_name: leaderEnglish || undefined,
            domestic_phone: leaderDomestic || undefined,
            overseas_phone: leaderOverseas || undefined,
          }
        : undefined,
      meeting: hasMeeting
        ? {
            time: meetingTime || undefined,
            location: meetingLocation || undefined,
          }
        : undefined,
    },
  }
}

function buildStayItem(hotel: HotelInfo, index: number): CanvasStayItem {
  // nights_label：根據 nights 推 Night 編號
  // 簡單版：用 index + 1 當 Night N、未來業務在 override 改
  const nightsLabel =
    hotel.nights && hotel.nights > 1
      ? `Night ${index + 1} – ${index + hotel.nights}`
      : `Night ${index + 1}`

  return {
    id: `stay-${index}`,
    nights_label: nightsLabel,
    name: hotel.name,
    description: hotel.description,
    image: hotel.image_url ? { url: hotel.image_url } : undefined,
  }
}
