/**
 * 地區型別定義
 *
 * ⚠️ Store 邏輯已遷移到 @/data (useCountries, useCities, useRegions)
 * 此檔案僅保留型別定義供既有 import 使用
 */

export interface Country {
  id: string
  name: string
  name_en: string
  code?: string
  has_regions: boolean
  display_order: number
  is_active: boolean
  usage_count?: number
  workspace_id?: string
  created_at: string
  updated_at: string
}

export interface Region {
  id: string
  country_id: string
  name: string
  name_en?: string
  description?: string
  display_order: number
  is_active: boolean
  workspace_id?: string
  created_at: string
  updated_at: string
}

export interface City {
  id: string
  country_id: string
  region_id?: string
  name: string
  name_en?: string
  airport_code?: string
  description?: string
  timezone?: string
  background_image_url?: string
  background_image_url_2?: string
  primary_image?: number
  display_order: number
  is_active: boolean
  is_major?: boolean
  usage_count?: number
  workspace_id?: string
  created_at: string
  updated_at: string
}

interface RegionStats {
  city_id: string
  attractions_count: number
  cost_templates_count: number
  quotes_count: number
  tours_count: number
  updated_at: string
}
