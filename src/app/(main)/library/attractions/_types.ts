// ============================================
// 景點型別定義
// ============================================

export interface Attraction {
  id: string
  name: string
  english_name?: string
  description?: string
  country_id: string
  region_id?: string
  city_id?: string | null
  category?: string
  tags?: string[]
  duration_minutes?: number
  opening_hours?: Record<string, string> | string
  address?: string
  phone?: string
  website?: string
  latitude?: number
  longitude?: number
  google_maps_url?: string
  images?: string[]
  is_active: boolean
  display_order: number
  notes?: string
  ticket_price?: string
  data_verified?: boolean
  created_at: string
  updated_at: string
}

// 檢查景點是否有缺失資料
export function hasMissingData(attraction: Attraction): string[] {
  const missing: string[] = []
  if (!attraction.latitude || !attraction.longitude) missing.push('座標')
  if (!attraction.ticket_price) missing.push('門票')
  if (!attraction.notes) missing.push('介紹')
  if (!attraction.duration_minutes) missing.push('時長')
  return missing
}

export type SortField = 'name' | 'city' | 'category' | 'duration' | 'status'
export type SortDirection = 'asc' | 'desc' | null

export interface AttractionFormData {
  name: string
  english_name: string
  description: string
  country_id: string
  region_id: string
  city_id?: string | null
  category: string
  tags: string
  duration_minutes: number
  address: string
  phone: string
  website: string
  images: string
  notes: string
  is_active: boolean
  // AI 補充欄位
  latitude?: number
  longitude?: number
  ticket_price?: string
  opening_hours?: string
}
