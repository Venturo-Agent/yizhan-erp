/**
 * 供應商管理類型定義
 * 整理後的架構：
 * - Supplier：供應商基本資料（財務用）
 * - SupplierServiceArea：供應商服務區域（多對多）
 * - CostTemplate：成本模板（報價用）
 */

import type { BaseEntity } from './base.types'

// ============================================
// 供應商基本資料（財務用）
// ============================================

export interface Supplier extends BaseEntity {
  name: string
  english_name?: string | null // 英文名稱（標準欄位）
  code?: string | null // 供應商代碼（會計用）
  supplier_type_code: SupplierType // 對齊 DB schema（5/13 黒羽改名、原 type 鎖死）

  // 地區關聯（保留主要國家）
  country_id?: string | null

  // 聯絡資訊
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  website?: string | null

  // 財務資訊
  tax_id?: string | null // 統編
  is_domestic?: boolean // 國內/國外（onboarding fix pack 2026-05-10）
  bank_name?: string | null
  bank_branch?: string | null // 分行
  bank_code?: string | null // 銀行代碼（FK to ref_banks、is_domestic=true 用）
  swift_code?: string | null // SWIFT（is_domestic=false 用）
  bank_account_name?: string | null // 戶名
  bank_account?: string | null
  payment_terms?: string | null // 付款條件
  currency?: string | null

  // 評級
  rating?: number | null // 1-5

  // 狀態
  is_preferred?: boolean // 是否為優先供應商
  is_active?: boolean
  display_order?: number

  // 備註
  notes?: string | null

  // 使用次數（5/13 加、payment_request_items 出現次數、AFTER trigger 維護）
  usage_count?: number | null

  // 審計欄位
  created_by?: string | null
  updated_by?: string | null
}

export type SupplierType =
  | 'hotel' // 飯店
  | 'restaurant' // 餐廳
  | 'transport' // 交通
  | 'attraction' // 景點
  | 'guide' // 導遊
  | 'agency' // 旅行社
  | 'ticketing' // 票務
  | 'employee' // 員工（領隊/導遊薪資請款用）
  | 'other' // 其他

// ============================================
// 供應商服務區域（多對多關聯）
// ============================================

export interface SupplierServiceArea extends BaseEntity {
  supplier_id: string
  city_id: string
  created_by?: string | null
}

// ============================================
// 成本模板（報價用）
// ============================================

export interface CostTemplate extends BaseEntity {
  // 關聯
  supplier_id: string
  city_id: string
  attraction_id?: string | null // 可選：關聯景點

  // 分類
  category: CostCategory

  // 項目資訊
  item_name: string
  item_name_en?: string | null
  description?: string | null

  // 價格
  cost_price: number // 成本價
  selling_price?: number | null // 建議售價
  currency: string // 幣別

  // 計價單位
  unit: PriceUnit
  min_quantity?: number | null
  max_quantity?: number | null

  // 有效期
  valid_from?: string | null // DATE
  valid_until?: string | null // DATE

  // 季節
  season?: Season | null

  // 其他資訊
  duration_minutes?: number | null
  capacity?: number | null
  notes?: string | null

  // 🚗 交通服務專用欄位
  vehicle_type?: string | null // 車型：4人車、7人車、16人車、VIP車
  trip_type?: string | null // 行程類型：單程、往返
  route_origin?: string | null // 起點：市區飯店、峴港機場
  route_destination?: string | null // 終點：會安、巴拿山
  base_distance_km?: number | null // 基本公里數
  base_hours?: number | null // 基本時數
  overtime_rate?: number | null // 超時費率（每小時）
  extra_km_rate?: number | null // 超公里費率（每公里）

  // 管理
  is_active?: boolean
  display_order?: number

  // 審計欄位
  created_by?: string | null
  updated_by?: string | null
}

export type CostCategory =
  | 'accommodation' // 住宿
  | 'meal' // 餐食
  | 'transport' // 交通
  | 'ticket' // 門票
  | 'guide' // 導覽
  | 'other' // 其他

export type PriceUnit =
  | 'per_night' // 每晚
  | 'per_person' // 每人
  | 'per_vehicle' // 每車
  | 'per_group' // 每團
  | 'per_item' // 每項

export type Season =
  | 'low' // 淡季
  | 'high' // 旺季
  | 'peak' // 尖峰
  | 'holiday' // 假期

// ============================================
// 擴展型別（含關聯資料）
// ============================================

export interface SupplierWithServiceAreas extends Supplier {
  service_areas?: SupplierServiceArea[]
  cities?: { id: string; name: string }[]
}

export interface CostTemplateWithRelations extends CostTemplate {
  supplier?: Supplier
  city?: { id: string; name: string }
  attraction?: { id: string; name: string }
}

// ============================================
// 表單型別
// ============================================

export type SupplierFormData = Omit<Supplier, keyof BaseEntity> & {
  service_area_ids?: string[] // 服務城市 IDs
}

export type CostTemplateFormData = Omit<CostTemplate, keyof BaseEntity>

// ============================================
// CRUD 型別
// ============================================

export type CreateSupplierData = Omit<Supplier, keyof BaseEntity>
export type UpdateSupplierData = Partial<CreateSupplierData>
export type CreateCostTemplateData = Omit<CostTemplate, keyof BaseEntity>
export type UpdateCostTemplateData = Partial<CreateCostTemplateData>
