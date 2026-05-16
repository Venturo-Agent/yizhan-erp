// Todos 模組中文標籤

// 狀態相關
export const TODO_STATUS_LABELS = {
  pending: '待辦',
  in_progress: '作業中',
  completed: '完成',
  cancelled: '取消',
}

// 優先度（5 級對應 1-5 數值）
export const TODO_PRIORITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  5: '緊急',
  4: '高',
  3: '中',
  2: '低',
  1: '很低',
}

// Dialog header / sidebar / quick actions 文字（中央化、避免散落）
export const TODO_DIALOG_LABELS = {
  inListPrefix: '在列表',
  inListSuffix: '中',
  description: '描述',
  quickActions: '業務快捷操作',
  relatedERP: '關聯 ERP 資料',
  coverImage: '點擊設定封面圖片',
  erpPlaceholderHint: 'ERP 即時資料整合 — 開發中',
  tour: '旅遊團',
  customerOrder: '客戶訂單',
  totalQuote: '報價總額',
  customerPaid: '客戶已付',
  supplierPayable: '待付供應商',
  estimatedProfit: '預估毛利',
  notLinked: '未關聯',
  notAssigned: '未指派',
  notSet: '未設定',
  status: '狀態',
  priority: '優先度',
  deadline: '到期日',
  assignee: '負責人',
  related: '關聯',
  businessActions: '業務動作',
  actions: '動作',
  copy: '複製',
  delete: '刪除',
  share: '共享',
  label: '標籤',
  createInvoice: '建立請款單',
  confirmReceipt: '確認收款',
  bookTicket: '訂票作業',
  preTrip: '行前說明',
  comingSoon: '敬請期待',
  noSubtasks: '尚無子任務',
  subtasksProgress: '進度',
  addSubtask: '新增子任務...',
  quickAddSubtasks: '快速新增業務子任務',
  tags: '標籤',
  addTagPlaceholder: '輸入後按 Enter 新增...',
  noTags: '尚無標籤',
}

// 子任務常用預設項目（旅行社業務常見任務）
// 順序：一站式作業先（開團/建單/請款/收款）→ 操作面（訂房/航班）→ 收尾（行前）
export const PRESET_BUSINESS_SUBTASKS = [
  '開團',
  '建立訂單',
  '請款作業',
  '收款確認',
  '訂房確認',
  '確認航班',
  '行前說明',
] as const

// 通用標籤
export const COMMON_LABELS = {
  shared: '共享',
  priority: '優先級',
  deadline: '截止日期',
  notes: '備註',
  activityLog: '活動紀錄',
  description: '描述',
  relatedItems: '關聯項目',
  readOnlyMode: '唯讀模式',
  unknownEmployee: '未知員工',
  unknownUser: '未知使用者',
  notSet: '未設定',
  deleteSubtask: '刪除子任務',
  remove: '移除',
  removeShare: '移除共享',
}

// 按鈕文字
export const BUTTON_LABELS = {
  markComplete: '標記完成',
  extendWeek: '延期一週',
  save: '儲存',
  cancel: '取消',
  add: '新增',
  create: '建立收款單',
}

// Placeholder 文字
export const PLACEHOLDER_LABELS = {
  enterTaskTitle: '輸入任務標題...',
  selectDate: '選擇日期',
  addNote: '新增備註... (Enter 送出，Shift+Enter 換行)',
  enterHandlerName: '請輸入經手人姓名',
  enterPayerName: '請輸入付款人姓名',
  optional: '選填',
  optionalWithFees: '選填，如有手續費',
  enterAmount: '請輸入金額',
  enterAuthCode: '請輸入授權碼',
  enterCheckNumber: '請輸入支票號碼',
  enterBankName: '請輸入銀行名稱',
  paymentNameExample: '例如：峇里島五日遊 - 尾款',
  selectGroup: '請選擇團體...',
  selectGroupFirst: '請先選擇團體',
  noOrdersInGroup: '此團體沒有訂單',
  selectOrder: '請選擇訂單...',
  selectAccount: '請選擇匯入帳戶',
  disbursementNotes: '請款相關說明...',
}

// 標題和對話框
export const DIALOG_LABELS = {
  todoDetails: '待辦事項詳情',
}

// 表單欄位標籤
export const FORM_LABELS = {
  createRequestPrefix: '建立請款單 (',
  itemsSuffix: '項，',
  assignTo: '指派給:',
  group: '團體',
  groupRequired: '團體 *',
  order: '訂單',
  orderOptional: '訂單（選填）',
  paymentMethod: '收款方式 *',
  amount: '金額 *',
  transactionDate: '收款日期 *',
  payerName: '付款人姓名',
  remarks: '備註',
  handler: '經手人',
  depositAccount: '匯入帳戶 *',
  fees: '手續費',
  cardLastFour: '卡號後四碼',
  authCode: '授權碼',
  checkNumber: '支票號碼',
  issueBank: '開票銀行',
  email: 'Email *',
  paymentDeadline: '付款截止日 *',
  paymentNameForCustomer: '付款名稱（客戶看到的）',
}

// 提示文字
export const TOOLTIP_LABELS = {
  removeAssignment: '取消指派',
  clearDeadline: '清除期限',
  editNote: '編輯備註',
  deleteNote: '刪除備註',
}

// 聯絡人相關
export const CONTACT_LABELS = {
  noContact: '無聯絡人',
}

// 銀行選項
export const BANK_OPTIONS = {
  cathay: '國泰銀行',
  hcb: '合作金庫',
}

// 警告/成功訊息
export const MESSAGE_LABELS = {
  selectOrder: '請選擇訂單',
  amountRequired: '收款金額不能為 0',
  receiptCreateSuccess: '收款單建立成功',
  createFailed: '建立失敗，請稍後再試',
  requiredFields: '請填寫必填欄位（團體、請款日期、至少一項請款項目）',
  groupNotFound: '找不到選中的團體',
  disbursementCreateSuccess: '請款單建立成功',
}

// 快速操作標籤
export const QUICK_ACTION_LABELS = {
  receipt: '收款',
  invoice: '請款',
  pnr: 'PNR',
  share: '共享',
}

// 載入訊息
export const LOADING_LABELS = {
  loading: '載入中...',
  loadingReceiptData: '載入團體和訂單資料中...',
}

// 共享相關
export const SHARE_LABELS = {
  shareTask: '共享待辦',
  shareDescription: '分享這個任務給團隊成員',
  shareTo: '共享給',
  permission: '權限',
  viewOnly: '僅檢視',
  canEdit: '可編輯',
  messageOptional: '訊息（選填）',
  messageToMember: '給成員的訊息...',
  selectMember: '選擇成員',
  selectPermission: '選擇權限',
  noOtherEmployees: '尚無其他員工',
  sharing: '共享中...',
  shareSuccess: '待辦事項已成功共享！',
  shareFailed: '共享失敗，請稍後再試',
  selectMemberWarning: '請選擇要共享的成員',
}

// 訊息生成函數
export const getPublicTodoMessages = () => ({
  title: '這是公開的待辦事項',
  subtitle: '只有建立者和共享者可以編輯',
})

// 建立請款單按鈕文字函數
export const createDisbursementButtonText = (itemCount: number, totalAmount: number) =>
  `建立請款單 (${itemCount} 項，${totalAmount})`
