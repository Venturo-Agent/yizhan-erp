// itinerary 模組 UI 標籤常量

export const ITINERARY_LABELS = {
  // GeminiItineraryForm
  基本資訊: '基本資訊',
  封面圖片: '封面圖片',
  標語: '標語',
  英文標語: '英文標語',
  行程標題: '行程標題',
  副標題: '副標題',
  價格: '價格',
  價格說明: '價格說明',
  目的地: '目的地',
  選擇國家: '選擇國家',
  選擇城市: '選擇城市',
  每日行程: '每日行程',
  新增一天: '新增一天',
  新增天數: '新增天數',
  天數: '天數',
  第N天: (day: number) => `第 ${day} 天`,
  路線: '路線',
  早餐: '早餐',
  午餐: '午餐',
  晚餐: '晚餐',
  住宿: '住宿',
  刪除: '刪除',

  // Messages
  請先選擇城市: '請先選擇城市',
  生成失敗: '生成失敗',
  請重試: '請重試',
  AI生成中: 'AI生成中...',
  生成封面: '生成封面',

  // Placeholders
  輸入標語: '輸入標語...',
  輸入英文標語: '輸入英文標語...',
  輸入行程標題: '輸入行程標題...',
  輸入副標題: '輸入副標題...',
  輸入價格: '輸入價格...',
  輸入價格說明: '輸入價格說明...',
  輸入路線描述: '輸入路線描述...',
  輸入餐食: '輸入餐食...',
  輸入住宿: '輸入住宿...',

  GENERATING_7626: '按鈕，AI 會自動幫你生成景點描述和插圖。',
  LABEL_1199: '目前為測試模式，之後會接上 Gemini Pro API。',
  LABEL_999: '封面資訊',
  LABEL_5040: '國家',
  LABEL_5461: '城市',
  GENERATING_6137: '圖片網址或點擊 AI 生成',
  TITLE: '標題',
  EXAMPLE_9001: '例如：越南峴港經典五日',
  LABEL_4322: '副標題 (詩意文案，用換行分隔)',
  LABEL_4873: '第一行文案&#10;第二行文案',
  LABEL_4452: '價格備註',
  LABEL_7894: '8人包團',
  LABEL_6980: '路線 (用 > 分隔景點)',
  LABEL_4576: '住宿飯店',
  LABEL_5074: '參考航班',
  LABEL_7892: '航班號',
  LABEL_5480: '出發',
  LABEL_5485: '抵達',
  LABEL_6890: '行程特色',
  ADD: '新增',
  LABEL_3166: '景點名稱',
  GENERATING_5671: 'AI 生成描述',
  GENERATING_7963: 'AI 生成圖片',
  LABEL_3778: '英文名稱',
  GENERATING_146: '景點描述（可點擊 AI 按鈕自動生成）',
  LABEL_4014: '景點介紹',
  GENERATING_7535: '詳細描述（可點擊 AI 按鈕自動生成）',
  GEMINI_AI_TITLE: 'Gemini AI 智慧助手',
  PRICE_LABEL_HINT: '價格 (不含NT$和起)',
  AI_GENERATE_DESC: 'AI 生成描述',
  AI_GENERATE_IMAGE: 'AI 生成圖片',
}
// Template styles
export const TEMPLATE_LABELS = {
  CLASSIC: '經典',
  CLASSIC_DESC: '簡約經典風格',
  NATURE: '自然',
  NATURE_DESC: '清新自然風格',
  LUXURY: '奢華',
  LUXURY_DESC: '高端奢華風格',
  ART: '藝術',
  ART_DESC: '藝術創意風格',
  SAKURA: '櫻花',
  SAKURA_DESC: '浪漫櫻花主題',
  OCEAN: '海洋',
  OCEAN_DESC: '藍色海洋風格',
  TEMPLATE_UPDATED: '模板已更新',
  TEMPLATE_UPDATE_FAILED: '更新模板失敗',
  TEMPLATE_APPLIED: '模板已套用',
  TEMPLATE_APPLY_FAILED: '套用模板失敗',
  TEMPLATE_SAVED: '已儲存為模板',
  TEMPLATE_SAVE_FAILED: '儲存模板失敗',
  TEMPLATE_DELETED: '模板已刪除',
  TEMPLATE_DELETE_FAILED: '刪除模板失敗',
  TEMPLATE_DELETE_CONFIRM: '確定要刪除此模板嗎？',
  RENAME_TITLE: '重新命名',
  RENAME_PLACEHOLDER: '模板名稱',
  CUSTOM_CSS_SAVED: '自訂 CSS 已儲存',
  CUSTOM_CSS_FAILED: '儲存自訂 CSS 失敗',
  CUSTOM_CSS_RESTORED: '已恢復預設 CSS',
}

// Corner Flight Itinerary
export const FLIGHT_ITINERARY_LABELS = {
  TITLE: '航班行程表',
  PASSENGER: '旅客',
  FLIGHT: '航班',
  DEPARTURE: '出發',
  ARRIVAL: '抵達',
  CLASS: '艙等',
  DATE: '日期',
  TERMINAL: '航廈',
  BAGGAGE: '行李',
  GENERATE_FAILED: '產生失敗',
  GENERATE_SUCCESS: '航班行程表已產生',
}

// Gemini Itinerary
export const GEMINI_LABELS = {
  GENERATE: '用 AI 生成行程',
  GENERATING: '生成中...',
  GENERATE_FAILED: '生成失敗',
  PLACEHOLDER_DEST: '例：日本東京',
  PLACEHOLDER_DAYS: '例：5',
  PLACEHOLDER_STYLE: '例：美食之旅、文化深度',
  IMPORT_SUCCESS: '已匯入 AI 行程',
  IMPORT_FAILED: '匯入失敗',
  PREVIEW_TITLE: 'AI 行程預覽',
}

// Itinerary hooks messages
export const ITINERARY_HOOKS_LABELS = {
  // useItineraryForm
  LOAD_FAILED: '載入行程表失敗',
  SAVE_SUCCESS: '行程表已儲存',
  SAVE_FAILED: '儲存失敗',
  WORKSPACE_ERROR: '無法取得 workspace code',

  // useItineraryTableColumns
  COL_CODE: '行程編號',
  COL_NAME: '行程名稱',
  COL_STATUS: '狀態',
  COL_DAYS: '天數',
  COL_COUNTRY: '國家',
  COL_UPDATED: '更新日期',

  // useItineraryList
  LIST_LOAD_FAILED: '載入行程列表失敗',
  DELETE_SUCCESS: '行程已刪除',
  DELETE_FAILED: '刪除失敗',

  // useItineraryFilters
  FILTER_ALL: '全部',
  FILTER_DRAFT: '草稿',
  FILTER_ACTIVE: '待出發',
  FILTER_ARCHIVED: '已封存',

  // useQuoteImport
  IMPORT_SUCCESS: '已匯入報價單',
  IMPORT_FAILED: '匯入報價單失敗',
  NO_QUOTES: '沒有可匯入的報價單',

  // useItineraryDialogs
  CREATE_ITINERARY_FAILED: '建立行程表失敗',
  CREATE_ITINERARY_SUCCESS: '行程表已建立',
}

// Itinerary page
export const ITINERARY_PAGE_LABELS = {
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_ITINERARY: '行程管理',
  NEW_ITINERARY: '新增行程',
  SEARCH_PLACEHOLDER: '搜尋行程...',
}
