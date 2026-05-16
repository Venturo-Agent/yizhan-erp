/**
 * /pay/[token] 公開付款頁 — 型別與常數
 */

export const LABELS = {
  PAGE_TITLE: '團費繳款',
  LOADING: '載入帳單中…',
  GREETING: '以下是本團應付帳單清單、您可勾選要代付的成員：',
  TOUR_NAME: '團名',
  DEPARTURE_DATE: '出發日',
  TOTAL_AMOUNT: '本團應收',
  PAID_AMOUNT: '已收(已確認)',
  REMAINING: '尚未收款',
  BANK_INFO_TITLE: '公司收款帳號',
  BANK_LABEL: '銀行',
  BRANCH_LABEL: '分行',
  ACCOUNT_LABEL: '帳號',
  ACCOUNT_NAME_LABEL: '抬頭',
  MEMBERS_TITLE: '團員應付明細',
  HISTORY_TITLE: '歷次付款',
  STATUS_CONFIRMED: '已確認',
  STATUS_PENDING: '待確認',
  STATUS_REJECTED: '已退回',
  STATUS_PAID_OFF: '✓ 已付清',
  PAY_BUTTON_PREFIX: '我要代付',
  PAY_BUTTON_SUFFIX: '人',
  ALL_PAID: '✓ 全團已付清',
  FORM_TITLE: '填寫付款資訊',
  FORM_PAY_METHOD: '收款方式',
  FORM_IDENTIFIER: '識別碼',
  FORM_DATE: '匯款 / 付款日期',
  FORM_NOTES: '備註(選填)',
  FORM_AMOUNT: '應付金額',
  FORM_NOTES_PLACEHOLDER: '譬如：這次先付定金 / 我幫某某某一起付 / 從某銀行匯',
  FORM_CANCEL: '取消',
  FORM_SUBMIT: '送出',
  FORM_SUBMITTING: '送出中…',
  SUBMIT_SUCCESS: '已收到您的付款資訊、會計核對中、約 1-2 工作日完成',
  ERR_NO_SELECTION: '請先勾選要代付的成員',
  ERR_IDENTIFIER_FORMAT: '請填正確的識別碼(4-20 碼數字)',
  ERR_DATE_FUTURE: '日期不能在未來',
  ERR_NO_METHOD: '請選擇收款方式',
  ERR_SUBMIT_FAILED: '送出失敗',
  ERR_NETWORK: '網路錯誤、請稍後再試',
  ERR_LOAD_FAILED_TITLE: '無法載入帳單',
  ERR_INVOICE_NOT_FOUND: '帳單不存在',
  IDENTIFIER_DEFAULT: '匯款後五碼',
  NO_RECEIPTS: '尚無付款紀錄',
  NO_BANK_INFO: '公司尚未設定收款帳號、請聯絡業務員',
  NO_PAYMENT_METHODS: '公司尚未設定收款方式',
}

export interface InvoiceItem {
  id: string
  member_name: string
  customer_name: string
  total_amount: number
  paid_amount: number
  remaining: number
  status: string
  notes: string | null
}

export interface PaymentMethodOption {
  id: string
  name: string
  code: string
  kind: string | null
  description: string | null
  placeholder: string | null
}

export interface ReceiptRowData {
  id: string
  receipt_amount: number
  actual_amount: number
  status: string
  payment_method: string | null
  bank_account_last5: string | null
  payment_date: string | null
  notes: string | null
  rejected_reason: string | null
  created_at: string
  verified_at: string | null
  paid_for: string[]
}

export interface BatchData {
  batch: {
    id: string
    status: string
    token_expires_at: string
    notes: string | null
    total_amount: number
    paid_amount: number
    remaining: number
  }
  invoices: InvoiceItem[]
  tour: { name: string; code: string; departure_date: string | null } | null
  workspace: {
    name: string
    logo_url: string | null
    bank: {
      bank_name: string | null
      bank_code: string | null
      branch: string | null
      account: string | null
      account_name: string | null
    } | null
  } | null
  payment_methods: PaymentMethodOption[]
  receipts: ReceiptRowData[]
}
