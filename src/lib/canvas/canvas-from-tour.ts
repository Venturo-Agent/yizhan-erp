/**
 * 永成款 Canvas 自動生成器
 *
 * 從現有 tour + itinerary + employee + workspace 資料、自動產出 Canvas。
 *
 * 為什麼要這層：
 * - 永成款的 Canvas JSON 結構（types.ts）跟 itineraries.daily_itinerary JSONB 不一致
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

import type {
  TourData,
  DailyItinerary,
  Activity,
  HotelInfo,
  EmployeeInfo,
  CompanyInfo,
} from '@/app/(public)/p/tour/[code]/_components/tour-types'
import { getHotelDataForDay } from './enrich-itinerary'

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
  if (hotels.length > 0) {
    sections.push({
      type: 'stays',
      data: {
        items: hotels.map((h, i) => buildStayItem(h, i)),
      },
    })
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
    theme: 'yongcheng',
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
  const layout =
    count === 0 ? 'transit' : count === 1 ? '1up' : count === 2 ? '2up' : '3up'

  // 取前 3（3up 超過 3 個會截斷）
  const take = layout === '3up' ? 3 : count
  const attractions: CanvasAttraction[] = activities.slice(0, take).map((a, i) => ({
    id: `d${dayIndex}-attr-${i}`,
    name: a.title,
    // 描述 enrich 後會有值（attractions 表的 description）、原本 daily 的 activity.description 都是空字串
    description: a.description || undefined,
    // 圖優先用 day.images[i]（enrich 把 attraction.images[0] 收集進來）
    image: images[i] ? { url: images[i] } : undefined,
  }))

  return {
    id: `d${dayIndex}-routes`,
    type: 'route_card',
    layout,
    data: {
      attractions,
    },
  }
}

function buildStayItem(hotel: HotelInfo, index: number): CanvasStayItem {
  // nights_label：根據 nights 推 Night 編號
  // 簡單版：用 index + 1 當 Night N、未來業務在 override 改
  const nightsLabel = hotel.nights && hotel.nights > 1
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
