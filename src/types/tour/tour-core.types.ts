/**
 * 旅遊團核心型別定義
 * 包含：Tour 主體、狀態 enum、CRUD 資料介面、篩選、列表、統計
 */

import { BaseEntity } from '../base.types'
import type { TierPricing } from '../quote-store.types'
import type { FlightInfo } from './flight.types'

// ============================================
// 旅遊團介面
// ============================================

/**
 * Tour - 旅遊團資料
 * 注意：所有可選欄位使用 | null 以符合 Supabase PostgreSQL 規範
 */
export interface Tour extends BaseEntity {
  code: string // 團號（統一使用 code）
  name: string // 團名
  // tour 類型（official / proposal / template）由 status 欄位區分
  days_count?: number | null // 天數（提案/模板用）
  /**
   * 已退役欄位（原為「目的地」字串、現由 country_id + airport_code 衍生）。
   * 顯示用途請改用 useTourDisplay / getTourDestinationDisplay helper。
   * 新程式碼禁止讀寫此欄位。DB 欄位本身將在所有寫入點停止後另行 migration drop。
   */
  location?: string | null
  country_id?: string | null // 國家 ID
  airport_code?: string | null // 機場代號
  departure_date: string | null // 出發日期 (ISO 8601)（提案/模板可為 null）
  return_date: string | null // 返回日期 (ISO 8601)（提案/模板可為 null）
  status?: string | null // 狀態（英文）
  price?: number | null // 基本價格
  selling_price_per_person?: number | null // 每人售價（從報價單帶入）
  max_participants?: number | null // 最大參與人數（相容舊欄位：max_people）
  current_participants?: number | null // 當前參與人數
  contract_status: string // 合約狀態
  total_revenue: number // 總收入
  total_cost: number // 總成本
  profit: number // 利潤
  description?: string | null // 團體說明/描述
  archived?: boolean | null // 是否已封存
  is_active?: boolean | null // 是否啟用
  features?: unknown // 行程特色（用於展示頁面，對應 Supabase Json）
  quote_id?: string | null // 關聯的報價單 ID（唯一）
  itinerary_id?: string | null // 關聯的行程表 ID（唯一）
  quote_cost_structure?: unknown // 報價成本結構快照（對應 Supabase Json）
  // 合約相關欄位
  contract_template?: string | null // 合約範本
  contract_content?: string | null // 合約內容
  contract_notes?: string | null // 合約備註
  contract_completed?: boolean | null // 合約是否完成
  contract_created_at?: string | null // 合約建立時間
  contract_archived_date?: string | null // 合約封存日期
  envelope_records?: string | null // 信封記錄

  // 結團相關欄位（結案真相看 status='closed'）
  closing_date?: string | null // 結團日期
  closed_by?: string | null // 結團操作人員 ID

  // 團服務類型
  tour_service_type?: TourServiceType | null // 團服務類型

  // 報到功能欄位
  enable_checkin?: boolean | null // 是否開啟報到功能
  checkin_qrcode?: string | null // 團體報到 QR Code 內容

  // 定價欄位（從報價單搬過來，一個團 = 一個報價單）
  selling_prices?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  participant_counts?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  tier_pricings?: TierPricing[] | null
  accommodation_days?: number | null

  /**
   * 航班 SSOT 已移到 itineraries.outbound_flight / return_flight。
   * 請從 itineraries 讀取、新程式碼禁止讀寫此欄位。
   * DB 欄位本身將在所有讀取點停止後另行 migration drop。
   */
  outbound_flight?: FlightInfo | FlightInfo[] | null
  /** 同 outbound_flight、請從 itineraries 讀取 */
  return_flight?: FlightInfo | FlightInfo[] | null

  // 公司規範：一團一份、不需版本鎖定
}

// ============================================
// 旅遊團狀態
// ============================================

/**
 * TourStatus - 旅遊團狀態（英文 SSOT、DB 儲存格式）
 *
 * 生命週期：template → proposal → upcoming → ongoing → returned → closed
 * 取消走封存維度（archived=true、archive_reason='cancelled'）、不是狀態。
 *
 * UI 顯示中文由 @/lib/constants/status-maps 的 TOUR_STATUS_LABELS 翻譯。
 */
export type TourStatus =
  | 'template' // 模板：可被複製、不會出發
  | 'proposal' // 提案：詢價階段、無團號
  | 'upcoming' // 待出發：已開團、有團號、出發日未到
  | 'ongoing' // 進行中：出發日已到、回程日未過
  | 'returned' // 未結團：回程日已過、還沒按結案
  | 'closed' // 已結團：按了結案按鈕、發獎金

/**
 * ContractStatus - 合約狀態（英文）
 */
export type ContractStatus =
  | 'pending' // 未簽署
  | 'partial' // 部分簽署
  | 'signed' // 已簽署

/**
 * ContractTemplate - 合約範本類型
 */
export type ContractTemplate =
  | 'domestic' // 國內旅遊定型化契約（1120908修訂版）
  | 'international' // 國外旅遊定型化契約（1120908修訂版）
  | 'individual_international' // 國外個別旅遊定型化契約（1120908修訂版）

/**
 * TourServiceType - 團服務類型
 */
export type TourServiceType =
  | 'flight'
  | 'flight_hotel'
  | 'hotel'
  | 'car_service'
  | 'tour_group'
  | 'visa'
  | 'outsource'
  | 'esim'

/**
 * TourCategory - 旅遊團分類
 */
export type TourCategory =
  | 'domestic' // 國內
  | 'international' // 國外
  | 'group' // 團體
  | 'custom' // 客製化
  | 'cruise' // 郵輪
  | 'study' // 遊學

// ============================================
// 旅遊團建立與更新
// ============================================

/**
 * CreateTourData - 建立旅遊團所需資料
 */
export interface CreateTourData {
  code?: string // 可選，由 createStore 自動生成
  name: string
  // tour 類型由 status 欄位區分 template/proposal/official
  days_count?: number | null
  location: string
  departure_date: string | null
  return_date: string | null
  status: TourStatus
  price: number
  selling_price_per_person?: number
  max_participants: number
  contract_status: ContractStatus
  total_revenue: number
  total_cost: number
  profit: number
  quote_id?: string
  quote_cost_structure?: unknown
}

/**
 * UpdateTourData - 更新旅遊團資料
 */
export interface UpdateTourData {
  code?: string
  name?: string
  days_count?: number | null
  location?: string
  departure_date?: string | null
  return_date?: string | null
  status?: TourStatus
  price?: number
  selling_price_per_person?: number
  max_participants?: number
  contract_status?: ContractStatus
  total_revenue?: number
  total_cost?: number
  profit?: number
  quote_id?: string
  quote_cost_structure?: unknown
  // 定價欄位
  selling_prices?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  participant_counts?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } | null
  tier_pricings?: TierPricing[] | null
  accommodation_days?: number | null
}

// ============================================
// 旅遊團查詢與篩選
// ============================================

/**
 * TourFilter - 旅遊團篩選條件
 */
export interface TourFilter {
  status?: TourStatus | TourStatus[]
  category?: TourCategory | TourCategory[]
  destination?: string
  start_date_from?: string
  start_date_to?: string
  is_active?: boolean
  search_term?: string // 搜尋團號或團名
}

/**
 * TourListItem - 旅遊團列表項目（精簡版）
 */
export interface TourListItem {
  id: string
  code: string
  name: string
  days_count?: number | null
  location: string
  departure_date: string | null
  return_date: string | null
  status: TourStatus
  max_participants: number
  price: number
}

// ============================================
// 旅遊團統計
// ============================================

/**
 * TourStats - 旅遊團統計資料
 */
export interface TourStats {
  total_tours: number
  active_tours: number
  completed_tours: number
  cancelled_tours: number
  total_revenue: number
  average_price: number
}
