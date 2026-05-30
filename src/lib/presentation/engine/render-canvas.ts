/**
 * render-canvas.ts
 * Canvas → PPTX 翻譯引擎
 *
 * 職責：
 * 1. 解析 Canvas 結構
 * 2. 根據 filter-blocks.ts 過濾內容
 * 3. 計算每個 section/block 的渲染優先級
 * 4. 輸出「渲染意圖清單」給模板層
 */

import type {
  Canvas,
  CanvasSection,
  CanvasDaySection,
  CanvasCoverSection,
  CanvasOverviewTimelineSection,
  CanvasStaysSection,
  CanvasLeaderMeetingSection,
  CanvasAppendixSection,
  CanvasDayBlock,
  CanvasRouteCardBlock,
  CanvasSequenceStepsBlock,
  CanvasHotelCardBlock,
  CanvasRestaurantCardBlock,
  CanvasSpotlightBlock,
  CanvasAttraction,
} from '@/components/canvas-renderer/types'

import {
  filterRouteCard,
  filterSequenceSteps,
  filterHotel,
  filterRestaurant,
  filterSpotlight,
  type FilteredRouteCard,
  type FilteredSequenceSteps,
  type FilteredHotel,
  type FilteredRestaurant,
  type FilteredSpotlight,
} from './filter-blocks'

// ============================================
// 產出資料結構（渲染意圖清單）
// ============================================

/** 封面頁資料 */
export interface RenderCover {
  type: 'cover'
  eyebrow?: string
  title: string
  subtitle?: string
  destination?: string
  coverImageUrl?: string
  departureDate?: string
  brandName?: string
  brandLogoUrl?: string
}

/** 行程總覽（時間軸）頁資料 */
export interface RenderTimeline {
  type: 'timeline'
  days: Array<{
    dayIndex: number
    title: string
    summary?: string
  }>
}

/** 每日行程 section */
export interface RenderDaySection {
  type: 'day'
  dayIndex: number
  date: string
  title: string
  summary?: string
  /** 過濾後的景點 */
  routeCard?: FilteredRouteCard
  /** 過濾後的時間軸步驟（用戶有加才會有） */
  sequenceSteps?: FilteredSequenceSteps
  /** 過濾後的餐廳 */
  restaurants: FilteredRestaurant[]
  /** 過濾後的飯店 */
  hotel?: FilteredHotel
  /** 過濾後的亮點 */
  spotlights: FilteredSpotlight[]
}

/** 住宿總覽 section */
export interface RenderStays {
  type: 'stays'
  items: Array<{
    id: string
    nightsLabel: string
    name: string
    imageUrl?: string
    description?: string
  }>
}

/** 領隊・集合資訊 */
export interface RenderLeaderMeeting {
  type: 'leader_meeting'
  leader?: {
    name?: string
    phone?: string
  }
  meeting?: {
    time?: string
    location?: string
  }
}

/** 附錄（費用說明） */
export interface RenderAppendix {
  type: 'appendix'
  inclusions: string[]
  exclusions: string[]
  notices: string[]
  contact?: {
    employeeName?: string
    employeePhone?: string
    employeeEmail?: string
    companyName?: string
    companyPhone?: string
  }
}

/** 所有渲染資料的聯集 */
export type RenderIntent =
  | RenderCover
  | RenderTimeline
  | RenderDaySection
  | RenderStays
  | RenderLeaderMeeting
  | RenderAppendix

// ============================================
// 主解析函式
// ============================================

/**
 * 將 Canvas JSON 翻譯成渲染意圖清單
 *
 * 使用方式：
 * ```ts
 * const canvas = loadCanvasFromDB(tourId)
 * const intents = parseCanvasToRenderIntents(canvas)
 * const pptx = renderTemplate('playful', intents)
 * ```
 */
export function parseCanvasToRenderIntents(canvas: Canvas): RenderIntent[] {
  const intents: RenderIntent[] = []

  for (const section of canvas.sections) {
    if (section.hidden) continue

    switch (section.type) {
      case 'cover':
        intents.push(parseCoverSection(section))
        break
      case 'overview_timeline':
        intents.push(parseOverviewTimeline(section))
        break
      case 'day':
        intents.push(parseDaySection(section))
        break
      case 'stays':
        intents.push(parseStaysSection(section))
        break
      case 'leader_meeting':
        intents.push(parseLeaderMeeting(section))
        break
      case 'appendix':
        intents.push(parseAppendix(section))
        break
    }
  }

  return intents
}

// ============================================
// 各 section 解析
// ============================================

function parseCoverSection(section: CanvasCoverSection): RenderCover {
  const { data } = section
  return {
    type: 'cover',
    eyebrow: data.eyebrow,
    title: data.title,
    subtitle: data.subtitle,
    destination: data.destination,
    coverImageUrl: data.cover_image?.url,
    departureDate: data.departure_date,
    brandName: data.brand?.name,
    brandLogoUrl: data.brand?.logo_url,
  }
}

function parseOverviewTimeline(section: CanvasOverviewTimelineSection): RenderTimeline {
  return {
    type: 'timeline',
    days: section.data.days.map(d => ({
      dayIndex: d.day_index,
      title: d.title,
      summary: d.summary,
    })),
  }
}

function parseDaySection(section: CanvasDaySection): RenderDaySection {
  const blocks = section.blocks.filter(b => !b.hidden)

  // 過濾各類 block
  let routeCard: FilteredRouteCard | undefined
  let sequenceSteps: FilteredSequenceSteps | undefined
  const restaurants: FilteredRestaurant[] = []
  let hotel: FilteredHotel | undefined
  const spotlights: FilteredSpotlight[] = []

  for (const block of blocks) {
    switch (block.type) {
      case 'route_card': {
        const filtered = filterRouteCard(block)
        if (filtered.worthShowing) {
          routeCard = filtered
        }
        break
      }
      case 'sequence_steps': {
        const filtered = filterSequenceSteps(block)
        if (filtered.worthShowing) {
          sequenceSteps = filtered
        }
        break
      }
      case 'hotel_card': {
        const filtered = filterHotel(block)
        if (filtered.worthShowing) {
          hotel = filtered
        }
        break
      }
      case 'restaurant_card': {
        const filtered = filterRestaurant(block)
        if (filtered.worthShowing) {
          restaurants.push(filtered)
        }
        break
      }
      case 'spotlight': {
        const filtered = filterSpotlight(block)
        if (filtered.worthShowing) {
          spotlights.push(filtered)
        }
        break
      }
    }
  }

  // 找 day_header block 取 title/date
  const dayHeader = blocks.find(b => b.type === 'day_header')

  return {
    type: 'day',
    dayIndex: section.day_index,
    date: section.date,
    title: dayHeader?.type === 'day_header' ? dayHeader.data.title : `Day ${section.day_index}`,
    summary: dayHeader?.type === 'day_header' ? dayHeader.data.summary : undefined,
    routeCard,
    sequenceSteps,
    restaurants,
    hotel,
    spotlights,
  }
}

function parseStaysSection(section: CanvasStaysSection): RenderStays {
  return {
    type: 'stays',
    items: section.data.items
      .filter(item => item.name?.trim())
      .map(item => ({
        id: item.id,
        nightsLabel: item.nights_label,
        name: item.name,
        imageUrl: item.image?.url,
        description: item.description,
      })),
  }
}

function parseLeaderMeeting(section: CanvasLeaderMeetingSection): RenderLeaderMeeting {
  return {
    type: 'leader_meeting',
    leader: section.data.leader,
    meeting: section.data.meeting,
  }
}

function parseAppendix(section: CanvasAppendixSection): RenderAppendix {
  const c = section.data.contact
  return {
    type: 'appendix',
    inclusions: section.data.inclusions ?? [],
    exclusions: section.data.exclusions ?? [],
    notices: section.data.notices ?? [],
    contact: c
      ? {
          employeeName: c.employee_name,
          employeePhone: c.employee_phone,
          employeeEmail: c.employee_email,
          companyName: c.company_name,
          companyPhone: c.company_phone,
        }
      : undefined,
  }
}

// ============================================
// 輔助：計算總天數
// ============================================

/**
 * 從 RenderIntent[] 計算總天數
 */
export function countDays(intents: RenderIntent[]): number {
  return intents.filter(i => i.type === 'day').length
}

/**
 * 從 RenderIntent[] 找出所有飯店（用於住宿總覽）
 */
export function extractHotelsFromDays(intents: RenderIntent[]): FilteredHotel[] {
  return intents
    .filter((i): i is RenderDaySection => i.type === 'day')
    .map(d => d.hotel)
    .filter((h): h is FilteredHotel => h !== undefined)
}
