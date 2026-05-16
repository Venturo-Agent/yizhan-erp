/**
 * 旅遊團相關型別定義
 * 統一來源：所有行程、航班、行程表型別皆定義於此
 *
 * 型別已拆分至 types/tour/ 子目錄（依 domain 分組）：
 *   - tour/flight.types.ts     — 旅遊團用航班型別（FlightSegment / FlightInfo）
 *   - tour/member.types.ts     — 團員與加購（Member / TourAddOn）
 *   - tour/itinerary.types.ts  — 行程表全系列型別（Itinerary / LeaderInfo / 逐日 ...）
 *   - tour/tour-core.types.ts  — Tour 主體、狀態 enum、CRUD / 篩選 / 統計
 *
 * 外部 import 路徑不需要改，繼續用 '@/types/tour.types' 即可。
 */

export type {
  FlightSegment,
  FlightInfo,
  Member,
  TourAddOn,
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
} from './tour/index'
