export const ARCHIVE_LABELS = {
  PAGE_TITLE: '封存管理',
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_LIBRARY: '資料庫管理',
  BREADCRUMB_ARCHIVE: '封存管理',

  // Column labels (shared)
  COL_CODE: '團號',
  COL_NAME: '團名',
  COL_DEPARTURE_DATE: '出發日期',
  COL_ARCHIVED_TIME: '封存時間',
  COL_CLOSING_DATE: '結案日期',
  COL_QUOTE_CODE: '報價單號',
  COL_CUSTOMER_NAME: '客戶名稱',
  COL_AMOUNT: '金額',
  COL_CREATED_TIME: '建立時間',
  COL_TITLE: '標題',
  COL_LOCATION: '地點',

  // Actions
  ACTION_RESTORE: '還原',
  ACTION_DELETE_PERMANENT: '永久刪除',
  ACTION_DELETE: '刪除',
  ACTION_ARCHIVE: '封存',

  // Empty states
  EMPTY_ORPHANED_QUOTES: '沒有未關聯旅遊團的報價單',
  EMPTY_CLOSED_TOURS: '沒有已結案的旅遊團',
  EMPTY_ARCHIVED_TOURS: '沒有封存的旅遊團',
  EMPTY_ARCHIVED_ITINERARIES: '沒有封存的行程表',

  // Tab labels (dynamic with count)
  TAB_ORPHANED_QUOTES: '未關聯報價單',
  TAB_CLOSED_TOURS: '已結案旅遊團',
  TAB_ARCHIVED_TOURS: '封存旅遊團',
  TAB_ARCHIVED_ITINERARIES: '封存行程表',

  // Toast / confirm messages
  LOAD_ERROR: '載入封存資料失敗',
  CONFIRM_RESTORE_TOUR: (code: string) => `確定要還原旅遊團「${code}」嗎？`,
  CONFIRM_RESTORE_TOUR_TITLE: '還原旅遊團',
  TOAST_TOUR_RESTORED: (code: string) => `已還原旅遊團 ${code}`,
  TOAST_RESTORE_ERROR: '還原失敗，請稍後再試',
  CANNOT_DELETE_BLOCKERS: (blockers: string) =>
    `無法刪除：此旅遊團有 ${blockers}，請先刪除相關資料`,
  CONFIRM_DELETE_TOUR: (code: string) =>
    `確定要永久刪除旅遊團「${code}」嗎？\n\n⚠️ 此操作無法復原！`,
  CONFIRM_DELETE_TITLE: '永久刪除',
  TOAST_TOUR_DELETED: (code: string) => `已永久刪除旅遊團 ${code}`,
  TOAST_DELETE_ERROR: '刪除失敗',
  TOAST_DELETE_RETRY_ERROR: '刪除失敗，請稍後再試',
  UNNAMED: '未命名',
  CONFIRM_RESTORE_ITINERARY: (name: string) => `確定要還原行程表「${name}」嗎？`,
  CONFIRM_RESTORE_ITINERARY_TITLE: '還原行程表',
  TOAST_ITINERARY_RESTORED: '已還原行程表',
  CONFIRM_DELETE_ITINERARY: (name: string) =>
    `確定要永久刪除行程表「${name}」嗎？\n\n⚠️ 此操作無法復原！`,
  TOAST_ITINERARY_DELETED: '已永久刪除行程表',
  CONFIRM_DELETE_QUOTE: (code: string) =>
    `確定要刪除報價單「${code}」嗎？\n\n此報價單未關聯任何旅遊團，刪除後無法復原。`,
  CONFIRM_DELETE_QUOTE_TITLE: '刪除報價單',
  TOAST_QUOTE_DELETED: (code: string) => `已刪除報價單 ${code}`,
  CONFIRM_ARCHIVE_TOUR: (code: string) =>
    `確定要將已結案旅遊團「${code}」封存嗎？\n\n封存後可在「封存旅遊團」標籤頁還原。`,
  CONFIRM_ARCHIVE_TOUR_TITLE: '封存旅遊團',
  TOAST_TOUR_ARCHIVED: (code: string) => `已封存旅遊團 ${code}`,
  TOAST_ARCHIVE_ERROR: '封存失敗，請稍後再試',
}
