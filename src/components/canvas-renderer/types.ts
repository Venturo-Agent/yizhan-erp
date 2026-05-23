/**
 * 永成款展示行程 — 資料模型
 *
 * Canvas JSON 結構（規格書 § 7.2）
 * 整個展示行程是一棵組件樹、存在 tour_display_overrides.canvas 欄位（Phase 2 才建表）
 *
 * 設計原則：
 * - 每個 section 一個 type、type 決定渲染什麼組件
 * - blocks 內部排序 = 顯示順序、由 day 包起來
 * - 編輯時改 canvas JSON、不動 source data（行程分頁）
 */

// ============ 共用 ============

export interface CanvasImage {
  url: string
  focal_x?: number  // 0-100、object-position
  focal_y?: number
  brightness?: number  // -50 ~ +50
  contrast?: number    // -50 ~ +50
  caption?: string
}

export type CanvasBlockId = string  // UUID

// ============ Sidenav / 整頁設定 ============

export interface CanvasBrandInfo {
  name: string           // 例「角落旅行社」
  english_name?: string  // 例「Corner Travel」
  logo_url?: string      // 客戶公司 logo（footer）
}

export interface CanvasContactInfo {
  employee_name?: string
  employee_phone?: string
  employee_email?: string
  company_name?: string
  company_phone?: string
}

// ============ Section 類型 ============

// C01 封面
export interface CanvasCoverData {
  eyebrow?: string      // 「2026 私人包團・東京仙台六日」
  title: string         // 主標
  subtitle?: string     // 副標
  destination?: string  // 例「東京 ✕ 仙台」
  cover_image?: CanvasImage
  departure_date?: string
  brand?: CanvasBrandInfo
}

export interface CanvasCoverSection {
  type: 'cover'
  data: CanvasCoverData
}

// C02 行程總覽時間軸
export interface CanvasTimelineDay {
  day_index: number
  title: string         // 「輕井澤」
  summary: string       // 「抵達後直奔輕井澤」
}

export interface CanvasOverviewTimelineSection {
  type: 'overview_timeline'
  data: {
    days: CanvasTimelineDay[]
  }
}

// C03 Day Header
export interface CanvasDayHeaderBlock {
  id: CanvasBlockId
  type: 'day_header'
  data: {
    day_index: number
    date: string         // 「2026.12.02（星期三）」
    title: string        // 當天標題
    summary?: string     // 一句摘要
  }
}

// C04 景點卡（自動 1/2/3-up）
export interface CanvasAttraction {
  id: CanvasBlockId
  name: string
  subtitle?: string     // 地點 / 子標
  description?: string
  image?: CanvasImage
  highlights?: string[]
  category?: string     // 標籤
  suggested_duration?: string  // 「建議停留 2 小時」
}

export interface CanvasRouteCardBlock {
  id: CanvasBlockId
  type: 'route_card'
  layout: '1up' | '2up' | '3up' | 'transit'
  data: {
    attractions: CanvasAttraction[]
    transit_note?: string  // transit 模式用、無圖移動日的說明
  }
}

// C05 時序步驟（非標配、右鍵加）
export interface CanvasSequenceStep {
  id: CanvasBlockId
  time: string          // 「10:00」
  title: string         // 「前往川越」
  description?: string
}

export interface CanvasSequenceStepsBlock {
  id: CanvasBlockId
  type: 'sequence_steps'
  data: {
    title?: string       // 「TIMELINE · DAY 3」
    steps: CanvasSequenceStep[]
  }
}

// C06 住宿卡
export interface CanvasHotelCardBlock {
  id: CanvasBlockId
  type: 'hotel_card'
  data: {
    name: string
    rating?: number      // 星級 1-5
    location?: string
    description?: string
    image?: CanvasImage
  }
}

// C07 航班卡
export interface CanvasFlightCardBlock {
  id: CanvasBlockId
  type: 'flight_card'
  data: {
    from_city: string
    from_airport?: string
    from_time?: string
    to_city: string
    to_airport?: string
    to_time?: string
    airline?: string
    flight_no?: string
  }
}

// C08 餐廳卡
export interface CanvasRestaurantCardBlock {
  id: CanvasBlockId
  type: 'restaurant_card'
  data: {
    meal: 'breakfast' | 'lunch' | 'dinner'
    name: string
    cuisine?: string
    description?: string
    image?: CanvasImage
  }
}

// C09 Feature Hero（特色英雄區、非標配）
export interface CanvasFeatureHeroBlock {
  id: CanvasBlockId
  type: 'feature_hero'
  data: {
    eyebrow?: string
    title: string
    subtitle?: string
    background_image?: CanvasImage
  }
}

// C10 Stall Grid（小卡格、非標配）
export interface CanvasStallItem {
  id: CanvasBlockId
  name: string
  description?: string
  image?: CanvasImage
}

export interface CanvasStallGridBlock {
  id: CanvasBlockId
  type: 'stall_grid'
  data: {
    items: CanvasStallItem[]
  }
}

// C13 Ritual Spotlight（兩欄式特色介紹）
// 概念：仙台 HTML 的「ritual-spotlight」、左右 1:1、一邊大圖一邊文字段
// 用途：某一餐 / 某一晚住宿 / 某個體驗、要「特別介紹」時用、不像 Route Card 那種橫列卡
// 視覺氣質：精品提案常見的「電影分鏡」感、單個重點獨享一頁寬
export interface CanvasSpotlightBlock {
  id: CanvasBlockId
  type: 'spotlight'
  data: {
    tag?: string         // eyebrow（紅銅 italic）例：「— LUNCH · 元祖日光ゆば料理 惠比壽家」
    title: string        // 標題（36px、可帶 [accent]xxx[/accent] 紅銅標記）
    lead?: string        // 段落文字（17px、line-height 1.85）多行用 \n
    image?: CanvasImage
    image_position?: 'left' | 'right'  // 圖在哪邊；不設預設 right
  }
}

// C14 JP Note（日文小注解）
// 概念：仙台 HTML 的「jp-note」、霧米底 + 金色左豎線
// 用途：日文用語 / 文化專有名詞補充說明（湯波、界、會席...）
// 視覺氣質：低調但有重量、像書本的腳註
export interface CanvasJpNoteBlock {
  id: CanvasBlockId
  type: 'jp_note'
  data: {
    term: string         // 用語本身、紅銅粗體（例：「湯波（ゆば）」）
    description: string  // 解釋（例：「日光特產、豆乳加熱後表面凝結的薄膜。」）
  }
}

// Day section 包含的 blocks
export type CanvasDayBlock =
  | CanvasDayHeaderBlock
  | CanvasRouteCardBlock
  | CanvasSequenceStepsBlock
  | CanvasHotelCardBlock
  | CanvasFlightCardBlock
  | CanvasRestaurantCardBlock
  | CanvasFeatureHeroBlock
  | CanvasStallGridBlock
  | CanvasSpotlightBlock
  | CanvasJpNoteBlock

export interface CanvasDaySection {
  type: 'day'
  day_index: number
  date: string
  blocks: CanvasDayBlock[]
}

// C11 住宿總覽（自動彙整）
export interface CanvasStayItem {
  id: CanvasBlockId
  nights_label: string  // 「Night 1-2」
  name: string
  image?: CanvasImage
  description?: string
}

export interface CanvasStaysSection {
  type: 'stays'
  data: {
    items: CanvasStayItem[]
  }
}

// C12 附錄
export interface CanvasAppendixSection {
  type: 'appendix'
  data: {
    inclusions?: string[]    // 費用包含
    exclusions?: string[]    // 費用不含
    notices?: string[]       // 注意事項
    contact?: CanvasContactInfo
  }
}

// ============ 整份 Canvas ============

export type CanvasSection =
  | CanvasCoverSection
  | CanvasOverviewTimelineSection
  | CanvasDaySection
  | CanvasStaysSection
  | CanvasAppendixSection

export interface Canvas {
  theme: 'yongcheng'
  brand?: CanvasBrandInfo
  sections: CanvasSection[]
}
