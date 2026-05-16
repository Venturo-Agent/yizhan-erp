// quotes — hook 訊息 / 服務層標籤

export const QUOTE_HOOKS_LABELS = {
  // useQuoteState
  QUOTE_NOT_FOUND: '找不到報價單',
  WORKSPACE_ERROR: '無法取得 workspace code',
  SAVE_FAILED: '儲存失敗',
  LOAD_FAILED: '載入報價單失敗',
  VERSION_SAVED: '版本已儲存',
  VERSION_SAVE_FAILED: '版本儲存失敗',

  // useTransportOperations
  DEPARTURE_TIME: '出發時間',
  ARRIVAL_TIME: '抵達時間',
  LOAD_TRANSPORT_FAILED: '載入交通資料失敗',
  SAVE_TRANSPORT_SUCCESS: '交通資料已儲存',
  SAVE_TRANSPORT_FAILED: '儲存交通資料失敗',
  DELETE_TRANSPORT_SUCCESS: '已刪除交通項目',
  DELETE_TRANSPORT_FAILED: '刪除失敗',
  ADD_TRANSPORT_FAILED: '新增失敗',

  // useQuickQuoteDetail
  QUICK_QUOTE_NOT_FOUND: '找不到報價單',
  QUICK_QUOTE_LOAD_FAILED: '載入報價單失敗',
  QUICK_QUOTE_SAVE_SUCCESS: '報價單已儲存',
  QUICK_QUOTE_SAVE_FAILED: '儲存失敗',
  QUICK_QUOTE_DELETE_SUCCESS: '已刪除報價單',

  // useQuickQuoteForm
  CREATE_SUCCESS: '報價單已建立',
  CREATE_FAILED: '建立報價單失敗',
  UPDATE_SUCCESS: '報價單已更新',
  UPDATE_FAILED: '更新報價單失敗',

  // useQuoteForm
  ITINERARY_LOAD_FAILED: '載入行程表失敗',

  // useCategoryItems
  DELETE_ITEM_SUCCESS: '已刪除項目',
  DELETE_ITEM_FAILED: '刪除項目失敗',
  ADD_ITEM_FAILED: '新增項目失敗',
  UPDATE_ITEM_FAILED: '更新項目失敗',

  // useQuoteCalculations
  CALC_FAILED: '計算失敗',

  // useQuoteTour
  LINK_TOUR_SUCCESS: '已關聯旅遊團',
  LINK_TOUR_FAILED: '關聯旅遊團失敗',
  UNLINK_TOUR_SUCCESS: '已取消關聯',
  UNLINK_TOUR_FAILED: '取消關聯失敗',

  // useQuoteSave
  QUOTE_SAVE_SUCCESS: '報價單已儲存',

  // useQuoteGroupCostUpdate
  COST_UPDATE_SUCCESS: '成本已更新',
  COST_UPDATE_FAILED: '更新成本失敗',

  // calculateTierPricing
  TIER_CALC_ERROR: '計算檻次價格失敗',
  NO_CATEGORIES: '報價單沒有類別',
  NO_ITEMS: '類別沒有項目',
}

export const QUOTE_SERVICE_LABELS = {
  MUST_BELONG_TO_WORKSPACE: '必須屬於工作空間',
  AMOUNT_NOT_NEGATIVE: '報價金額不能為負數',
  STATUS_INVALID: '無效的狀態值',
}
