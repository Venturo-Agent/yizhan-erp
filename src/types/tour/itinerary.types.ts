/**
 * 行程表相關型別定義
 * 包含：行程展示內容（特色/景點/領隊/集合/飯店/每日行程）、
 *       行程定價、版本記錄、Itinerary 主體
 */

import type { FlightInfo } from './flight.types'

// ============================================
// 行程展示內容
// ============================================

export interface ItineraryFeature {
  icon: string // icon 名稱 (如: "IconBuilding")
  title: string
  description: string
}

export interface FocusCard {
  title: string
  src: string // 圖片 URL
}

export interface LeaderInfo {
  name: string // 中文名稱
  englishName?: string | null // 英文暱稱
  domesticPhone: string
  overseasPhone: string
  // 進階欄位（Art/Collage 風格使用）
  lineId?: string | null
  photo?: string | null
  title?: string | null
  description?: string | null
}

export interface MeetingInfo {
  time: string // ISO 8601 格式
  location: string
  // 進階欄位（Art/Collage 風格使用）
  date?: string | null
  flightNo?: string | null
  airline?: string | null
}

export interface HotelInfo {
  name: string
  description: string
  image?: string // 單張圖片
  images?: string[] // 多張圖片（最多 4 張）
  location?: string // 飯店位置（Art/Collage 風格用）
}

export interface DailyActivity {
  icon: string // emoji 或 icon
  title: string
  description: string
  image?: string
}

export interface DailyMeals {
  breakfast: string
  lunch: string
  dinner: string
}

// 每日圖片（支援位置調整）
export interface DailyImage {
  url: string
  position?: string // object-position 值，如 "center", "center top", "center 30%"
}

export interface DailyItineraryDay {
  dayLabel: string // 如: "Day 1"
  date: string // 如: "10/21 (二)"
  title: string
  highlight?: string
  description?: string
  // 以下欄位不存資料庫，展示時從核心表 JOIN 取得（syncToCore 時才用完整資料）
  activities?: DailyActivity[]
  recommendations?: string[]
  meals?: DailyMeals
  accommodation?: string
  accommodationUrl?: string // 飯店官網或訂房連結
  accommodationRating?: number // 飯店星級（1-5）
  isSameAccommodation?: boolean // 是否續住（與前一天相同住宿）
  images?: (string | DailyImage)[] // 支援舊格式 string 和新格式 DailyImage
}

// ============================================
// 行程定價
// ============================================

// 費用包含/不含項目
export interface PricingItem {
  text: string // 項目文字
  included: boolean // 是否包含
}

// 詳細團費資訊
export interface PricingDetails {
  show_pricing_details?: boolean // 是否顯示詳細團費
  insurance_amount?: '250' | '300' | '500' | string // 旅遊責任險金額（萬元），可選擇或自訂
  included_items: PricingItem[] // 費用包含項目
  excluded_items: PricingItem[] // 費用不含項目
  notes: string[] // 注意事項
}

// 價格方案（如 4人包團、6人包團、8人包團）
export interface PriceTier {
  // 基本欄位（報價單用）
  label: string // 如「4人包團」、「6人包團」
  sublabel?: string // 如「每人」
  price: string // 如「34,500」
  priceNote?: string // 如「起」
  addon?: string // 如「加購1日包車 / 每人+NT$900」
  // 展示層欄位（Tour Section 用）
  name?: string // 方案名稱（展示用，同 label）
  description?: string // 方案說明
  pricePerPerson?: number | string // 每人價格（數值或格式化字串）
  features?: string[] // 方案包含項目
}

// 常見問題
export interface FAQ {
  question: string // 問題
  answer: string // 答案
}

// ============================================
// 版本記錄
// ============================================

// 行程表版本記錄（存在同一筆資料的 JSON 陣列裡）
export interface ItineraryVersionRecord {
  id: string // UUID
  version: number // 版本號
  note: string // 版本備註（如：原始版、客戶修改版）
  // 可變動的內容
  daily_itinerary: DailyItineraryDay[]
  features?: ItineraryFeature[]
  focus_cards?: FocusCard[]
  leader?: LeaderInfo
  meeting_info?: MeetingInfo
  hotels?: HotelInfo[]
  // 時間戳記
  created_at: string
}

// ============================================
// Itinerary 主體
// ============================================

/**
 * Itinerary - 行程表型別定義
 */
export interface Itinerary {
  // 基礎欄位
  id: string
  code?: string // 行程編號（如：I20240001）
  tour_id?: string // 關聯的團 ID（選填，因為可能只是草稿）
  quote_id?: string // 關聯的報價單 ID（選填）

  // 模板支援
  template_id?: string | null // 模板 ID（模板時有值，實際團時為 null）
  template_code?: string | null // 模板代號（例如：TPL-JPN-001）
  template_name?: string | null // 模板名稱（例如：日本東京經典 5 日遊）

  // 多租戶支援
  workspace_id?: string // Workspace ID（多租戶隔離）

  // 封面資訊
  name?: string // 行程名稱（向後相容別名，等同 title）
  destination?: string // 目的地（向後相容）
  tagline: string
  title: string
  subtitle: string
  description: string
  departure_date: string
  tour_code: string
  cover_image: string
  country: string
  city: string
  // 5/13 v2：itineraries.status 改英文 enum、對齊整體紀律
  // DB CHECK = ('draft' / 'published')、UI 顯示用 label map 翻中文
  status: 'draft' | 'published'
  cover_style?: 'original' | 'gemini' | 'nature' | 'luxury' | 'art' | 'dreamscape' | 'collage' // 封面風格
  flight_style?:
    | 'original'
    | 'chinese'
    | 'japanese'
    | 'luxury'
    | 'art'
    | 'none'
    | 'dreamscape'
    | 'collage' // 航班卡片風格
  itinerary_style?: 'original' | 'luxury' | 'art' | 'dreamscape' // 每日行程風格
  price?: string | null // 價格（如：39,800）
  price_note?: string | null // 價格備註（如：起、/人）

  // 航班資訊（支援多航段轉機）
  outbound_flight?: FlightInfo | FlightInfo[]
  return_flight?: FlightInfo | FlightInfo[]
  flight_info?: {
    outbound?: {
      flightNumber: string
      airline: string
      departureAirport: string
      arrivalAirport: string
      departureTime: string
      arrivalTime: string
    } | null
    return?: {
      flightNumber: string
      airline: string
      departureAirport: string
      arrivalAirport: string
      departureTime: string
      arrivalTime: string
    } | null
  } | null

  // 行程特色
  features: ItineraryFeature[]
  show_features?: boolean

  // 精選景點
  focus_cards: FocusCard[]

  // 領隊資訊
  leader?: LeaderInfo
  show_leader_meeting?: boolean

  // 集合資訊
  meeting_info?: MeetingInfo

  // 飯店資訊
  hotels?: HotelInfo[]
  show_hotels?: boolean

  // 行程副標題
  itinerary_subtitle?: string

  // 逐日行程
  daily_itinerary: DailyItineraryDay[]

  // 版本記錄（像 Excel 分頁）
  version_records?: ItineraryVersionRecord[]

  // 狀態相關欄位
  is_template?: boolean // 是否為公司範例行程
  closed_at?: string | null // 結案時間

  // 詳細團費
  pricing_details?: PricingDetails
  show_pricing_details?: boolean

  // 價格方案（多種人數價格）
  // 行程表用 price_tiers，團用 tier_pricings
  price_tiers?: PriceTier[] | null
  show_price_tiers?: boolean

  // 常見問題
  faqs?: FAQ[] | null
  show_faqs?: boolean

  // 提醒事項
  notices?: string[] | null
  show_notices?: boolean

  // 取消政策
  cancellation_policy?: string[] | null
  show_cancellation_policy?: boolean

  // 審計追蹤欄位
  created_at: string
  updated_at: string
  created_by?: string // 建立者的 employee ID
  updated_by?: string // 最後修改者的 employee ID
  archived_at?: string | null
  archived?: boolean // 是否已封存
  archive_reason?: string | null // 封存原因：no_deal、cancelled、test_error
}
