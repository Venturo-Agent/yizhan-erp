export const LABELS = {
  // SuppliersDialog
  editSupplier: '編輯供應商',
  addSupplier: '新增供應商',
  editSubtitle: '修改供應商資訊',
  addSubtitle: '請填寫供應商基本資訊',
  saveChanges: '儲存變更',
  supplierName: '供應商名稱',
  supplierNamePlaceholder: '輸入供應商名稱',
  bankName: '銀行名稱',
  bankNamePlaceholder: '例如：國泰世華銀行',
  bankAccount: '銀行帳號',
  bankAccountPlaceholder: '請輸入完整帳號',
  notes: '備註',
  notesPlaceholder: '供應商備註資訊（選填）',

  // SuppliersPage
  supplierManagement: '供應商管理',
  home: '首頁',
  databaseManagement: '資料庫管理',
  searchPlaceholder: '搜尋供應商名稱或銀行資訊...',
  noSuppliers: '尚無供應商資料',
  addFirst: '新增第一筆供應商',

  // SuppliersList
  supplierCode: '供應商編號',
  type: '類型',
  edit: '編輯',
  delete: '刪除',
  deleteSupplier: '刪除供應商',
}

// Supplier types
export const SUPPLIER_TYPE_LABELS = {
  HOTEL: '飯店',
  RESTAURANT: '餐廳',
  TRANSPORTATION: '交通',
  ATTRACTION: '景點',
  GUIDE: '導遊',
  TRAVEL_AGENCY: '旅行社',
  TICKETING: '票務',
  EMPLOYEE: '員工',
  OTHER: '其他',
}

// SuppliersPage toast messages
export const SUPPLIERS_PAGE_LABELS = {
  DELETE_CONFIRM: (name: string) => `確定要刪除供應商「${name}」嗎？`,
  DELETE_SUCCESS: '供應商已刪除',
  DELETE_FAILED: '刪除失敗，請稍後再試',
  UPDATE_SUCCESS: '供應商更新成功',
  CREATE_SUCCESS: '供應商建立成功',
  SAVE_FAILED: '儲存失敗，請稍後再試',
}

// Supplier Import
export const SUPPLIER_IMPORT_LABELS = {
  // Dialog
  title: '批次匯入供應商',
  description: '上傳 Excel 或 CSV 檔案，批次匯入供應商資料',
  // Buttons
  btn_download_template: '下載模板',
  btn_select_file: '選擇檔案',
  btn_import: '確認匯入',
  btn_cancel: '取消',
  btn_back: '重新選擇',
  btn_importing: '匯入中...',
  // File
  file_hint: '支援 .xlsx 和 .csv 檔案',
  file_drop: '拖曳檔案到這裡，或點擊選擇',
  file_selected: (name: string) => `已選擇：${name}`,
  // Preview
  preview_title: '資料預覽',
  preview_summary: (total: number, error_count: number) =>
    `共 ${total} 筆資料${error_count > 0 ? `，${error_count} 筆有錯誤` : ''}`,
  // Table headers
  col_row: '列號',
  col_status: '狀態',
  col_name: '公司名稱',
  col_english_name: '英文名稱',
  col_contact_person: '聯繫人',
  col_phone: '電話',
  col_email: 'Email',
  col_address: '地址',
  col_type: '類別',
  col_notes: '備註',
  // Template headers
  tpl_name: '公司名稱',
  tpl_english_name: '英文名稱',
  tpl_contact_person: '聯繫人',
  tpl_phone: '電話',
  tpl_email: 'Email',
  tpl_address: '地址',
  tpl_type: '類別',
  tpl_notes: '備註',
  // Status
  status_ok: '正常',
  status_error: '有錯誤',
  status_warning: '警告',
  status_duplicate: '可能重複',
  // Errors
  error_no_file: '請選擇檔案',
  error_parse_failed: '檔案解析失敗',
  error_no_data_to_import: '沒有可匯入的資料',
  // Messages
  msg_import_success: (count: number) => `成功匯入 ${count} 家供應商`,
  msg_import_partial: (success: number, total: number) => `匯入完成：${success}/${total} 筆成功`,
  msg_import_failed: '匯入失敗，請稍後再試',
  msg_duplicate_name: (name: string) => `供應商名稱「${name}」已存在`,
  // Supplier type mapping
  type_hotel: '飯店',
  type_restaurant: '餐廳',
  type_transport: '交通',
  type_attraction: '景點',
  type_guide: '導遊',
  type_agency: '旅行社',
  type_ticketing: '票務',
  type_other: '其他',
  // Template filename
  template_filename: '供應商匯入模板.xlsx',
  template_sheet: '供應商資料',
}
