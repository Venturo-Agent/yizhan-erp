// Finance module labels
export const FinanceLabels = {
  // Travel Invoice Create Page
  invoiceCreateTitle: '開立新發票',
  basicInfo: '基本資訊',
  issueDate: '開立日期',
  selectDate: '選擇日期',
  taxType: '課稅別',
  selectTaxType: '選擇課稅別',
  dutiable: '應稅',
  zeroRate: '零稅率',
  taxFree: '免稅',
  reportStatus: '申報註記',
  unreported: '未申報',
  reported: '已申報',
  buyerInfo: '買受人資訊',
  buyerName: '買受人名稱',
  buyerNameRequired: '買受人名稱 *',
  enterBuyerName: '請輸入買受人名稱',
  unifiedBusinessNumber: '統一編號',
  ubnPlaceholder: '8 碼數字',
  email: 'Email',
  emailForReceipt: '用於寄送電子收據',
  mobileNumber: '手機號碼',
  mobilePlaceholder: '09xxxxxxxx',
  productDetails: '商品明細',
  summary: '摘要',
  quantity: '數量',
  unitPrice: '單價',
  unit: '單位',
  amount: '金額',
  handle: '處理',
  productName: '商品名稱',
  addRow: '新增一列',
  remarks: '備註',
  remarksPlaceholder: '請輸入備註（限 50 字）',
  remarksNote: '可輸入大小寫英文、中文（限 50 字，不可輸入符號，例如：/ , - = 等）',
  total: '總計',
  cancel: '取消',
  issuing: '開立中...',
  issueInvoice: '開立發票',
  enterBuyerNameError: '請輸入買受人名稱',
  completeProductInfoError: '請完整填寫商品資訊',
  unknownError: '發生未知錯誤',

  // Payments Page
  paymentManagement: '收款管理',
  searchReceiptPlaceholder: '搜尋收款單號、團名...',
  exportExcel: '匯出 Excel',
  batchConfirm: '批量確認',
  batchPayment: '批量收款',
  addPayment: '新增收款',
  receiptNumber: '收款單號',
  receiptDate: '收款日期',
  orderNumber: '收款明細',
  tourName: '團名',
  receiptAmount: '應收金額',
  actualAmount: '實收金額',
  status: '狀態',
  paymentMethod: '收款方式',
  actions: '操作',
  edit: '編輯',
  view: '檢視',
  createReceiptFailedPrefix: '建立收款單失敗',
  createReceiptFailedTitle: '建立收款單失敗',
  // 客戶自助付款對帳(2026-05-14 新增)
  verifyPayment: '確認對帳',
  rejectPayment: '退回',
  verifyConfirmMessage: '確認此筆對帳無誤?確認後將算入已收金額、無法輕易退回',
  rejectPromptMessage: '請填寫退回原因(客戶會看到):',
  rejectPromptTitle: '退回對帳',
  rejectPromptPlaceholder: '例如:金額對不上 / 後五碼找不到 / 已超過繳費期限',
  verifySuccess: '已確認對帳',
  rejectSuccess: '已退回對帳',
  verifyFailed: '確認失敗',
  rejectFailed: '退回失敗',
  networkError: '網路錯誤',
}
export const FINANCE_PAGE_LABELS = {
  FINANCE_REPORTS: '財務報表',
  TREASURY_OVERVIEW: '金庫總覽',
  FINANCE_SETTINGS: '財務設定',
  LOADING_DATA: '正在載入財務資料...',
  TOTAL_INCOME: '總收入',
  TOTAL_EXPENSE: '總支出',
  NET_PROFIT: '淨利潤',
  PENDING_ITEMS: '待確認款項',
  TRANSACTION_RECORDS: '交易紀錄',

  MANAGE_8421: '財務管理中心',
  LABEL_5163: '上一頁',
  LABEL_9383: '下一頁',

  // Column labels
  COL_TYPE: '類型',
  COL_DESCRIPTION: '說明',
  COL_AMOUNT: '金額',
  COL_DATE: '日期',
  TYPE_INCOME: '收入',
  TYPE_EXPENSE: '支出',
  TYPE_TRANSFER: '轉帳',

  // Validation / Messages
  COPY_SUCCESS_EDIT_NAME: '複製成功，請編輯名稱',
  SYSTEM_DEFAULT_CANNOT_DELETE: '系統預設類別無法刪除',
  PLEASE_FILL_NAME: '請填寫名稱',
  PLEASE_FILL_CODE_AND_NAME: '請填寫代碼和名稱',
  PLEASE_FILL_CATEGORY_NAME: '請填寫類別名稱',

  // Stats
  UNCLOSED_TOURS_COUNT: '未結團數',
  TOTAL_INCOME_LABEL: '總收入',
  TOTAL_COST_LABEL: '總成本',
  NET_PROFIT_LABEL: '淨利潤',
  DISBURSEMENT_COUNT: '出納單數',
  TOTAL_DISBURSEMENT_AMOUNT: '出帳總金額',

  // Module cards
  MODULE_FINANCE_TITLE: '財務管理',
  MODULE_FINANCE_DESC: '管理所有收款和請款記錄',
  MODULE_FINANCE_STATS: (count: number) => `${count} 筆記錄`,
  MODULE_TREASURY_TITLE: '出納管理',
  MODULE_TREASURY_DESC: '日常收支與現金流管理',
  MODULE_TREASURY_STATS: '即時現金流',
  MODULE_REPORTS_TITLE: '報表管理',
  MODULE_REPORTS_DESC: '財務分析與統計報表',
  MODULE_REPORTS_STATS: '即時財務分析',

  // Pagination
  PAGINATION_SUMMARY: (total: number, page: number, totalPages: number) =>
    `共 ${total} 筆交易，目前在第 ${page} / ${totalPages} 頁`,

  // CategoriesSection
  SAVE_SUCCESS: '儲存成功',
  SAVE_FAILED: '儲存失敗',
  DELETE_SUCCESS: '刪除成功',
  DELETE_FAILED: '刪除失敗',
  DELETE_CATEGORY_TITLE: '刪除請款類別',
  DELETE_CATEGORY_CONFIRM: (name: string) => `確定要刪除「${name}」嗎？`,
  EMPTY_CATEGORIES: '尚未設定請款類別',
  EMPTY_COMPANY_EXPENSE: '尚未設定公司支出項目',
  EMPTY_COMPANY_INCOME: '尚未設定公司收入項目',
  STATUS_ACTIVE: '啟用',
  STATUS_INACTIVE: '停用',
  CATEGORY_DIALOG_TITLE: (mode: 'create' | 'edit', kind: 'expense' | 'company_expense' | 'company_income') => {
    const action = mode === 'edit' ? '編輯' : '新增'
    const target =
      kind === 'company_expense'
        ? '公司支出項目'
        : kind === 'company_income'
          ? '公司收入項目'
          : '請款類別'
    return `${action}${target}`
  },
  SAVING: '儲存中...',
  SAVE: '儲存',
  FIELD_NAME_REQUIRED: '名稱 *',
  DEBIT_ACCOUNT_EXPENSE: '借方科目（費用）',
  CREDIT_ACCOUNT_LIABILITY: '貸方科目（負債）',
  CATEGORY_HINT: '建立請款單時自動生成傳票：借 費用科目 / 貸 應付帳款',

  // PaymentMethodsSection
  TOOLTIP_DRAG_SORT: '拖曳排序',
  TOOLTIP_COPY_CUSTOM: '複製為自訂方式',
  TOOLTIP_EDIT: '編輯',
  TOOLTIP_DELETE: '刪除',
  FIELD_FEE_OPTIONAL: '手續費（選填）',
  FIELD_DEBIT_ACCOUNT_OPTIONAL: '借方科目（選填）',
  FIELD_CREDIT_ACCOUNT_OPTIONAL: '貸方科目（選填）',

  // BankAccountsSection
  FIELD_CODE_REQUIRED: '代碼 *',
  DELETE_BANK_TITLE: '刪除銀行帳戶',
  DELETE_BANK_CONFIRM: (name: string) => `確定要刪除「${name}」嗎？`,
  EMPTY_BANK_ACCOUNTS: '尚未設定銀行帳戶',
  BANK_DIALOG_TITLE: (mode: 'create' | 'edit') => (mode === 'edit' ? '編輯銀行帳戶' : '新增銀行帳戶'),
}

const _BATCH_CONFIRM_LABELS = {
  NO_PENDING_ITEMS: '沒有待確認的收款品項',
  ALL_CONFIRMED: '所有收款品項都已確認完成',

  CONFIRM_2930: '批量確認收款',
  LABEL_6427: '收款單號',
  LABEL_7017: '訂單編號',
  LABEL_4272: '團名',
  LABEL_5187: '收款方式',
  LABEL_6261: '應收金額',
  LABEL_8417: '實收金額',
  CONFIRM_4237: '部分收款品項的實收金額與應收金額不同，請確認',
  CANCEL: '取消',

  SELECT_AT_LEAST_ONE: '請至少選擇一筆收款品項',
  ACTUAL_AMOUNT_ZERO: '實收金額不能為 0',
  UNKNOWN_ERROR: '未知錯誤',
  CONFIRM_SUCCESS: (count: number) => `成功確認 ${count} 筆收款品項`,
  CONFIRM_FAILED: (numbers: string) => `確認失敗：${numbers}`,
  CONFIRM_PARTIAL: (success: number, failed: number, numbers: string) =>
    `成功確認 ${success} 筆\n失敗 ${failed} 筆：${numbers}`,
  CONFIRMING: '確認中...',
  CONFIRM_N_RECEIPTS: (count: number) => `確認 ${count} 筆收款`,
  SELECTED_STATS: (selected: number, total: number) => `已選擇 ${selected} / ${total} 筆`,
  TOTAL_PREFIX: '總計：',
}

const _TOUR_PNL_LABELS = {
  INCOME: '收入',
  COST: '成本',
  GROSS_PROFIT: '毛利',
  ALL_STATUS: '全部狀態',
  CONFIRMED: '已確認',
  OPERATING: '出團中',
  COMPLETED: '已完成',
  CLOSED: '已結團',

  TOTAL_2832: '團收支總覽',

  // Status map
  STATUS_DRAFT: '草稿',
  STATUS_CONFIRMED: '已確認',
  STATUS_OPERATING: '出團中',
  STATUS_COMPLETED: '已完成',
  STATUS_CLOSED: '已結團',
  STATUS_CANCELLED: '已取消',

  // Column labels
  COL_TOUR_CODE: '團號',
  COL_TOUR_NAME: '團名',
  COL_DEPARTURE_DATE: '出發日',
  COL_PARTICIPANTS: '人數',
  COL_STATUS: '狀態',
  COL_REVENUE: '收入',
  COL_COST: '成本',
  COL_PROFIT: '毛利',
  COL_MARGIN: '毛利率',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_FINANCE: '財務',
  BREADCRUMB_REPORTS: '報表管理',

  // Toast
  TOAST_LOAD_FAILED: '載入團收支資料失敗',

  // Search
  SEARCH_PLACEHOLDER: '搜尋團號、團名...',
}

const _UNCLOSED_TOURS_LABELS = {
  DESCRIPTION: '此報表顯示<strong>回程日 + 7 天已過</strong>但尚未執行結團的團體。',
  DESCRIPTION_SUFFIX: '建議儘快完成結團作業以確保財務數據準確。',

  LABEL_996: '未結團團體報表',
  LABEL_9947: '未結團團體數',
  TOTAL_7262: '總收入',
  TOTAL_582: '總支出',
  TOTAL_8800: '總利潤',
  LABEL_332: '未結團團體列表',

  // Column labels
  COL_TOUR_CODE: '團號',
  COL_TOUR_NAME: '團名',
  COL_RETURN_DATE: '回程日',
  COL_EXPECTED_CLOSING_DATE: '應結團日',
  COL_DAYS_OVERDUE: '逾期天數',
  COL_TOTAL_REVENUE: '總收入',
  COL_TOTAL_COST: '總支出',
  COL_PROFIT: '利潤',
  COL_STATUS: '狀態',
  DAYS_SUFFIX: ' 天',
  STATUS_DEFAULT: '待出發',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_FINANCE: '財務',
  BREADCRUMB_REPORTS: '報表管理',

  // Table
  EMPTY_MESSAGE: '目前沒有需要結團的團體',
  SEARCH_PLACEHOLDER: '搜尋團號或團名...',
}

export const PAYMENT_DATA_LABELS = {
  FILL_COMPLETE_INFO: '請填寫完整資訊',
  CANNOT_GET_TOUR_CODE: '無法取得團號，請確認訂單已關聯旅遊團',
  PLEASE_LOGIN: '請先登入',
  CONFIRMED_CANNOT_DELETE: '已確認的收款單無法刪除',
}

export const REQUESTS_PAGE_LABELS = {
  LOADING: '載入中',

  MANAGE_3483: '請款管理',
  ADD_9640: '新增請款',
}

export const TRAVEL_INVOICE_LABELS = {
  LOADING: '載入中...',
  BASIC_INFO: '基本資訊',
  INVOICE_NUMBER: '發票號碼',
  ISSUE_DATE: '開立日期',
  TAX_TYPE: '課稅別',
  TOTAL_AMOUNT: '總金額',
  BUYER_INFO: '買受人資訊',
  NAME: '名稱',
  TAX_ID: '統一編號',
  MOBILE: '手機',

  // Status
  STATUS_PENDING: '待處理',
  STATUS_ISSUED: '已開立',
  STATUS_VOIDED: '已作廢',
  STATUS_ALLOWANCE: '已折讓',
  STATUS_FAILED: '失敗',

  // Detail
  FILL_VOID_REASON: '請填寫作廢原因',
  UNKNOWN_ERROR: '發生未知錯誤',
  BACK_TO_LIST: '返回發票列表',
  NOT_OBTAINED: '尚未取得',
  TAX_DUTIABLE: '應稅',
  TAX_ZERO_RATE: '零稅率',
  TAX_FREE: '免稅',
  UNIT_LABEL: '式',
}

// Additional TRAVEL_INVOICE_LABELS - append to existing
const _TRAVEL_INVOICE_DETAIL_LABELS = {
  PRODUCT_DETAILS: '商品明細',
  INVOICE_INFO: '發票資訊',
  RANDOM_CODE: '隨機碼',
  BARCODE: '條碼',
  VOID_INFO: '作廢資訊',
  VOID_TIME: '作廢時間',
  VOID_REASON: '作廢原因',
  VOID_INVOICE: '作廢發票',
  VOID_REASON_REQUIRED: '作廢原因 *',

  LABEL_6889: '發票詳情',
  NOT_FOUND_6549: '找不到該發票',
  DELETE_4958: '您要找的發票可能已被刪除或不存在',
  LABEL_6937: '商品名稱',
  QUANTITY: '數量',
  LABEL_9062: '單位',
  LABEL_9413: '單價',
  AMOUNT: '金額',
  PLEASE_ENTER_7085: '請輸入作廢原因',
  CANCEL: '取消',
  CONFIRM_8486: '確認作廢',
}

