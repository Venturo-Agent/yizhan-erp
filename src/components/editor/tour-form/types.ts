// 從 stores 統一匯入並匯出共用類型，避免重複定義
import type {
  LeaderInfo as LeaderInfoType,
  DailyImage as DailyImageType,
  HotelInfo as HotelInfoType,
  PricingItem as PricingItemType,
  PricingDetails as PricingDetailsType,
  PriceTier as PriceTierType,
  FAQ as FAQType,
} from '@/stores/types/tour.types'

// 本地類型別名（供此檔案內使用）
type LeaderInfo = LeaderInfoType
export type DailyImage = DailyImageType
export type HotelInfo = HotelInfoType
export type PricingItem = PricingItemType
export type PricingDetails = PricingDetailsType
export type PriceTier = PriceTierType
export type FAQ = FAQType

export interface FlightInfo {
  airline: string
  flightNumber: string
  departureAirport: string
  departureTime: string
  departureDate?: string // 與 stores/types.ts 一致，出發日期為可選
  arrivalAirport: string
  arrivalTime: string
  duration?: string
  hasMeal?: boolean // 是否提供機上餐食
}

export interface Feature {
  icon: string
  title: string
  description: string
  images?: string[] // 圖片陣列（支援任意數量）
  tag?: string // 自訂標籤文字（如 "Gastronomy"、"Discovery"）
  tagColor?: string // 標籤顏色（如 "#2C5F4D"、"#C69C6D"）
  date?: string // Art 風格用的日期標記
}

export interface FocusCard {
  title: string
  src: string
}

// 圖片位置設定（支援位置+縮放）
import type { ImagePositionSettings } from '@/components/ui/image-position-editor'
export type { ImagePositionSettings }

export interface Activity {
  icon: string
  title: string
  description: string
  image?: string
  imagePosition?: string | ImagePositionSettings // 圖片顯示位置（支援舊字串格式和新物件格式）
  attraction_id?: string // 關聯的景點 ID（從景點選擇器選擇時會設定）
  // 時間軸欄位（展開時間軸時使用）
  id?: string // 唯一識別碼
  startTime?: string // 開始時間，格式 "0900"
  endTime?: string // 結束時間，格式 "1030"
}

export interface Meals {
  breakfast: string
  lunch: string
  dinner: string
}

// DailyImage 已從 stores/types/tour.types.ts 統一匯出

// 每日行程展示風格
type DayDisplayStyle = 'single-image' | 'multi-image' | 'card-grid' | 'timeline'

// Dreamscape 每日行程佈局風格
type DreamscapeDayLayout = 'blobLeft' | 'blobRight' | 'fullHero' | 'glassCard'

export interface DailyItinerary {
  dayLabel: string
  date: string
  title: string
  highlight?: string
  description?: string
  // 以下欄位不存資料庫，展示時從核心表 JOIN 取得（syncToCore 時才用完整資料）
  activities?: Activity[]
  recommendations?: string[]
  meals?: Meals
  accommodation?: string
  accommodationUrl?: string // 飯店官網或訂房連結
  accommodationRating?: number // 飯店星級（1-5）
  isSameAccommodation?: boolean // 是否續住（與前一天相同住宿）
  images?: (string | DailyImage)[] // 支援舊格式 string 和新格式 DailyImage
  showDailyImages?: boolean // 是否顯示每日圖片區塊（預設 false）
  isAlternative?: boolean // 是否為建議方案（替代行程），如 Day 3-B, Day 3-C
  locationLabel?: string // Luxury 模板專用：地點標籤（如「京都」、「大阪」）
  displayStyle?: DayDisplayStyle // 每日行程展示風格（單張大圖、多圖輪播、卡片網格、時間軸）
  dreamscapeLayout?: DreamscapeDayLayout // Dreamscape 模板專用：每日佈局風格
}

// LeaderInfo 已從 stores/types/tour.types.ts 統一匯出

export interface MeetingPoint {
  time: string
  location: string
  // 進階欄位（Art/Collage 風格使用）
  date?: string | null
  flightNo?: string | null
  airline?: string | null
}

// HotelInfo, PricingItem, PricingDetails, PriceTier, FAQ 已從 stores/types/tour.types.ts 統一匯出

// Luxury 封面統計卡片（如：特色餐食、景點數量）
export interface HeroStatCard {
  value: number | string // 數字（如 3、4）
  label: string // 標籤（如「Fine Dining」、「Attractions」）
}

export interface TourCountry {
  country_id: string
  country_name: string
  country_code?: string
  airport_code?: string
  main_city_name?: string
  is_primary: boolean // 是否為主要國家
}

// 封面風格類型：
// - original: 經典全螢幕置中（金色漸層）
// - gemini: 緊湊底部對齊（莫蘭迪金色）
// - nature: 綠色慢旅風格（垂直文字 + 重疊圖片卡）
// - luxury: 奢華質感風格（左右分欄 + 襯線字體 + 深色酒店區塊）
// - art: 藝術雜誌風格（全螢幕大圖 + 高對比 + 不規則佈局）
// - dreamscape: 夢幻漫遊風格（blob 遮罩 + 玻璃擬態 + 浮動動畫）
// - collage: 互動拼貼風格（Pop Art + 拍立得 + 登機證）
export type CoverStyleType =
  | 'original'
  | 'gemini'
  | 'nature'
  | 'luxury'
  | 'art'
  | 'dreamscape'
  | 'collage'

// 航班卡片風格類型：
// - original: 經典莫蘭迪金色風格
// - chinese: 中國風書法風格
// - japanese: 日式和紙風格（帶目的地圖片）
// - luxury: 奢華質感風格（表格式 + 深色調）
// - art: 藝術雜誌風格（Brutalist + 高對比）
// - none: 國內無航班（台灣行程不需要航班）
// - dreamscape: 夢幻漫遊風格（節點路徑圖 + 玻璃卡片）
// - collage: 互動拼貼風格（登機證 + Pop Art）
export type FlightStyleType =
  | 'original'
  | 'chinese'
  | 'japanese'
  | 'luxury'
  | 'art'
  | 'none'
  | 'dreamscape'
  | 'collage'

// 每日行程風格類型：
// - original: 經典時間軸風格
// - luxury: 奢華質感風格（卡片式 + 深色調）
// - art: 藝術雜誌風格（12欄網格 + 垂直導航 + Brutalist）
// - dreamscape: 夢幻漫遊風格（blob 遮罩 + 玻璃卡片 + 浮動動畫）
export type ItineraryStyleType = 'original' | 'luxury' | 'art' | 'dreamscape'

// 行程特色風格類型：
// - original: 經典莫蘭迪金色風格
// - luxury: 奢華質感風格（深色調 + 襯線字體）
// - collage: 互動拼貼風格（Pop Art + 拍立得 + 便條紙）
export type FeaturesStyleType = 'original' | 'luxury' | 'collage'

export interface TourFormData {
  tagline: string
  title: string
  subtitle: string
  description: string
  country: string
  city: string
  countries?: TourCountry[] // 新增：行程涵蓋的國家清單
  departureDate: string
  tourCode: string
  coverImage?: string
  coverImagePosition?: ImagePositionSettings // 封面圖片位置設定
  coverStyle?: CoverStyleType // 封面風格：original（原版）或 gemini（Gemini 風格）
  heroStatCard2?: HeroStatCard // Luxury 封面第二個統計卡片（如：特色餐食）
  heroStatCard3?: HeroStatCard // Luxury 封面第三個統計卡片（如：景點數量）
  price?: string | null // 價格（如：39,800）
  priceNote?: string | null // 價格備註（如：起、/人）
  outboundFlight: FlightInfo
  returnFlight: FlightInfo
  flightStyle?: FlightStyleType // 航班卡片風格
  itineraryStyle?: ItineraryStyleType // 每日行程風格
  featuresStyle?: FeaturesStyleType // 行程特色風格
  features: Feature[]
  focusCards: FocusCard[]
  leader: LeaderInfo
  meetingPoints: MeetingPoint[] // 改為陣列支援多個集合地點
  hotels: HotelInfo[] // 新增飯店資訊陣列
  showFeatures?: boolean // 是否顯示行程特色區塊
  showLeaderMeeting?: boolean // 是否顯示領隊與集合資訊
  showHotels?: boolean // 是否顯示飯店資訊
  showPricingDetails?: boolean // 是否顯示詳細團費
  pricingDetails?: PricingDetails // 詳細團費資訊
  priceTiers?: PriceTier[] | null // 價格方案（多種人數價格）
  showPriceTiers?: boolean // 是否顯示價格方案區塊
  faqs?: FAQ[] | null // 常見問題
  showFaqs?: boolean // 是否顯示常見問題區塊
  notices?: string[] | null // 提醒事項
  showNotices?: boolean // 是否顯示提醒事項區塊
  cancellationPolicy?: string[] | null // 取消政策
  showCancellationPolicy?: boolean // 是否顯示取消政策區塊
  itinerarySubtitle: string
  dailyItinerary: DailyItinerary[]
}

export interface CityOption {
  id: string
  code: string
  name: string
}
