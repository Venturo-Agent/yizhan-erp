// TODO: can be removed — all consumers migrated to useTranslations('hrPage') in messages/zh-TW.json
export const LABELS = {
  NOT_SET: '未設定',
  ADD_EMPLOYEE: '新增員工',
  EDIT_EMPLOYEE: '編輯員工',
  MANAGE_3470: '人資管理',
  LABEL_5426: '薪資請款',

  // Tabs
  TAB_ACTIVE: '在職',
  TAB_TERMINATED: '離職',

  // Status labels
  STATUS_ACTIVE: '在職',
  STATUS_PROBATION: '試用期',
  STATUS_LEAVE: '請假',
  STATUS_TERMINATED: '離職',

  // Column labels
  COL_EMPLOYEE_NUMBER: '員工編號',
  COL_NAME: '姓名',
  COL_WORKSPACE: '所屬辦公室',
  COL_POSITION: '職位',
  COL_ROLES: '身份角色',
  COL_CONTACT: '聯絡方式',
  COL_STATUS: '狀態',
  COL_HIRE_DATE: '入職日期',

  // Actions
  ACTION_EDIT: '編輯',
  ACTION_TERMINATE: '辦理離職',
  ACTION_DELETE: '刪除',

  // Default values
  UNNAMED_EMPLOYEE: '未命名員工',
  UNKNOWN_OFFICE: '未知辦公室',
  NOT_PROVIDED: '未提供',

  // Terminate dialog
  TERMINATE_TITLE: '辦理離職',
  TERMINATE_CONFIRM_PREFIX: '確定要將員工「',
  TERMINATE_CONFIRM_SUFFIX: '」辦理離職嗎？',
  TERMINATE_DETAIL_1: '離職後將無法登入系統',
  TERMINATE_DETAIL_2: '歷史記錄會被保留',
  TERMINATE_DETAIL_3: '可以隨時修改狀態回復在職',
  TERMINATE_CONFIRM_LABEL: '確認離職',
  CANCEL: '取消',
  TERMINATE_FAILED: '離職處理失敗，請稍後再試',

  // Delete dialog
  DELETE_TITLE: '刪除員工',
  DELETE_CONFIRM_PREFIX: '確定要刪除員工「',
  DELETE_CONFIRM_SUFFIX: '」嗎？',
  DELETE_DETAIL_1: '⚠️ 永久刪除員工所有資料',
  DELETE_DETAIL_2: '⚠️ 移除所有歷史記錄',
  DELETE_DETAIL_3: '⚠️ 此操作無法復原',
  DELETE_DETAIL_4: '💡 建議使用「辦理離職」來保留歷史記錄',
  DELETE_CONFIRM_LABEL: '確認刪除',
  DELETE_FAILED: '刪除員工失敗，請稍後再試',

  // Role management
  ROLE_MANAGEMENT: '職務管理',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_HR: '人資管理',

  // Search
  SEARCH_PLACEHOLDER: '搜尋員工...',

  // Salary payment
  SALARY_REQUEST_TYPE: '薪資',
  SALARY_CATEGORY: '其他',
  SALARY_NOTES_SUFFIX: ' 位員工薪資',
  SALARY_DESC_SUFFIX: ' 薪資',
  SALARY_SUCCESS_PREFIX: '已建立薪資請款單（',
  SALARY_SUCCESS_MID: ' 位員工，共 ',
  SALARY_SUCCESS_SUFFIX: '）',
  SALARY_FAILED: '建立薪資請款失敗，請稍後再試',
} as const
