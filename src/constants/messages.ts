/**
 * 通用訊息常量
 * 集中管理所有頁面共用的 alert / toast / 錯誤訊息
 * 避免裸字串硬編碼在元件中
 */

export const COMMON_MESSAGES = {
  // 載入相關
  LOAD_FAILED: '載入失敗',
  LOADING: '載入中...',
  SEARCHING: '查詢中...',
  PROCESSING: '處理中...',

  // 儲存相關
  SAVE_SUCCESS: '儲存成功',
  SAVE_FAILED: '儲存失敗，請稍後再試',

  // 刪除相關
  DELETE_SUCCESS: '刪除成功',
  DELETE_FAILED: '刪除失敗',

  // 更新相關
  UPDATE_SUCCESS: '更新成功',
  UPDATE_FAILED: '更新失敗',

  // 驗證提示
  PLEASE_SELECT_DATE: '請選擇日期',
  PLEASE_SELECT_DATE_RANGE: '請選擇日期範圍',
  PLEASE_LOGIN_FIRST: '請先登入',
  PLEASE_ENTER_TITLE: '請輸入標題',

  // 錯誤訊息
  UNKNOWN_ERROR: '發生未知錯誤',
  NETWORK_ERROR: '網路錯誤，請稍後再試',
  OPERATION_SUCCESS: '操作成功',
  OPERATION_FAILED: '操作失敗',

  // 密碼相關
  PASSWORD_MISMATCH: '新密碼與確認密碼不符',
  PASSWORD_TOO_SHORT: (min: number) => `新密碼至少需要 ${min} 位`,
  PASSWORD_UPDATE_SUCCESS: '密碼修改成功',
  PASSWORD_UPDATE_FAILED: '密碼修改失敗',

  // 檔案相關
  FILE_DOWNLOAD_FAILED: '檔案下載失敗，請稍後再試',

  // 合約相關
  PLEASE_SIGN_FIRST: '請先完成簽名',

  // 通用
  CONFIRM_DELETE: '確定要刪除嗎？',
  NO_DATA: '沒有資料',
  NO_RESULTS: '無符合結果',
  COPIED: '已複製',
} as const
