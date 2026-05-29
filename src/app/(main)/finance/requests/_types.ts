import { PaymentRequestItem } from '@/stores/types'
import { PaymentRequestCategory, CompanyExpenseType } from '@/stores/types/finance.types'

export interface RequestFormData {
  request_category: PaymentRequestCategory // 請款類別（團體/公司）
  tour_id: string // 團體請款使用
  order_id: string // 團體請款使用
  /**
   * 公司請款使用（舊欄位、過渡期保留 — 改為從 expense_category_id 推導）
   * 寫入時雙寫；顯示時優先 expense_category_id
   */
  expense_type: CompanyExpenseType | ''
  /**
   * 公司請款使用（新欄位、2026-05-21）
   * 對應 expense_categories.id (type='company_expense')
   */
  expense_category_id?: string
  request_date: string
  notes: string
  is_special_billing: boolean
  created_by?: string
  payment_method_id?: string // 付款方式（用於傳票）
}

export interface BatchRequestFormData {
  request_date: string
  notes: string
  is_special_billing: boolean
  created_by?: string
  payment_method_id?: string
}

export interface RequestItem {
  id: string
  custom_request_date: string // 請款日期（每項目獨立、對應 DB payment_request_items.custom_request_date）
  payment_method_id?: string // 付款方式（每項目獨立）
  /**
   * 類別文字（過渡期保留、給舊資料 fallback 顯示用）
   * 新資料寫入時：團體請款 = expense_categories.name；公司請款 = ''（用 category_id 即可）
   */
  category: PaymentRequestItem['category']
  /**
   * 類別 ID（新欄位、2026-05-21 起寫入皆帶）
   * - 團體請款 item：對應 expense_categories.id (type IN ('expense','both'))
   * - 公司請款 item：對應 expense_categories.id (type='company_expense')
   */
  category_id?: string | null
  supplier_id: string
  supplierName: string | null
  description: string
  unit_price: number
  quantity: number
  confirmation_item_id?: string | null // 關聯的確認單項目 ID
  is_employee?: boolean // 標記此項目對象是員工（存檔時 supplier_id 設空避免 FK 衝突）
  selected_id?: string // Combobox 顯示用的選中 ID（員工或供應商皆存）
  advanced_by?: string // 代墊員工 ID
  advanced_by_name?: string // 代墊員工姓名
  accounting_subject_id?: string | null // 會計科目 ID
  accounting_subject_name?: string | null // 會計科目名稱（顯示用）
}

// 2026-05-15 William 拍板：請款單 3 狀態（pending=未付款 / confirmed=待付款 / paid=已付款）
// label / color 走 SSOT：src/lib/status/ STATUS_LABEL_MAP.payment_request（2026-05-29 B7 收斂）
export type PaymentRequestStatus = 'pending' | 'confirmed' | 'paid'

// 2026-05-21 Phase 2：寫死 categoryOptions 已退休。
// 類別資料 SSOT = DB 表 expense_categories（read via useExpenseCategories）。
// 過渡期保留 RequestItem.category 文字欄位給舊資料 fallback、新寫入用 category_id。
