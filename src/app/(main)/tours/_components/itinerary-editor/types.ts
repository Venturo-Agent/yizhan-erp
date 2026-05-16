/**
 * 行程編輯器類型定義
 */

import type { FlightInfo } from '@/types/flight.types'

/** 行程編輯器上下文（取代 ProposalPackage + Proposal） */
export interface ItineraryEditorContext {
  id: string // 用於 key，可以是 tour.id
  itinerary_id?: string | null
  start_date?: string | null
  end_date?: string | null
  days?: number | null
  country_id?: string | null
  airport_code?: string | null
  destination?: string | null
  version_name?: string
  quote_id?: string | null
  group_size?: number | null
  workspace_id: string
  title: string
}

/** 行程表表單資料 */
export interface ItineraryFormData {
  title: string
  description: string
  outboundFlight: FlightInfo | null
  returnFlight: FlightInfo | null
}

/** 簡化版活動（時間軸用） */
export interface SimpleActivity {
  id: string
  title: string
  startTime?: string // 格式 "0900"
  endTime?: string // 格式 "1030"
  attractionId?: string // 景點庫 ID（可追溯圖片/描述等）
}

/** 每日行程項目 */
export interface DailyScheduleItem {
  day: number
  route: string
  meals: {
    breakfast: string
    lunch: string
    dinner: string
  }
  accommodation: string
  accommodationId?: string
  sameAsPrevious: boolean
  hotelBreakfast: boolean
  lunchSelf: boolean
  dinnerSelf: boolean
  activities?: SimpleActivity[]
  attractions?: Array<{ id: string; name: string }>
  mealIds?: { breakfast?: string; lunch?: string; dinner?: string }
  note?: string
}

/** AI 主題選項 */
interface AiThemeOption {
  value: string
  label: string
  description: string
}

/** AI 主題列表 */
export const AI_THEMES: AiThemeOption[] = [
  { value: 'classic', label: '經典景點', description: '必訪名勝、熱門打卡點' },
  { value: 'foodie', label: '美食探索', description: '在地美食、特色餐廳' },
  { value: 'culture', label: '文青之旅', description: '文化體驗、藝術展覽' },
  { value: 'nature', label: '自然風光', description: '山林步道、自然景觀' },
  { value: 'family', label: '親子同樂', description: '適合全家的輕鬆行程' },
  { value: 'relax', label: '悠閒慢旅', description: '不趕行程、深度體驗' },
]

/** 預覽模式每日資料 */
export interface PreviewDayData {
  dayLabel: string
  date: string
  title: string
  note?: string
  meals: {
    breakfast: string
    lunch: string
    dinner: string
  }
  accommodation: string
}

/** Dialog Props（使用 ItineraryEditorContext 取代 ProposalPackage + Proposal） */
export interface PackageItineraryDialogProps {
  isOpen: boolean
  onClose: () => void
  context: ItineraryEditorContext
  onItineraryCreated?: (itineraryId?: string) => void
}

/** 住宿狀態 */
export interface AccommodationStatus {
  isComplete: boolean
  filledCount: number
  requiredDays: number
  accommodations: string[]
}
