/**
 * 公開行程頁面 - 共用型別定義
 */

export interface TourData {
  id: string
  code: string
  departure_date: string | null
  selling_price_per_person: number | null
  max_participants: number | null
  current_participants: number | null
  days_count: number | null
  airport_code: string | null
  workspace_id: string | null
  itinerary: {
    id: string
    title: string | null
    subtitle: string | null
    daily_itinerary: DailyItinerary[] | null
    hotels: HotelInfo[] | null
    // 工單3 D2-A：舊系統「是否顯示飯店」設定、生成器拿來當 stays section hidden 初值（只讀一次、不雙向同步）
    show_hotels?: boolean | null
    // 工單2：領隊 + 集合資訊（jsonb）、生成器有料才生 leader_meeting section
    // 欄位結構對齊 src/types/tour/itinerary.types.ts 的 LeaderInfo / MeetingInfo
    leader?: LeaderInfo | null
    meeting_info?: MeetingInfo | null
    // 工單3 D2-A：舊系統「是否顯示領隊集合」設定、當 leader_meeting section hidden 初值（只讀一次、不雙向同步）
    show_leader_meeting?: boolean | null
  } | null
}

// 領隊資訊（itineraries.leader jsonb）、欄位對齊 src/types/tour/itinerary.types.ts LeaderInfo
export interface LeaderInfo {
  name?: string
  englishName?: string | null
  domesticPhone?: string
  overseasPhone?: string
}

// 集合資訊（itineraries.meeting_info jsonb）、欄位對齊 src/types/tour/itinerary.types.ts MeetingInfo
export interface MeetingInfo {
  time?: string
  location?: string
}

export interface DailyItinerary {
  dayLabel: string
  title: string
  description?: string
  highlight?: string
  activities?: Activity[]
  meals?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
  accommodation?: string
  images?: string[]
}

export interface Activity {
  title: string
  description?: string
  icon?: string
  attraction_id?: string
}

export interface HotelInfo {
  name: string
  nights?: number
  description?: string
  image_url?: string
}

export interface EmployeeInfo {
  display_name: string | null
  email: string | null
  avatar_url: string | null
  employee_number: string | null
}

export interface CompanyInfo {
  name: string
  phone: string
  // 公司 Logo（行程頁尾顯示用；optional 因 CompanyInfo 別處只給 name/phone）
  logo_url?: string | null
  logo_scale?: number | null
  logo_offset_x?: number | null
  logo_offset_y?: number | null
}
