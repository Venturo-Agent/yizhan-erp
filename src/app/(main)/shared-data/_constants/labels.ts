// TODO: can be removed — all string-literal consumers migrated to useTranslations('sharedData')
// NOTE: TOTAL_ROWS is a function-type value and must remain here for consumers that call it directly.
export const SHARED_DATA_LABELS = {
  TITLE: '共用資料',
  DESC: '全平台共用 reference 資料、有 shared_data 能力的 workspace 可維護、其他 workspace 唯讀使用',

  MODULE_BANKS: '銀行代號',
  MODULE_BANKS_DESC: '台灣金融機構代號表（中央銀行）',

  MODULE_COUNTRIES: '國家代號',
  MODULE_COUNTRIES_DESC: '世界國家代碼（ISO 3166-1 alpha-2）',

  MODULE_AIRPORTS: '機場代號',
  MODULE_AIRPORTS_DESC: '世界機場代碼（IATA / ICAO）',

  // 表格 column
  COL_CODE: '代碼',
  COL_NAME_ZH: '中文名',
  COL_NAME_EN: '英文名',
  COL_CONTINENT: '洲',
  COL_SUB_REGION: '地區',
  COL_CITY: '城市',
  COL_COUNTRY: '國家',
  COL_TIMEZONE: '時區',
  COL_ICAO: 'ICAO',
  COL_SWIFT: 'SWIFT',
  COL_ACTIONS: '操作',

  SEARCH_PLACEHOLDER_BANKS: '搜尋銀行代碼或名稱',
  SEARCH_PLACEHOLDER_COUNTRIES: '搜尋國家代碼或名稱',
  SEARCH_PLACEHOLDER_AIRPORTS: '搜尋 IATA / ICAO / 城市 / 機場名',

  TOTAL_ROWS: (n: number) => `共 ${n.toLocaleString()} 筆`,
  LOADING: '載入中…',
  NO_DATA: '無資料',
  COL_ENABLED: '啟用',

  // 分頁
  PAGE_FIRST: '首頁',
  PAGE_PREV: '上一頁',
  PAGE_NEXT: '下一頁',
  PAGE_LAST: '末頁',
} as const

