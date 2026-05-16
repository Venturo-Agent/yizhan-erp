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
  } | null
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
}
