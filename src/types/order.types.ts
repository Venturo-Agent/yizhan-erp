/**
 * 訂單相關型別定義
 */

import { BaseEntity } from './base.types'

// ============================================
// 訂單介面
// ============================================

/**
 * Order - 訂單資料
 * 注意：所有可選欄位使用 | null 以符合 Supabase PostgreSQL 規範
 */
export interface Order extends BaseEntity {
  order_number: string | null // 訂單編號（相容舊欄位：code）
  code: string // 團號代碼
  tour_id: string | null // 旅遊團 ID
  tour_name: string | null // 旅遊團名稱
  customer_id?: string | null // 客戶 ID（可選）
  contact_person: string // 聯絡人
  contact_phone?: string | null // 聯絡電話（可選）
  contact_email?: string | null // 聯絡 Email
  adult_count?: number | null // 成人人數
  child_count?: number | null // 兒童人數
  infant_count?: number | null // 嬰兒人數
  sales_person: string | null // 業務人員（text 字串、fallback 顯示用、match 不到員工的歷史單）
  sales_id?: string | null // 業務員工 FK → employees(id)、5/13 加、新單必寫
  // 助理（assistant / assistant_id）：5/24 助理職務整套移除、code 不再讀寫。
  //   DB 欄位暫留歷史紀錄（40+ 舊單有值）、待 William 確認後 drop。
  member_count: number | null // 團員人數
  payment_status: PaymentStatus | null // 付款狀態
  status?: OrderStatus | null // 訂單狀態
  total_amount: number // 總金額
  paid_amount: number // 已付金額
  remaining_amount: number // 待付金額
  notes?: string | null // 備註
  is_active?: boolean | null // 是否啟用
  identity_options?: unknown // 身份選項（JSONB）
}

// ============================================
// 團員介面
// ============================================

/**
 * Member - 團員資料
 * 注意：所有可選欄位使用 | null 以符合 Supabase PostgreSQL 規範
 */
export interface Member extends BaseEntity {
  order_id: string // 訂單 ID
  chinese_name: string | null // 中文姓名（標準欄位）
  birth_date: string | null // 出生日期（標準欄位）YYYY-MM-DD
  passport_number: string | null // 護照號碼
  passport_name: string | null // 護照姓名/拼音（標準欄位）
  passport_expiry: string | null // 護照到期日 YYYY-MM-DD
  id_number: string | null // 身分證字號
  gender: string | null // 性別
  age?: number | null // 年齡（可計算，前端使用）
  phone?: string | null // 電話
  email?: string | null // Email
  emergency_contact?: string | null // 緊急聯絡人
  emergency_phone?: string | null // 緊急聯絡電話
  dietary_restrictions?: string | null // 飲食限制
  medical_conditions?: string | null // 醫療狀況
  room_preference?: string | null // 房間偏好
  assigned_room?: string | null // 分配的房間
  is_child_no_bed?: boolean | null // 小孩不佔床
  reservation_code?: string | null // 訂位代號
  add_ons?: string[] | null // 加購項目IDs
  refunds?: string[] | null // 退費項目IDs
  notes?: string | null // 備註
  contract_created_at?: string | null // 合約建立時間
}

// ============================================
// 訂單狀態
// ============================================

/**
 * OrderStatus - 訂單狀態（GDS 碼）
 * pending_review = 待處理（AI/官網進來未接手）
 * hk = Holds Confirmed，訂好位等開票
 * kk = Confirming，開票完成
 * hl = Have Waitlisted，候補中（預留）
 * lk = Waitlist Link，候補成功未處理（預留）
 */
export type OrderStatus =
  | 'pending_review'
  | 'hk'
  | 'kk'
  | 'hl'
  | 'lk'

/**
 * PaymentStatus - 付款狀態
 */
export type PaymentStatus =
  | 'unpaid' // 未付款
  | 'partial' // 部分付款
  | 'paid' // 已付清
  | 'refunded' // 已退款

/**
 * Gender - 性別
 */
export type Gender = 'male' | 'female' | 'other'

/**
 * AgeCategory - 年齡分類
 */
export type AgeCategory =
  | 'adult' // 成人
  | 'child' // 兒童
  | 'infant' // 嬰兒

/**
 * RoomType - 房型
 */
export type RoomType =
  | 'single' // 單人房
  | 'double' // 雙人房
  | 'twin' // 雙床房
  | 'triple' // 三人房
  | 'quad' // 四人房

// ============================================
// 訂單建立與更新
// ============================================

/**
 * CreateOrderData - 建立訂單所需資料
 */
export interface CreateOrderData {
  code: string
  tour_id: string
  customer_id: string
  contact_person: string
  contact_phone: string
  contact_email?: string
  status: OrderStatus
  payment_status: PaymentStatus
  total_amount: number
  paid_amount: number
  number_of_people: number
  adult_count: number
  child_count: number
  infant_count: number
  notes?: string
  special_requests?: string
  is_active: boolean
}

/**
 * UpdateOrderData - 更新訂單資料
 */
export interface UpdateOrderData {
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  status?: OrderStatus
  payment_status?: PaymentStatus
  total_amount?: number
  paid_amount?: number
  number_of_people?: number
  adult_count?: number
  child_count?: number
  infant_count?: number
  notes?: string
  special_requests?: string
  is_active?: boolean
}

/**
 * CreateMemberData - 建立團員所需資料
 */
export interface CreateMemberData {
  order_id: string
  chinese_name: string // 中文姓名（標準欄位）
  gender: Gender
  birth_date: string // 出生日期（標準欄位）
  member_type: string // adult/child/infant
  id_number?: string
  passport_number?: string
  passport_name?: string // 護照姓名（標準欄位）
  passport_expiry?: string
  phone?: string
  email?: string
  emergency_contact?: string
  emergency_phone?: string
  dietary_restrictions?: string
  medical_conditions?: string
  room_type?: RoomType
  room_mate_id?: string
  seat_preference?: string
  notes?: string
}

/**
 * UpdateMemberData - 更新團員資料
 */
export interface UpdateMemberData {
  chinese_name?: string // 中文姓名（標準欄位）
  gender?: Gender
  birth_date?: string // 出生日期（標準欄位）
  member_type?: string
  id_number?: string
  passport_number?: string
  passport_name?: string // 護照姓名（標準欄位）
  passport_expiry?: string
  phone?: string
  email?: string
  emergency_contact?: string
  emergency_phone?: string
  dietary_restrictions?: string
  medical_conditions?: string
  room_type?: RoomType
  room_mate_id?: string
  seat_preference?: string
  notes?: string
}

// ============================================
// 訂單查詢與篩選
// ============================================

/**
 * OrderFilter - 訂單篩選條件
 */
export interface OrderFilter {
  tour_id?: string
  customer_id?: string
  status?: OrderStatus | OrderStatus[]
  payment_status?: PaymentStatus | PaymentStatus[]
  date_from?: string
  date_to?: string
  search_term?: string // 搜尋訂單編號、聯絡人
}

/**
 * OrderListItem - 訂單列表項目（精簡版）
 */
export interface OrderListItem {
  id: string
  code: string
  tour_code?: string
  tour_name?: string
  customer_name?: string
  contact_person: string
  contact_phone: string
  status: OrderStatus
  payment_status: PaymentStatus
  total_amount: number
  paid_amount: number
  number_of_people: number
  created_at: string
}

// ============================================
// 訂單統計
// ============================================

/**
 * OrderStats - 訂單統計資料
 */
export interface OrderStats {
  total_orders: number
  confirmed_orders: number
  pending_orders: number
  cancelled_orders: number
  total_revenue: number
  total_paid: number
  total_remaining: number
  total_people: number
}
