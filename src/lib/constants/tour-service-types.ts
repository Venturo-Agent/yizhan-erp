/**
 * Tour Service Type — Single Source of Truth
 *
 * 集中管理「團類型」的 metadata（label / description / codePrefix / needsDestination）。
 *
 * 原本散在 3 處：
 *   1. DB chk_tour_service_type CHECK 約束（純 id 列表）
 *   2. src/types/tour.types.ts 的 TourServiceType union（純 type）
 *   3. settings/company/tour-features-section.tsx 的 tourCategories（label / description）
 *   4. tours/_components/tour-form/TourBasicInfo.tsx 的 NO_DESTINATION_TYPES（codePrefix）
 *
 * 5/11 重構（William 拍板）：所有 caller 從本檔讀、新加類型只改一處。
 *
 * 加新類型 SOP：
 *   1. 本檔 TOUR_SERVICE_TYPES 加一筆
 *   2. src/types/tour.types.ts TourServiceType union 加 id（type 同步）
 *   3. DB migration ALTER chk_tour_service_type 加 id
 *   4. 完成 — UI 跟邏輯自動 pick up
 */

import type { TourServiceType } from '@/types/tour.types'

export interface TourServiceTypeMeta {
  /** DB 內的 tour_service_type 值（chk_tour_service_type 約束的 id）*/
  id: TourServiceType
  /** 中文名（UI 顯示）*/
  label: string
  /** 用途說明（UI 顯示）*/
  description: string
  /** tour code 固定 prefix（不需選地點時、generate_tour_code RPC 用此當「城市代碼」）*/
  codePrefix?: string
  /** 開團時是否需要選國家 / 機場 / 城市 */
  needsDestination: boolean
  /** 是否顯示「行程 / 展示行程」tab — false = 隱藏 */
  needsItinerary: boolean
  /** 是否需要選團控 — false = 不顯示團控選項、controller_id 可空（DB 已 nullable）*/
  needsController: boolean
  /** UI 顯示順序 */
  sortOrder: number
}

/**
 * 全部團類型 — 對齊 DB chk_tour_service_type 8 個值
 *
 * 加新類型時順序按業務邏輯：
 *   - 完整旅遊：tour_group
 *   - 機票相關：flight / flight_hotel
 *   - 單品：hotel / car_service
 *   - 配件 / 服務：esim / visa
 *   - 外包：outsource
 */
export const TOUR_SERVICE_TYPES: readonly TourServiceTypeMeta[] = [
  { id: 'tour_group',   label: '旅遊團',  description: '完整旅遊行程',                                needsDestination: true,  needsItinerary: true,  needsController: true,  sortOrder: 1 },
  { id: 'flight',       label: '機票',    description: '純機票訂位與開票',                            needsDestination: true,  needsItinerary: false, needsController: false, sortOrder: 2 },
  { id: 'flight_hotel', label: '機加酒',  description: '機票加住宿套裝',                              needsDestination: true,  needsItinerary: false, needsController: false, sortOrder: 3 },
  { id: 'hotel',        label: '訂房',    description: '純住宿預訂',                                  needsDestination: true,  needsItinerary: true,  needsController: false, sortOrder: 4 },
  { id: 'car_service',  label: '派車',    description: '交通接送服務',                                needsDestination: true,  needsItinerary: true,  needsController: false, sortOrder: 5 },
  { id: 'esim',         label: '網卡',    description: 'eSIM 訂單管理（不選國家機場、prefix ESIM）',  codePrefix: 'ESIM', needsDestination: false, needsItinerary: false, needsController: false, sortOrder: 6 },
  { id: 'visa',         label: '簽證',    description: '簽證代辦（不選國家機場、prefix VISA）',       codePrefix: 'VISA', needsDestination: false, needsItinerary: false, needsController: false, sortOrder: 7 },
  { id: 'outsource',    label: '外丟團',  description: '外包給其他旅行社（不選國家機場、prefix OUT）', codePrefix: 'OUT',  needsDestination: false, needsItinerary: false, needsController: false, sortOrder: 8 },
] as const

/**
 * 衍生 map：tour_service_type id → codePrefix
 * 給 TourBasicInfo / generate_tour_code RPC 用。
 *
 * 例：{ outsource: 'OUT', visa: 'VISA', esim: 'ESIM' }
 */
export const TOUR_TYPE_CODE_PREFIX: Record<string, string> = Object.fromEntries(
  TOUR_SERVICE_TYPES
    .filter((t) => !t.needsDestination && t.codePrefix)
    .map((t) => [t.id, t.codePrefix!])
)

/** 是否為「不需選國家 / 機場」的類型 */
export function isNoDestinationServiceType(id: string | null | undefined): boolean {
  if (!id) return false
  return id in TOUR_TYPE_CODE_PREFIX
}

/** 是否需要「行程 / 展示行程」tab — 預設 true（保守、避免未知 type 誤隱藏）*/
export function needsItineraryServiceType(id: string | null | undefined): boolean {
  if (!id) return true
  const meta = TOUR_SERVICE_TYPES.find((t) => t.id === id)
  return meta?.needsItinerary ?? true
}

/** 是否需要選團控 — 預設 true（保守、未知 type 不誤放行空值）*/
export function needsControllerServiceType(id: string | null | undefined): boolean {
  if (!id) return true
  const meta = TOUR_SERVICE_TYPES.find((t) => t.id === id)
  return meta?.needsController ?? true
}

/** 取得單一 type 的 metadata */
export function getTourServiceTypeMeta(id: TourServiceType): TourServiceTypeMeta | undefined {
  return TOUR_SERVICE_TYPES.find((t) => t.id === id)
}
