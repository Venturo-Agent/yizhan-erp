// 業務邏輯、服務層、操作相關 UI 標籤

export const TOUR_SERVICE_LABELS = {
  NAME_MIN_LENGTH: '旅遊團名稱至少需要 2 個字符',
  MAX_PARTICIPANTS_GT_ZERO: '最大參與人數必須大於 0',
  PRICE_NOT_NEGATIVE: '價格不能為負數',
  RETURN_BEFORE_DEPARTURE: '返回日期不能早於出發日期',
  CANNOT_GET_WORKSPACE: '無法取得 workspace code，請重新登入',
  TOUR_NOT_FOUND: '找不到該旅遊團',
  STATUS_CLOSED: '已結團',
  TOUR_ALREADY_CLOSED: '該旅遊團已經結案，無法取消',
  CANNOT_CANCEL_WITHIN_3_DAYS: '出發前3天內無法取消',
  STATUS_PROPOSAL: '開團',
  STATUS_ACTIVE: '待出發',
  STATUS_CANCELLED: '取消',
  INVALID_STATUS_TRANSITION: (from: string, to: string) =>
    `不允許的狀態轉換：無法從 "${from}" 更新為 "${to}"`,
}

export const TOUR_OPERATIONS_LABELS = {
  FILL_COUNTRY_NAME: '請填寫國家名稱',
  FILL_CITY_NAME: '請填寫城市名稱',
  FILL_CITY_CODE: '請填寫城市代號',
  CITY_CODE_3_CHARS: '城市代號必須是 3 碼',
  SELECT_CITY_OR_SET_AIRPORT: '請選擇城市，或在「系統設定 > 地區管理」中為該城市設定機場代碼',
  CREATE_TOUR_FAILED: '建立旅遊團失敗',
  INVALID_TOUR: '無效的旅遊團',
  CANNOT_DELETE_HAS_DEPS: (blockers: string) =>
    `無法刪除：此旅遊團有 ${blockers}，請先刪除相關資料`,
  CANNOT_DELETE_PAID_ORDERS: (count: number) => `此團有 ${count} 筆已付款訂單，無法刪除`,
  DELETE_TOUR_FAILED: '刪除旅遊團失敗',
}

export const TOURS_ADVANCED_LABELS = {
  CANNOT_GET_STATUS: '無法取得目前狀態',
  INVALID_STATUS_TRANSITION: (from: string, to: string) => `無法從「${from}」轉為「${to}」`,
}

export const TOUR_DEPENDENCY_LABELS = {
  MEMBERS_COUNT: (count: number) => `${count} 位團員`,
  RECEIPTS_COUNT: (count: number) => `${count} 筆收款單`,
  PAYMENTS_COUNT: (count: number) => `${count} 筆請款單`,
  PNRS_COUNT: (count: number) => `${count} 筆 PNR`,
  CONFIRMATION_SHEETS_COUNT: (count: number) => `${count} 筆團確認單`,
  DELETE_EMPTY_ORDER_FAILED: (message: string) => `刪除空訂單失敗: ${message}`,
}
