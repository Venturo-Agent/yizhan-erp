// TODO: can be removed — all string-literal consumers migrated to useTranslations('dashboard')
export const DASHBOARD_LABELS = {
  // DashboardClient
  loading: '載入中...',
  home: '首頁',
  NO_WIDGETS_TITLE: '尚未選擇任何小工具',
  NO_WIDGETS_DESCRIPTION: '點擊右上角「小工具設定」來新增你需要的工具',

  // Calculator Widget
  calculator: '計算機',
  calculatorDescription: '快速運算，精準無誤',
  sequentialMode: '順序',
  inputExpression: '輸入算式',
  clear: '清除',

  // Currency Widget
  exchangeRate: '匯率換算',
  currencyDescription: '輕鬆計算各國貨幣，掌握即時匯率',
  selectCurrency: '選擇貨幣',
  exchangePositions: '交換左右位置',
  exchangeRateLabel: '匯率',
  reset: '重設',
  inputRate: '輸入匯率',
  customRateSet: '已自訂匯率',
  defaultRate: '預設匯率',

  // Currency names
  usd: '美金',
  jpy: '日幣',
  krw: '韓元',
  cny: '人民幣',
  vnd: '越南盾',
  idr: '印尼盾',
  twd: '台幣',

  // Flight Widget
  flightQuery: '航班查詢',
  flightDescription: 'Amadeus 電報，自動提取資訊',
  flightNumberLabel: '航班號碼',
  selectAirport: '選擇機場',
  selectDate: '選擇日期',
  destinationFilter: '目的地篩選',
  search: '查詢',
  flightNumber: '航班',
  departure: '出發',
  arrival: '抵達',
  time: '時間',
  aircraft: '機型',
  status: '狀態',
  gate: '航廈',
  scheduled: '起飛',
  landing: '降落',
  estimated: '預計',

  // Notes Widget
  notes: '便利貼',

  // PNR Widget
  pnrManager: 'PNR 管理',
  pnrDescription: 'PNR 解析器',
  pnrTelegram: 'PNR 電報',
  pnrContent: 'PNR 電報內容',
  pastePnr: '貼上 Amadeus PNR 電報...',
  parse: '解析',
  save: '儲存',
  passengers: '旅客',
  segments: '航段',
  specialRequests: '特殊要求',
  ticketingDeadline: '開票期限',
  unknown: '未知',
  emergency: '緊急！',
  days: '天',
  infant: '嬰兒',
  pnrNotes: '注意事項',

  // Remittance Widget
  remittanceComparison: '匯款比較',
  exchangeRateShort: '匯率',
  fee: '手續費',
  actualReceived: '實收',
  workDaysShort: '工作天',

  // Stats Widget
  statsInfo: '統計資訊',
  statsDescription: '選擇要顯示的統計項目',
  noStatsSelected: '尚未選擇任何統計項目',
  clickSettingsToSelect: '點擊右上角設定圖示選擇',

  // Timer Widget
  timer: '計時器',
  running: '計時中...',
  paused: '已暫停',
  start: '開始',
  stop: '暫停',
  timerReset: '歸零',

  arrow: '→',

  // Weather Widget
  weatherQuery: '天氣查詢',
  weatherDescription: '查詢歷史或預報天氣',
  selectCity: '選擇城市',
  selectDateLabel: '選擇日期',

  // Weather Weekly Widget
  weeklyWeather: '7天天氣',
  weeklyWeatherDescription: '7天天氣預報',
  weatherApiNote: 'Open-Meteo 天氣 API（支援未來16天）',
  loadingDays: '載入7天的資料',
  today: '今天',
  tomorrow: '明天',

  // Widget Settings
  selectWidgets: '選擇要顯示的小工具',
  widgetDescription: '勾選你想在首頁顯示的小工具',
  settings: '設定',

  // Stats Widget - stat labels
  statTodos: '待辦事項',
  statPaymentsThisWeek: '本週請款',
  statPaymentsNextWeek: '下週請款',
  statDepositsThisWeek: '本週甲存',
  statToursThisWeek: '本週出團',
  statToursThisMonth: '本月出團',
  statTourUnit: '團',

  // PNR Widget - section headers
  pnrFlightsPrefix: '航班',
  pnrSpecialRequestsPrefix: '特殊需求',
  pnrInfantPrefix: '嬰兒',
  pnrPlaceholder:
    '貼上 Amadeus PNR 電報...\n\n範例:\nRP/TPEW123ML/...   FUM2GY\n1.CHEN/WILLIAM MR\n2  BR 116 Y 15JAN 4 TPECTS HK2  0930 1405\nTK TL20JAN/1200',

  // Error messages
  errorFlightNumberRequired: '請輸入航班號碼',
  errorAirportRequired: '請選擇機場',
  errorWeatherNoData: '無法取得天氣資料',
  errorWeatherDateRange: '所選日期超出預報範圍',
  errorWeatherFetch: '獲取天氣資料失敗',
  errorInvalidAmount: '請輸入有效金額',
  errorSameCountry: '匯款國家和收款國家不能相同',
  errorQueryFailed: '查詢失敗，請稍後再試',
  errorSelectPassportAndDest: '請選擇護照國家和目的地',
  errorSamePassportAndDest: '護照國家和目的地不能相同',
  errorPastePnr: '請貼上 PNR 電報內容',
  errorParseFailed: '解析失敗：',
  errorClipboard: '無法存取剪貼簿',
  errorSaveFailed: '儲存失敗：',
  errorUnknown: '未知錯誤',

  // Remittance disclaimer
  remittanceDisclaimer: '⚠️ 此資訊僅供參考，實際費率請以各管道最新公告為準',

  // Common terms
  api: 'API',
  load: '載入',
  error: '錯誤',
  success: '成功',
  cancel: '取消',
  confirm: '確認',

  // currency-widget
  EXCHANGE_RATE_PREFIX: '匯率 (1 ',
  EXCHANGE_RATE_SUFFIX: ' = ? TWD)',
  CUSTOM_RATE: '已自訂匯率',
  DEFAULT_RATE_PREFIX: '預設匯率: ',
}

export const FLIGHT_WIDGET_LABELS = {
  DEPARTURE: '出發',
  ARRIVAL: '抵達',
  TAKEOFF: '起飛',
  LANDING: '降落',
  AIRCRAFT: '機型',
  TIME: '時間',
  FLIGHT: '航班',
  TERMINAL: '航廈',

  QUERYING_9420: '航班查詢',
  QUERYING_4439: '查詢航班或機場時刻表',
  LABEL_7892: '航班號',
  LABEL_4790: '機場時刻',
  LABEL_8457: '航班號碼',
  EXAMPLE_5877: '例如: BR191, CI100',
  SELECT: '選擇',
  LABEL_5475: '目的地',
  DATE: '日期',
  SELECT_5234: '選擇日期',
  QUERYING_974: '查詢中...',
  QUERYING_754: '查詢',
  STATUS: '狀態',
  LABEL_6009: '預計',
  AIRPORT_FLIGHTS_SUFFIX: ' 機場出發航班',
  FLIGHT_COUNT_PREFIX: ' · 共 ',
  FLIGHT_COUNT_SUFFIX: ' 班航班',
}
