// 資源面板共用型別定義

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

export interface ResourceItem {
  id: string
  name: string
  type: ResourceType
  category?: string | null
  images?: string[]
  city_name?: string | null
  data_verified?: boolean
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  description?: string | null
  region_id?: string | null
}
