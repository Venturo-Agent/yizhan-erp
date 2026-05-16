/**
 * 旅遊團團員相關型別定義
 */

export interface Member {
  id: string
  order_id: string
  // 基本資料
  chinese_name: string | null // 中文姓名
  passport_name: string | null // 護照拼音
  name?: string // 向下相容
  name_en?: string // 向下相容（拼音）
  birth_date: string | null // YYYY-MM-DD

  passport_number: string | null
  passport_expiry: string | null // YYYY-MM-DD
  id_number: string | null // 身分證字號
  gender: 'M' | 'F' | '' | null // 性別
  age: number | null // 年齡
  member_type: string // 成員類型
  identity: string | null // 身份（主要聯絡人等）

  // 餐食與健康
  special_meal: string | null // 特殊餐食需求

  // 訂位與航班
  pnr: string | null // 訂位代號
  reservation_code?: string // 向下相容

  // 住宿資訊
  hotel_1_name: string | null
  hotel_1_checkin: string | null
  hotel_1_checkout: string | null
  hotel_2_name: string | null
  hotel_2_checkin: string | null
  hotel_2_checkout: string | null
  assigned_room?: string // 向下相容

  // 報到資訊
  checked_in: boolean | null // 是否已報到
  checked_in_at: string | null // 報到時間

  // 財務資訊
  cost_price: number | null // 成本價
  selling_price: number | null // 售價
  flight_cost: number | null // 機票成本
  transport_cost: number | null // 交通成本
  misc_cost: number | null // 雜費
  total_payable: number | null // 應付總額
  profit: number | null // 利潤
  deposit_amount: number | null // 訂金
  deposit_receipt_no: string | null // 訂金收據號
  balance_amount: number | null // 尾款
  balance_receipt_no: string | null // 尾款收據號

  // 關聯
  customer_id: string | null

  // 機票相關
  ticket_number: string | null // 機票號碼
  ticketing_deadline: string | null // 開票截止日
  flight_self_arranged: boolean | null // 自理機票

  // 護照列印
  passport_name_print: string | null // 護照姓名列印格式（行李吊牌用）

  // 排序
  sort_order: number | null // 排序順序

  // 其他
  is_child_no_bed?: boolean // 小孩不佔床
  add_ons?: string[] // 加購項目IDs
  refunds?: string[] // 退費項目IDs
  custom_fields?: Record<string, unknown> // 自定義欄位數據 {fieldId: value}
  passport_image_url?: string | null // 護照照片 URL
  created_at: string | null
  updated_at: string | null // BaseEntity 相容（DB order_members 表無此欄位，由 trigger 或前端填入）
}

export interface TourAddOn {
  id: string
  tour_id: string
  name: string
  price: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
