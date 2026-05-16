/**
 * 報價單相關型別定義
 */

import { BaseEntity } from './base.types'

// ============================================
// 報價單介面
// ============================================

/**
 * Quote - 報價單
 */
export interface Quote extends BaseEntity {
  code: string // 報價單編號
  quote_type: QuoteType // 報價單類型
  customer_id?: string // 客戶 ID
  customer_name: string // 客戶姓名（必填）
  customer_email?: string // 客戶電郵
  customer_phone?: string // 客戶電話
  name?: string // 報價單名稱
  destination?: string // 目的地
  start_date?: string // 出發日期 (ISO 8601)
  end_date?: string // 結束日期 (ISO 8601)
  days?: number // 天數
  nights?: number // 夜數
  number_of_people?: number // 人數
  group_size?: number // 團體人數（與 number_of_people 同義，保留向後相容）
  adult_count?: number // 成人數
  child_count?: number // 兒童數
  infant_count?: number // 嬰兒數
  accommodation_days?: number // 住宿天數
  status?: string // 報價狀態
  total_amount?: number // 總金額
  total_cost?: number // 總成本
  valid_until?: string // 有效期限 (ISO 8601)
  notes?: string // 備註
  is_active?: boolean // 是否啟用
  created_by?: string // 建立人 ID
  created_by_name?: string // 建立人姓名（冗餘欄位）
  converted_to_tour?: boolean // 是否已轉成旅遊團
  tour_id?: string // 轉換後的旅遊團 ID
  itinerary_id?: string // 連結的行程表 ID
  is_pinned?: boolean // 是否置頂（範本報價單）

  // 快速報價單專用欄位
  contact_phone?: string // 聯絡電話（快速報價單用）
  contact_address?: string // 通訊地址（快速報價單用）
  tour_code?: string // 團體編號（快速報價單用）
  handler_name?: string // 承辦業務（快速報價單用）
  issue_date?: string // 開單日期（快速報價單用）
  expense_description?: string // 費用說明（快速報價單用）
  received_amount?: number // 已收金額
  balance_amount?: number // 應收餘額（自動計算）
  quick_quote_items?: QuickQuoteItem[] // 快速報價單的收費明細項目

  // 擴展欄位（用於詳細頁）
  categories?: QuoteCategory[] // 報價分類（臨時編輯狀態）
  participant_counts?: Record<string, number> // 參與人數統計
  selling_prices?: Record<string, number> // 銷售價格

  // 確認相關欄位（雙軌確認機制）
  confirmation_status?: QuoteConfirmationStatus // 確認狀態
  confirmation_token?: string // 客戶確認連結 token
  confirmation_token_expires_at?: string // token 過期時間
  confirmed_at?: string // 確認時間
  confirmed_by_type?: QuoteConfirmedByType // 確認者類型
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

/**
 * QuoteCategory - 報價分類
 */
export interface QuoteCategory extends BaseEntity {
  quote_id: string // 報價單 ID
  name: string // 分類名稱
  order: number // 排序
  is_active: boolean // 是否啟用
}

/**
 * QuoteItem - 報價項目
 */
export interface QuoteItem extends BaseEntity {
  quote_id: string // 報價單 ID
  category_id?: string // 分類 ID
  category_name?: string // 分類名稱（冗餘欄位）
  type: QuoteItemType // 項目類型
  name: string // 項目名稱
  description?: string // 說明
  quantity: number // 數量
  unit_price: number // 單價
  total_price: number // 總價
  order: number // 排序
  notes?: string // 備註
  is_optional: boolean // 是否為選配
  is_active: boolean // 是否啟用
}

// ============================================
// 報價單狀態與類型
// ============================================

/**
 * QuoteType - 報價單類型
 * 葡萄串模型：docs/QUOTES_SSOT.md
 */
export type QuoteType =
  | 'standard' // 團體報價單（完整方案，0 或 1 張/團）
  | 'quick' // 快速報價單（收訂金、尾款、雜項收款，0~N 張/團）

/**
 * QuoteStatus - 報價狀態
 */
export type QuoteStatus =
  | 'draft' // 草稿
  | 'sent' // 已寄出
  | 'accepted' // 已接受
  | 'rejected' // 已拒絕
  | 'expired' // 已過期
  | 'converted' // 已轉單
  | 'proposed' // 提案
  | 'revised' // 修改中
  | 'approved' // 已核准

/**
 * QuoteConfirmationStatus - 報價確認狀態（雙軌制）
 */
export type QuoteConfirmationStatus =
  | 'draft' // 草稿（尚未發送確認）
  | 'pending' // 待客戶確認（已發送確認連結）
  | 'customer_confirmed' // 客戶已確認
  | 'staff_confirmed' // 業務已確認（手動確認）
  | 'closed' // 已成交（轉訂單）

/**
 * QuoteConfirmedByType - 確認者類型
 */
export type QuoteConfirmedByType = 'customer' | 'staff'

/**
 * QuoteItemType - 報價項目類型
 */
export type QuoteItemType =
  | 'accommodation' // 住宿
  | 'transportation' // 交通
  | 'meals' // 餐食
  | 'tickets' // 門票
  | 'insurance' // 保險
  | 'guide' // 導遊

  | 'shopping' // 購物
  | 'activity' // 活動
  | 'other' // 其他

// ============================================
// 報價單建立與更新
// ============================================

/**
 * CreateQuoteData - 建立報價單
 */
export interface CreateQuoteData {
  code: string
  quote_type: QuoteType
  customer_id?: string
  customer_name?: string
  destination?: string
  start_date?: string
  end_date?: string
  days?: number
  nights?: number
  number_of_people?: number
  status: QuoteStatus
  total_amount?: number
  valid_until?: string
  notes?: string
  is_active: boolean
  // 快速報價單專用
  contact_phone?: string
  contact_address?: string
  tour_code?: string
  handler_name?: string
  issue_date?: string
  received_amount?: number
}

/**
 * UpdateQuoteData - 更新報價單
 */
export interface UpdateQuoteData {
  quote_type?: QuoteType
  customer_id?: string
  customer_name?: string
  destination?: string
  start_date?: string
  end_date?: string
  days?: number
  nights?: number
  number_of_people?: number
  status?: QuoteStatus
  total_amount?: number
  valid_until?: string
  notes?: string
  is_active?: boolean
  converted_to_tour?: boolean
  tour_id?: string
  // 快速報價單專用
  contact_phone?: string
  contact_address?: string
  tour_code?: string
  handler_name?: string
  issue_date?: string
  received_amount?: number
}

/**
 * CreateQuoteItemData - 建立報價項目
 */
export interface CreateQuoteItemData {
  quote_id: string
  category_id?: string
  type: QuoteItemType
  name: string
  description?: string
  quantity: number
  unit_price: number
  total_price: number
  order: number
  notes?: string
  is_optional: boolean
  is_active: boolean
}

/**
 * UpdateQuoteItemData - 更新報價項目
 */
export interface UpdateQuoteItemData {
  category_id?: string
  type?: QuoteItemType
  name?: string
  description?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  order?: number
  notes?: string
  is_optional?: boolean
  is_active?: boolean
}

// ============================================
// 報價單查詢與篩選
// ============================================

/**
 * QuoteFilter - 報價單篩選條件
 */
export interface QuoteFilter {
  customer_id?: string
  status?: QuoteStatus | QuoteStatus[]
  destination?: string
  start_date_from?: string
  start_date_to?: string
  is_active?: boolean
  search_term?: string // 搜尋報價單編號、客戶姓名
}

/**
 * QuoteListItem - 報價單列表項目（精簡版）
 */
export interface QuoteListItem {
  id: string
  code: string
  customer_name?: string
  destination: string
  start_date: string
  end_date: string
  number_of_people: number
  status: QuoteStatus
  total_amount: number
  valid_until?: string
  converted_to_tour?: boolean
  created_at: string
}

// ============================================
// 報價單統計
// ============================================

/**
 * QuoteStats - 報價單統計資料
 */
export interface QuoteStats {
  total_quotes: number
  draft_quotes: number
  sent_quotes: number
  accepted_quotes: number
  rejected_quotes: number
  converted_quotes: number
  conversion_rate: number // 轉換率（百分比）
  total_quoted_amount: number
  average_quote_amount: number
}

// 報價確認相關 type 已隨 Stage 1-3 砍掉、之後重寫
// 保留：QuoteConfirmationStatus / QuoteConfirmedByType（DB column 還在、Quote interface 引用）
// 砍掉：QuoteConfirmationLogAction / QuoteConfirmationLog / SendConfirmationLinkParams / CustomerConfirmParams / StaffConfirmParams / ConfirmationResult（純 API 用、API 已刪）
