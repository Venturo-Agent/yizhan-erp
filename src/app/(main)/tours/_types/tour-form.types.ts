import { Tour } from '@/stores/types'

export interface NewTourData {
  name: string
  tour_service_type?:
    | 'flight'
    | 'flight_hotel'
    | 'hotel'
    | 'tour_group'
    | 'outsource'
    | 'visa'
    | 'esim'
  days_count?: number | null

  // 核心表架構：統一欄位命名
  countryId?: string
  countryName?: string
  countryCode?: string

  cityCode: string
  cityName?: string

  customCountry?: string
  customLocation?: string
  customCityCode?: string
  departure_date: string
  return_date: string
  price: number
  status: Tour['status']
  isSpecial: boolean
  max_participants: number
  description?: string
  enable_checkin?: boolean
  role_assignments?: Record<string, string>
  /** 團控 employee.id — Phase A4 強制必填（DB NOT NULL）*/
  controller_id?: string
  /** 5/24 品牌：案子所屬品牌（單一品牌自動帶預設、多品牌用戶選、show-if-multi）*/
  brand_id?: string
}

export interface TourExtraFields {
  addOns: boolean
  refunds: boolean
  customFields: Array<{ id: string; name: string }>
}

export interface DeleteConfirmState {
  isOpen: boolean
  tour: Tour | null
}
