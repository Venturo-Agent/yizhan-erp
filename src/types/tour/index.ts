/**
 * 旅遊團型別 barrel export
 * 統一從此匯出，外部一律 import from '@/types/tour.types'（走主檔 re-export）
 */

export type {
  FlightSegment,
  FlightInfo,
} from './flight.types'

export type {
  Member,
  TourAddOn,
} from './member.types'

export type {
  ItineraryFeature,
  FocusCard,
  LeaderInfo,
  MeetingInfo,
  HotelInfo,
  DailyActivity,
  DailyMeals,
  DailyImage,
  DailyItineraryDay,
  PricingItem,
  PricingDetails,
  PriceTier,
  FAQ,
  ItineraryVersionRecord,
  Itinerary,
} from './itinerary.types'

export type {
  Tour,
  TourStatus,
  ContractStatus,
  ContractTemplate,
  TourServiceType,
  TourCategory,
  CreateTourData,
  UpdateTourData,
  TourFilter,
  TourListItem,
  TourStats,
} from './tour-core.types'
