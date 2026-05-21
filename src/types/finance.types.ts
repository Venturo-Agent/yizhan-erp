// ============================
// 財務相關型別定義
// ============================

// === 請款單管理系統 ===

// 請款類別
export type PaymentRequestCategory = 'tour' | 'company'

// 公司費用類型代碼（給 generate_company_payment_request_code RPC prefix 用）
// 2026-05-21 Phase 3：union 改 string、code 真值由 DB expense_categories.code 控制
// 例：SAL（薪資）/ BNS（獎金）/ ENT（交際費）/ TRV（差旅費）/ OFC（辦公費）/ UTL（水電費）/ ETC（雜支）
// 之後若要砍此 type、要先確認 PaymentRequest.expense_type 跟相關欄位也清乾淨
export type CompanyExpenseType = string

// === 請款單（當前簡化版 - 符合資料庫實際結構）===
export interface PaymentRequest {
  id: string
  code: string // 請款單編號（由 store 自動生成）
  request_number: string // 請款單號（與 code 同義，向下相容）
  order_id?: string | null // 關聯的訂單ID
  order_number?: string | null // 訂單編號（快照）
  tour_id?: string | null
  tour_code?: string | null // 團號（快照）
  tour_name?: string | null // 團名（快照）
  request_date: string // 請款日期 (YYYY-MM-DD)
  request_type: string // 請款類型（例：員工代墊、供應商支出）
  request_category?: PaymentRequestCategory // 請款類別（團體/公司）
  expense_type?: CompanyExpenseType | null // 公司費用類型（公司請款時使用）
  amount: number // 總金額
  total_amount?: number | null // 總金額（含稅/匯率換算後）
  supplier_id?: string | null
  supplier_name?: string | null
  status?: string | null // pending, confirmed, billed
  is_special_billing?: boolean | null // 是否為特殊出帳
  batch_id?: string | null // 批次 ID：同一批建立的請款單共用此 ID
  notes?: string | null // 備註（統一使用 notes）
  approved_at?: string | null
  approved_by?: string | null
  paid_at?: string | null
  paid_by?: string | null
  payment_method_id?: string | null // 付款方式 ID（關聯 payment_methods 表）
  disbursement_order_id?: string | null // 所屬出納單 FK（1-to-N、SaaS 化標籤式綁定）
  created_by?: string | null // 請款人 ID
  created_by_name?: string | null // 請款人姓名（快照）
  workspace_id?: string
  is_active?: boolean | null // 軟刪除：false = 已刪除（VENTURO_STANDARDS §7）
  created_at: string
  updated_at: string
}

// 請款項目類型（參考 cornerERP 的 INVOICE_ITEM_TYPES）
export type PaymentItemCategory =
  | '匯款' // 匯款（預設選項）
  | '住宿' // 飯店住宿
  | '交通' // 機票、巴士、高鐵等
  | '餐食' // 餐廳、用餐
  | '門票' // 景點門票、活動
  | '導遊' // 導遊小費、領隊費用
  | '保險' // 旅遊平安險
  | '出團款' // 出團預支款項
  | '回團款' // 回團結算款項
  | '員工代墊' // 員工墊付費用
  | 'ESIM' // eSIM 網卡
  | '同業' // 同業分潤
  | '其他' // 其他雜支

export interface PaymentRequestItem {
  id: string
  request_id: string // 所屬請款單ID
  item_number: string // PR000001-A, PR000001-B...
  tour_id?: string | null // 品項關聯的團號（可獨立移動到不同團）
  category: PaymentItemCategory
  supplier_id: string
  supplier_name: string | null // 付款對象名稱（可能是供應商、員工、旅行社）
  description: string
  unit_price: number
  quantity: number
  subtotal: number
  notes?: string // 項目備註
  sort_order: number // 排序
  accounting_subject_id?: string | null // 會計科目 ID（關聯 chart_of_accounts）
  accounting_subject_name?: string | null // 會計科目名稱（顯示用）
  payment_method_id?: string | null // 付款方式 ID（關聯 payment_methods.id）
  custom_request_date?: string | null // 項目獨立請款日期（對應 DB payment_request_items.custom_request_date）
  created_at: string
  updated_at: string
}

// 團體分配項目（用於批量分配）
export interface TourAllocation {
  tour_id: string // 團號ID
  code: string // 團體代碼
  tour_name: string // 團體名稱
  allocated_amount: number // 分配金額
}

// === 出納單管理系統 ===
export interface DisbursementOrder {
  id: string
  order_number: string | null // CD-2024001
  disbursement_date: string | null // 出帳日期 (預設本週四)
  amount: number // 總金額 (自動加總)
  // 實際 UI 流程：pending → paid（按「確認出帳」按鈕、跳過 confirmed）
  // 'confirmed' 是 service.confirmOrder dead code 用的、目前 UI 無人呼叫
  status: string | null // pending | paid（UI 用的）/ confirmed / cancelled
  notes?: string | null // 出納備註
  code?: string | null // 出納單代碼
  created_by?: string | null // 建立者ID
  confirmed_by?: string | null // 確認者ID
  confirmed_at?: string | null // 確認時間
  handled_by?: string | null // 經手人ID
  handled_at?: string | null // 經手時間
  payment_method?: string | null // 付款方式
  paid_at?: string | null // 付款時間
  pdf_url?: string | null // 存檔的 PDF 連結
  workspace_id?: string | null
  created_at: string | null
  updated_at: string | null
}

// === 收款單管理系統 ===
// ⚠️ ReceiptOrder 已廢棄，改用 Receipt（見 ADR-001）
// 保留 interface 供舊程式碼相容，新程式碼請用 Receipt
export interface ReceiptOrder {
  id: string
  receipt_number: string // REC-2024001

  // 分配模式
  allocation_mode: 'single' | 'multiple' // 單一訂單 or 批量分配

  // 單一訂單模式（向下相容）
  order_id?: string // 關聯的訂單ID（allocation_mode = 'single' 時使用）
  order_number?: string // 訂單號碼快照
  tour_id?: string // 團號
  code?: string // 團體代碼
  tour_name?: string // 團體名稱快照
  contact_person?: string // 聯絡人快照

  // 批量分配模式（一筆款分多訂單）
  order_allocations?: OrderAllocation[] // 訂單分配列表（allocation_mode = 'multiple' 時使用）

  // 共用欄位
  receipt_date: string // 收款日期
  payment_items: ReceiptPaymentItem[] // 收款項目
  total_amount: number // 總收款金額
  status: 'received' | 'confirmed' | 'rejected' // 收款狀態
  notes?: string // 收款備註
  created_by: string // 建立者ID
  confirmed_by?: string // 確認者ID
  confirmed_at?: string // 確認時間
  created_at: string
  updated_at: string
}

// 訂單分配項目（用於批量分配）
export interface OrderAllocation {
  order_id: string // 訂單ID
  order_number: string // 訂單號碼
  tour_id: string // 團號
  code: string // 團體代碼
  tour_name: string // 團體名稱
  contact_person: string // 聯絡人
  allocated_amount: number // 分配金額
}

export interface ReceiptPaymentItem {
  id: string
  receipt_id: string // 所屬收款單ID
  payment_method: 'cash' | 'transfer' | 'card' | 'check' // 收款方式
  amount: number // 金額
  account_info?: string // 帳戶資訊 (匯款用)
  card_last_four?: string // 卡號後四碼 (刷卡用)
  auth_code?: string // 授權碼 (刷卡用)
  check_number?: string // 支票號碼
  check_bank?: string // 支票銀行
  check_due_date?: string // 支票到期日
  transaction_date: string // 交易日期
  handler_name?: string // 經手人 (現金用)
  fees?: number // 手續費
  notes?: string // 備註
  created_at: string
  updated_at: string
}

// 代辦商成本記錄（記住每個代辦商的各類型簽證成本）
export interface VendorCost {
  id: string
  vendor_name: string // 代辦商名稱
  visa_type: string // 簽證類型（護照 成人、台胞證等）
  cost: number // 成本價格
  created_at: string
  updated_at: string
}
