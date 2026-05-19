/**
 * Tours feature - UI string constants
 * Extracted from JSX to comply with no-hardcoded-Chinese rule
 */

// ============================================================
// TourFilters
// ============================================================
export const TOUR_FILTERS = {
  page_title: '旅遊團管理',
  breadcrumb_home: '首頁',
  breadcrumb_tours: '旅遊團管理',
  search_placeholder: '搜尋旅遊團...',
  // 進行中 tab = 即將出發 + 旅行中 合併（虛擬 tab、業務上區分意義不大）
  tab_in_progress: '進行中',
  tab_returned: '未結案',
  tab_closed: '已結案',
  tab_archived: '封存',
  tab_proposals: '提案',
  tab_templates: '模板',
  add_button: '新增',
  add_proposal: '新增提案',
  add_template: '新增模板',
  add_tour_direct: '開團',
} as const

// 列表頁 tab value SSOT
// 注意：'in_progress' 是虛擬 tab（涵蓋 status=upcoming+ongoing）、其他直接對應 DB status
export const TOUR_TAB = {
  IN_PROGRESS: 'in_progress',
  RETURNED: 'returned',
  CLOSED: 'closed',
  PROPOSAL: 'proposal',
  TEMPLATE: 'template',
} as const

export type TourTabValue = (typeof TOUR_TAB)[keyof typeof TOUR_TAB]

// ============================================================
// TourTableColumns
// ============================================================
export const TOUR_TABLE = {
  col_code: '團號',
  col_name: '旅遊團名稱',
  col_departure: '出發日期',
  col_return: '回程日期',
  col_salesperson: '業務員',
  col_assistant: '團控',
  col_status: '狀態',
  col_location: '目的地',
  col_days: '天數',
  col_days_unit: '天',
  col_created: '建立日期',
  col_actions: '操作',
  convert_to_tour: '開團',
  empty_title: '沒有找到旅遊團',
  empty_subtitle: '請調整篩選條件或新增旅遊團',
} as const

// ============================================================
// TourMobileCard
// ============================================================
export const TOUR_MOBILE_CARD = {
  unnamed_tour: '未命名旅遊團',
  no_name: '無團名',
  person_unit: '人',
  per_person: '/ 人',
} as const

// ============================================================
// DeleteConfirmDialog
// ============================================================
export const TOUR_DELETE = {
  title: '確認刪除旅遊團',
  confirm_text: (name?: string) => `確定要刪除旅遊團「${name}」嗎？`,
  impact_title: '此操作會影響：',
  impact_orders: '• 相關訂單和團員資料',
  impact_payments: '• 收付款記錄',
  impact_quotes: '• 報價單',
  warning: '⚠️ 此操作無法復原！',
  cancel: '取消',
  confirm: '確認刪除',
} as const

// ============================================================
// ArchiveReasonDialog
// ============================================================
export const TOUR_ARCHIVE = {
  title: '封存旅遊團',
  confirm_text: (name?: string) => `確定要封存旅遊團「${name}」嗎？`,
  select_reason: '請選擇封存原因：',
  reason_no_deal: '沒成交',
  reason_no_deal_desc: '客戶最終未成交',
  reason_cancelled: '取消',
  reason_cancelled_desc: '客戶或公司取消此團',
  reason_test_error: '測試錯誤',
  reason_test_error_desc: '測試用資料或操作錯誤',
  after_archive_title: '封存後，此旅遊團將：',
  after_archive_hidden: '• 從列表中隱藏（可在「封存」分頁查看）',
  after_archive_unlink: '• 自動斷開關聯的報價單和行程表',
  cancel: '取消',
  confirm: '確認封存',
} as const

// ============================================================
// TourForm
// ============================================================
export const TOUR_FORM = {
  title_edit: '編輯旅遊團',
  title_convert: '提案轉開團',
  title_create: '新增旅遊團 & 訂單',
  title_create_proposal: '新增提案',
  title_create_template: '新增模板',
  section_info: '旅遊團資訊',
  cancel: '取消',
  submit_saving: '儲存中...',
  submit_save: '儲存變更',
  submit_converting: '轉開團中...',
  submit_convert_with_order: '確認轉開團並建立訂單',
  submit_convert: '確認轉開團',
  submit_creating: '建立中...',
  submit_create_with_order: '新增旅遊團 & 訂單',
  submit_create: '新增旅遊團',
  submit_create_proposal: '新增提案',
  submit_create_template: '新增模板',
} as const

// ============================================================
// TourBasicInfo
// ============================================================
export const TOUR_BASIC_INFO = {
  label_name: '旅遊團名稱',
  label_departure: '出發日期',
  label_return: '返回日期',
  label_description: '備註',
  label_days_count: '天數',
} as const

// ============================================================
// ConvertToTourDialog
// ============================================================
export const TOUR_CONVERT = {
  title_proposal: '提案轉開團',
  title_template: '模板轉開團',
  description_proposal: '填入出發和回程日期，將此提案轉為正式旅遊團。',
  description_template: '填入出發和回程日期，從此模板複製一份新的正式旅遊團。模板本身不會變動。',
  label_departure: '出發日期',
  label_return: '回程日期',
  cancel: '取消',
  confirm: '確認開團',
  confirming: '開團中...',
  success_proposal: '提案已轉為正式團',
  success_template: '已從模板建立正式團',
  error: '開團失敗',
} as const

// ============================================================
// TourOrderSection
// ============================================================
export const TOUR_ORDER_SECTION = {
  title: '同時新增訂單（選填）',
  hint: '提示：如果填寫了聯絡人，將會同時建立一筆訂單。如果留空，則只建立旅遊團。',
} as const

// ============================================================
// LinkItineraryToTourDialog
// ============================================================
export const TOUR_LINK_ITINERARY = {
  button_label: '設計',
  days_suffix: (n: number) => `(${n} 天)`,
  select_type: '選擇設計類型',
  brochure: '手冊',
  brochure_desc: '製作精美的行程手冊，可列印或分享 PDF',
  web_itinerary: '網頁行程表',
  web_itinerary_desc: '互動式網頁行程，可產生連結分享給客戶',
} as const
