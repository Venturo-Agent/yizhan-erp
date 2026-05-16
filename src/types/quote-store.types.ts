// ============================
// 報價相關型別定義（Store 版本）
// 這些是 client/store 使用的精簡版（無 BaseEntity）
// 與 @/types/quote.types.ts 的 DAL 版本不同
// ============================

export interface QuoteRegion {
  id: string
  quote_id: string
  country: string // 國家 ID
  country_name: string // 國家名稱
  region?: string // 地區 ID（可選）
  region_name?: string // 地區名稱（可選）
  city: string // 城市 ID
  city_name: string // 城市名稱
  order: number // 順序
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  workspace_id?: string // 工作區 ID
  code?: string // 報價單編號 (Q20250001 或自訂編號如 JP-BASIC)
  quote_type: 'standard' | 'quick' // 報價單類型（standard: 團體報價單, quick: 快速報價單）
  name?: string // 團體名稱（標準報價單必填，快速報價單選填）
  destination?: string // 目的地（向後相容）
  days?: number // 天數（向後相容）
  status: 'draft' | 'proposed' | 'revised' | '待出發' | 'approved' | 'converted' | 'rejected'
  tour_id?: string // 關聯的旅遊團ID
  itinerary_id?: string // 關聯的行程表ID
  converted_to_tour?: boolean // 是否已轉成旅遊團
  is_pinned?: boolean // 是否置頂（範本報價單）
  is_active?: boolean // 是否啟用
  regions?: QuoteRegion[] // 多地區支援（新）

  // 客戶資訊
  customer_name?: string // 客戶名稱
  contact_phone?: string // 聯絡電話（標準報價單）

  // 快速報價單專用欄位
  contact_address?: string // 通訊地址（快速報價單用）
  tour_code?: string // 團體編號（快速報價單用）
  handler_name?: string // 承辦業務（快速報價單用）
  created_by?: string // 建立人 ID
  created_by_name?: string // 建立人姓名（冗餘欄位，便於顯示）
  issue_date?: string // 開單日期（快速報價單用）
  received_amount?: number // 已收金額（快速報價單用）
  balance_amount?: number // 應收餘額（快速報價單用，自動計算）
  quick_quote_items?: QuickQuoteItem[] // 快速報價單的收費明細項目（JSONB 欄位）

  // 需求資訊
  group_size?: number // 團體人數（向下相容：總人數）
  accommodation_days?: number // 住宿天數
  valid_until?: string // 報價有效期

  // 多身份人數統計
  participant_counts?: {
    adult: number // 成人（雙人房）
    child_with_bed: number // 小朋友（佔床）
    child_no_bed: number // 不佔床
    single_room: number // 單人房
    infant: number // 嬰兒
  }

  // 多身份售價
  selling_prices?: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  }

  categories?: QuoteCategory[] // 費用分類（標準報價單用）- 臨時編輯狀態
  total_cost?: number // 總成本
  total_amount?: number // 總金額
  tier_pricings?: TierPricing[] // 檻次表（不同人數對應不同價格）
  expense_description?: string // 費用說明（快速報價單用）
  created_at: string
  updated_at: string

  // 確認相關欄位（雙軌確認機制）
  confirmation_status?: 'draft' | 'pending' | 'customer_confirmed' | 'staff_confirmed' | 'closed'
  confirmation_token?: string // 客戶確認連結 token
  confirmation_token_expires_at?: string // token 過期時間
  confirmed_at?: string // 確認時間
  confirmed_by_type?: 'customer' | 'staff' // 確認者類型
  confirmed_by_name?: string // 確認者姓名
  confirmed_by_email?: string // 確認者 Email
  confirmed_by_phone?: string // 確認者電話
  confirmed_by_staff_id?: string // 業務確認者 ID
  confirmation_ip?: string // 確認時 IP（稽核用）
  confirmation_user_agent?: string // 確認時瀏覽器資訊（稽核用）
  confirmation_notes?: string // 確認備註
}

/**
 * QuickQuoteItem - 快速報價單項目
 */
export interface QuickQuoteItem {
  id: string
  description: string // 摘要
  quantity: number // 數量
  cost?: number // 成本（編輯時可選填，列印時隱藏）
  unit_price: number // 單價
  amount: number // 金額（quantity * unit_price）
  notes: string // 備註
  // === Excel 式公式儲存（顯示計算結果，點擊顯示公式）===
  quantity_formula?: string // 數量公式（如 "10+5"）
  cost_formula?: string // 成本公式
  unit_price_formula?: string // 單價公式
}

export interface QuoteCategory {
  id: string
  name: string
  items: QuoteItem[]
  total: number
}

export interface QuoteItem {
  id: string
  name: string
  quantity: number | null
  unit_price: number | null
  total: number
  notes?: string
  day?: number // 住宿專用：第幾天
  room_type?: string // 住宿專用：房型名稱
  is_group_cost?: boolean // 交通和領隊導遊專用：團體分攤
  // 多身份計價：機票專用
  pricing_type?: 'uniform' | 'by_identity' // uniform: 統一價格, by_identity: 依身份計價
  adult_price?: number | null // 成人價
  child_price?: number | null // 小朋友價
  infant_price?: number | null // 嬰兒價
  created_at?: string // 可選，向後相容
  updated_at?: string // 可選，向後相容
}

// 檻次表價格（用於比較不同人數的報價）
export interface TierPricing {
  id: string // 唯一識別
  participant_count: number // 總人數（用於重新計算成本）
  participant_counts: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } // 各身份人數分布
  identity_costs: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } // 重新計算的各身份成本
  selling_prices: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } // 各身份售價
  identity_profits: {
    adult: number
    child_with_bed: number
    child_no_bed: number
    single_room: number
    infant: number
  } // 各身份利潤
}
