// TODO: can be removed — all string-literal consumers migrated to useTranslations('dashboard')
export const DASHBOARD_LABELS = {
  LABEL_9544: '輸入匯率',

  LABEL_2502: '便條紙',
  LABEL_9180: '隨手記錄，靈感不遺漏',
  ADD_5952: '新增分頁',
  LABEL_2922: '在這裡寫下你的筆記...',

  LABEL_6626: '貼上 Amadeus 電報，自動提取資訊',
  LOADING_8318: '載入參考資料中...',
  LABEL_6572: '從剪貼簿貼上',
  CLEAR: '清除',
  LABEL_5472: '解析電報',
  COPYING_6010: '複製訂位代號',
  LABEL_9939: '出票期限',
  LABEL_5480: '出發',
  LABEL_5485: '抵達',
  SAVING_4294: '已儲存',
  SAVING_4983: '儲存中...',
  SAVING_6520: '儲存到 PNR 管理',

  LABEL_790: '匯款比較',
  LABEL_4154: '比較不同匯款管道的手續費',
  EXPORT_8161: '匯出國',
  SELECT_8015: '選擇國家',
  LABEL_7349: '收款國',
  AMOUNT: '金額',
  LABEL_1001: '比較中...',
  LABEL_6440: '比較',
  LABEL_2930: '最划算',
  LABEL_4924: '手續費',
  LABEL_3165: '匯率',
  LABEL_433: '實收',

  LABEL_5967: '統計資訊',
  SETTINGS_614: '統計設定',
  SELECT_4619: '選擇要顯示的統計項目',
  SELECT_8666: '尚未選擇任何統計項目',
  SELECT_413: '點擊右上角設定圖示選擇',

  CALCULATING_3504: '計時器',
  CALCULATING_3838: '精準計時，掌握每分每秒',
  CALCULATING_7093: '計時中...',
  LABEL_5402: '已暫停',
  RESET: '重設',

  LABEL_6674: '天氣週報',
  LABEL_9804: '查看未來7天天氣預報',
  LABEL_5461: '城市',
  SELECT_240: '選擇城市',
  LABEL_4743: '開始日期',
  SELECT_5234: '選擇日期',
  LOADING_6912: '載入中...',

  QUERYING_3837: '天氣查詢',
  QUERYING_1415: '查詢歷史或預報天氣',

  SETTINGS_4196: '小工具設定',
  SELECT_1019: '選擇要顯示的小工具',
  LABEL_5024: '勾選你想在首頁顯示的小工具',

  URGENT: '(緊急！)',
  INFANT_COUNT_PREFIX: '+',
  INFANT_COUNT_SUFFIX: ' 嬰兒',
  PNR_PARSER: 'PNR 解析器',
  PNR_TELEGRAM: 'PNR 電報',
  NO_RECORD_LOCATOR: '(無訂位代號)',
  DAYS_SUFFIX: '天',
  PASSENGERS_PREFIX: '旅客 (',
  PASSENGERS_SUFFIX: ')',
  CHILD: '兒童',

  // currency-widget
  EXCHANGE_RATE_LABEL: '匯率 (1 ',
  EXCHANGE_RATE_SUFFIX: ' = ? TWD)',
  CUSTOM_RATE: '已自訂匯率',
  DEFAULT_RATE_PREFIX: '預設匯率: ',

  // Stats Widget - stat labels (used by use-stats-data.ts via re-export)
  // These are in features/dashboard/constants/labels.ts

  // Timer buttons
  start: '開始',
  stop: '暫停',

  // Error messages (shared by widgets)
  errorInvalidAmount: '請輸入有效金額',
  errorSameCountry: '匯款國家和收款國家不能相同',
  errorQueryFailed: '查詢失敗，請稍後再試',
  errorSelectPassportAndDest: '請選擇護照國家和目的地',
  errorSamePassportAndDest: '護照國家和目的地不能相同',

  // Remittance disclaimer
  remittanceDisclaimer: '⚠️ 此資訊僅供參考，實際費率請以各管道最新公告為準',
} as const
