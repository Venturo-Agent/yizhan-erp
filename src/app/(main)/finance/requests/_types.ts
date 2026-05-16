import { PaymentRequestItem } from '@/stores/types'
import { PaymentRequestCategory, CompanyExpenseType } from '@/stores/types/finance.types'

export interface RequestFormData {
  request_category: PaymentRequestCategory // 請款類別（團體/公司）
  tour_id: string // 團體請款使用
  order_id: string // 團體請款使用
  expense_type: CompanyExpenseType | '' // 公司請款使用
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
  category: PaymentRequestItem['category']
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
// label / color 走 SSOT：src/lib/design/status-tone-map.ts STATUS_LABEL_MAP.payment_request
export type PaymentRequestStatus = 'pending' | 'confirmed' | 'paid'

export const categoryOptions = [
  { value: '住宿', label: '住宿' },
  { value: '交通', label: '交通' },
  { value: '餐食', label: '餐食' },
  { value: '活動', label: '活動' },
  { value: '導遊', label: '導遊' },
  { value: '保險', label: '保險' },
  { value: '出團款', label: '出團款' },
  { value: '回團款', label: '回團款' },
  { value: '員工代墊', label: '員工代墊' },
  { value: '同業', label: '同業' },
  { value: '其他', label: '其他' },
] as const
