/**
 * TourPageData - 行程展示頁面統一類型
 *
 * 整合 TourFormData 並加入展示層所需的欄位。
 * 34 個 section 元件已統一使用此類型。
 * 剩餘小工具元件（SectionTitle、DailyImageCarousel）接收獨立 props，屬正常設計。
 */

// 從 tour-form 統一匯出基礎類型
export type {
  
  Feature,
  
  
  
  
  
  
  
  
  
  
  CoverStyleType,
  
  
  
} from '@/components/editor/tour-form/types'

// 從 stores 匯出共用類型
export type {  HotelInfo } from '@/stores/types/tour.types'

import type {
  FlightInfo,
  Feature,
  FocusCard,
  DailyItinerary,
  MeetingPoint,
  PricingDetails,
  PriceTier,
  FAQ,
  HeroStatCard,
  ImagePositionSettings,
  CoverStyleType,
  FlightStyleType,
  ItineraryStyleType,
  FeaturesStyleType,
  TourCountry,
} from '@/components/editor/tour-form/types'

import type { LeaderInfo, HotelInfo } from '@/stores/types/tour.types'

/**
 * TourPageData - TourPage 和 TourPreview 使用的資料結構
 *
 * 大部分欄位為可選，因為：
 * 1. 資料可能來自不同來源（編輯器、API、資料庫）
 * 2. 各 section 只需要部分欄位
 * 3. 向後相容現有程式碼
 */
export interface TourPageData {
  // === 基本資訊 ===
  tagline?: string
  title?: string
  subtitle?: string
  description?: string
  country?: string
  city?: string
  countries?: TourCountry[]
  departureDate?: string
  tourCode?: string
  days?: number // 行程天數（可從 dailyItinerary 計算）

  // === 封面 ===
  coverImage?: string | null
  coverImagePosition?: ImagePositionSettings
  coverStyle?: CoverStyleType
  heroStatCard2?: HeroStatCard
  heroStatCard3?: HeroStatCard
  price?: string | null
  priceNote?: string | null

  // === 航班 ===
  outboundFlight?: FlightInfo | null
  returnFlight?: FlightInfo | null
  flightStyle?: FlightStyleType

  // === 行程特色 ===
  features?: Feature[]
  featuresStyle?: FeaturesStyleType
  showFeatures?: boolean
  focusCards?: FocusCard[]

  // === 每日行程 ===
  dailyItinerary?: DailyItinerary[]
  itineraryStyle?: ItineraryStyleType
  itinerarySubtitle?: string

  // === 領隊與集合 ===
  leader?: LeaderInfo | null
  meetingInfo?: MeetingPoint | null // 單一集合點（向後相容）
  meetingPoints?: MeetingPoint[] // 多集合點
  showLeaderMeeting?: boolean

  // === 飯店 ===
  hotels?: HotelInfo[]
  showHotels?: boolean

  // === 價格 ===
  pricingDetails?: PricingDetails
  showPricingDetails?: boolean
  priceTiers?: PriceTier[] | null
  showPriceTiers?: boolean

  // === FAQ ===
  faqs?: FAQ[] | null
  showFaqs?: boolean

  // === 須知與政策 ===
  notices?: string[] | null
  showNotices?: boolean
  cancellationPolicy?: string[] | null
  showCancellationPolicy?: boolean
}

/**
 * TourPageProps - TourPage 組件的 props
 */
export interface TourPageProps {
  data: TourPageData
  isPreview?: boolean
  viewMode?: 'desktop' | 'mobile'
}

/**
 * TourPreviewProps - TourPreview 組件的 props
 */
export interface TourPreviewProps {
  data: TourPageData
  viewMode?: 'desktop' | 'mobile'
}
