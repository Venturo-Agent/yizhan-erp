/**
 * 全域時間常數配置
 * 統一管理所有 setTimeout/setInterval 的時間參數
 */

/**
 * UI 互動延遲（毫秒）
 */
export const UI_DELAYS = {
  /** 輸入防抖動延遲 */
  INPUT_DEBOUNCE: 300,
  /** 快速回饋 */
  FAST_FEEDBACK: 150,
  /** 短暫延遲 */
  SHORT_DELAY: 200,
  /** 搜尋延遲 */
  SEARCH_DELAY: 500,
  /** 自動儲存延遲 */
  AUTO_SAVE: 1000,
  /** 成功訊息顯示時間 */
  SUCCESS_MESSAGE: 2000,
  /** 訊息顯示時間 */
  MESSAGE_DISPLAY: 3000,
  /** 工具提示延遲 */
  TOOLTIP_DELAY: 500,
  /** 長時間延遲 */
  LONG_DELAY: 60000,
} as const

/**
 * 資料同步延遲（毫秒）
 */
const _SYNC_DELAYS = {
  /** IndexedDB 初始化超時 */
  INDEXEDDB_INIT_TIMEOUT: 3000,
  /** IndexedDB 單一操作超時 */
  INDEXEDDB_OPERATION_TIMEOUT: 1000,
  /** 批次同步延遲 */
  BATCH_SYNC_DELAY: 10,
  /** 自動同步間隔 */
  AUTO_SYNC_INTERVAL: 30000, // 30 秒
  /** 重試延遲 */
  RETRY_DELAY: 2000,
} as const

/**
 * 網路請求超時（毫秒）
 */
const _REQUEST_TIMEOUTS = {
  /** 一般 API 請求 */
  DEFAULT: 10000,
  /** 檔案上傳 */
  FILE_UPLOAD: 60000,
  /** 長時間查詢 */
  LONG_QUERY: 30000,
} as const

/**
 * 動畫時間（毫秒）
 */
const _ANIMATION_DURATIONS = {
  /** 快速動畫 */
  FAST: 150,
  /** 一般動畫 */
  NORMAL: 300,
  /** 慢速動畫 */
  SLOW: 500,
} as const

/**
 * 輪詢間隔（毫秒）
 */
const _POLLING_INTERVALS = {
  /** 即時更新 */
  REAL_TIME: 1000,
  /** 頻繁更新 */
  FREQUENT: 5000,
  /** 定期更新 */
  REGULAR: 30000,
  /** 偶爾更新 */
  OCCASIONAL: 60000,
} as const

/**
 * 特殊延遲（毫秒）
 */
const _SPECIAL_DELAYS = {
  /** 立即執行（nextTick） */
  NEXT_TICK: 0,
} as const
