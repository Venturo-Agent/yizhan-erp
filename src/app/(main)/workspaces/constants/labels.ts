// TODO: can be removed — all consumers migrated to useTranslations('workspacesPage') in messages/zh-TW.json
export const LABELS = {
  // Page
  PAGE_TITLE: '租戶管理',
  PAGE_DESC: '管理所有工作空間（租戶），新增、查看、停用租戶',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_TENANTS: '租戶管理',

  // Search
  SEARCH_PLACEHOLDER: '搜尋租戶...',

  // Table columns
  COL_NAME: '公司名稱',
  COL_CODE: '公司代碼',
  COL_EMPLOYEE_COUNT: '員工數',
  COL_STATUS: '狀態',
  COL_CREATED_AT: '建立日期',

  // Status
  STATUS_ACTIVE: '啟用',
  STATUS_INACTIVE: '停用',

  // Actions
  ADD_TENANT: '新增租戶',

  // Empty state
  EMPTY_MESSAGE: '目前沒有任何租戶',

  // Dialog - Step 1
  STEP1_TITLE: '公司資料',
  STEP1_DESC: '填寫新租戶的基本資料',
  FIELD_NAME: '公司名稱',
  FIELD_NAME_REQUIRED: '*',
  FIELD_NAME_PLACEHOLDER: '例如：XX旅行社、XX旅遊',
  FIELD_CODE: '公司代碼',
  FIELD_CODE_REQUIRED: '*',
  FIELD_CODE_PLACEHOLDER: '例如：CORNER、DEMO（英文大寫）',
  FIELD_CODE_HINT: '用於登入識別，建立後無法修改',
  FIELD_CODE_INVALID: '公司代碼只能使用英文大寫字母',
  FIELD_CODE_DUPLICATE: '此公司代碼已被使用',
  FIELD_TAX_ID: '公司統編',
  FIELD_TAX_ID_REQUIRED: '*',
  FIELD_TAX_ID_PLACEHOLDER: '8 碼數字（例：12345678）',
  FIELD_TAX_ID_HINT: '統編資料、用於發票 / 合約抬頭',
  FIELD_TAX_ID_INVALID: '統編必須為 8 碼數字',
  FIELD_MAX_EMPLOYEES: '員工帳號上限',
  FIELD_MAX_EMPLOYEES_PLACEHOLDER: '無限制',
  FIELD_MAX_EMPLOYEES_HINT: '設定此租戶可建立的最大員工數量，留空表示無限制',

  // Dialog - Step 1.5（三維 onboarding）
  SECTION_BRANDS: '品牌設定',
  SECTION_BRANDS_DESC: '不填會用公司名稱當預設品牌；多品牌情境才需要新增（第 1 個自動主要）',
  FIELD_BRAND_NAME: '品牌名稱',
  BTN_ADD_BRAND: '+ 新增品牌',
  BTN_REMOVE_BRAND: '移除',

  SECTION_BRANCHES: '組織設定',
  CHECKBOX_MULTI_BRANCH: '是否多分公司？',
  CHECKBOX_MULTI_BRANCH_HINT: '勾選後填寫分公司列表；不勾自動建一筆「總部」placeholder',
  FIELD_BRANCH_NAME: '分公司名稱',
  BTN_ADD_BRANCH: '+ 新增分公司',

  CHECKBOX_MULTI_DEPARTMENT: '是否多部門？',
  CHECKBOX_MULTI_DEPARTMENT_HINT: '勾選後填寫部門列表；不勾自動建一筆「總公司」placeholder',
  FIELD_DEPARTMENT_NAME: '部門名稱',
  BTN_ADD_DEPARTMENT: '+ 新增部門',

  // Dialog - Step 2
  STEP2_TITLE: '第一位系統主管',
  STEP2_DESC: '為新租戶建立系統主管帳號',
  FIELD_EMPLOYEE_NUMBER: '員工編號',
  FIELD_EMPLOYEE_NUMBER_HINT: '預設 E001、員工自己改不到',
  FIELD_ADMIN_NAME: '姓名',
  FIELD_ADMIN_NAME_REQUIRED: '*',
  FIELD_ADMIN_NAME_PLACEHOLDER: '系統主管姓名',
  FIELD_EMAIL: '管理員 Email',
  FIELD_EMAIL_REQUIRED: '*',
  FIELD_EMAIL_PLACEHOLDER: '例：admin@jinyang.com.tw',
  FIELD_EMAIL_HINT: '登入用、必填',
  FIELD_PASSWORD: '密碼',
  FIELD_PASSWORD_HINT: '預設密碼固定為「12345678」、首次登入會強制改密',
  FIELD_PASSWORD_PLACEHOLDER: '登入密碼',

  // Dialog - Step 3
  STEP3_TITLE: '建立完成',
  STEP3_DESC: '請將以下登入資訊提供給客戶：',
  LOGIN_INFO_CODE: '公司代碼',
  LOGIN_INFO_EMPLOYEE_NUMBER: '員工編號',
  LOGIN_INFO_EMAIL: '登入 Email',
  LOGIN_INFO_PASSWORD: '密碼',
  COPY_ALL: '複製全部',
  COPIED: '已複製到剪貼簿',

  // Dialog buttons
  BTN_NEXT: '下一步',
  BTN_PREV: '上一步',
  BTN_CREATE: '建立租戶',
  BTN_CREATING: '建立中...',
  BTN_CLOSE: '關閉',
  BTN_CANCEL: '取消',

  // Edit dialog
  EDIT_TENANT: '編輯租戶',
  BTN_SAVE: '儲存',
  BTN_SAVING: '儲存中...',
  TOAST_EDIT_SUCCESS: '租戶資料已更新',
  TOAST_EDIT_FAILED: '更新租戶失敗',

  // Toast messages
  TOAST_WORKSPACE_CREATED: '工作空間已建立',
  TOAST_ADMIN_CREATED: '系統主管帳號已建立',
  TOAST_CREATE_FAILED: '建立租戶失敗',
  TOAST_ADMIN_FAILED: '建立系統主管失敗',
  TOAST_TOGGLE_SUCCESS_ACTIVE: '已啟用',
  TOAST_TOGGLE_SUCCESS_INACTIVE: '已停用',
  TOAST_TOGGLE_FAILED: '狀態切換失敗',

  // Employee count
  EMPLOYEE_COUNT_SUFFIX: ' 人',
} as const
