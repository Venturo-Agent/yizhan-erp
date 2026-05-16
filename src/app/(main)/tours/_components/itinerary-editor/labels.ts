/**
 * 行程編輯器 UI 標籤常量
 * （從 proposals/constants 搬過來）
 */

export const DAILY_SCHEDULE_EDITOR_LABELS = {
  抵達目的地: '抵達目的地',
  返回台灣: '返回台灣',
  今日行程標題: '今日行程標題',
  飯店早餐: '飯店早餐',
  敬請自理: '敬請自理',
  住宿飯店: '住宿飯店',
  續住: '續住',
}

export const ITINERARY_DIALOG_LABELS = {
  早餐: '早餐',
  午餐: '午餐',
  晚餐: '晚餐',
  日: '日',
  一: '一',
  二: '二',
  三: '三',
  四: '四',
  五: '五',
  六: '六',
  從景點庫選擇: '從景點庫選擇',
  ADD_2951: '新增活動',
  ADD_2139: '點擊「新增活動」開始排程',
  TIME: '時間',
  LABEL_7032: '活動名稱',
  景點名稱: '景點 / 活動名稱',
}

export const TOUR_REQUEST_FORM_DIALOG_LABELS = {
  LABEL_9388: '航班資訊（選填）',
  LABEL_7790: '去程航班',
  LABEL_2327: '回程航班',
  PLEASE_SELECT_4482: '此航班有多個航段，請選擇：',
  CANCEL: '取消',
  日期: '日期',
}

export const BROCHURE_PREVIEW_DIALOG_LABELS = {
  簡易行程表: '簡易行程表',
  編輯: '編輯',
  行程表: '行程表',
  目的地標籤: '目的地：',
  出發日期標籤: '出發日期：',
  行程天數標籤: '行程天數：',
  天: '天',
  去程航班: '去程航班：',
  回程航班: '回程航班：',
  日期: '日期',
  行程內容: '行程內容',
  住宿: '住宿',
  本行程表由: '本行程表由',
  提供: '提供',
}

export const AI_GENERATE_DIALOG_LABELS = {
  LABEL_5475: '目的地',
  未設定: '未設定',
  LABEL_1983: '行程天數',
  LABEL_4587: '住宿狀態',
  LABEL_1928: '抵達時間',
  LABEL_4695: '出發時間',
  LABEL_121: '行程風格',
  CANCEL: '取消',
  GENERATING_7316: '生成中...',
  GENERATING_9221: '開始排程',
}

export const VERSION_DROPDOWN_LABELS = {
  版本歷史: (n: number) => `版本歷史 (${n})`,
  主版本: '主版本',
  當前編輯中: '當前編輯中',
  當前: '當前',
  版本: (n: number) => `版本 ${n}`,
}

export const FLIGHT_SECTION_LABELS = {
  航班號碼_如_BR108: '航班號碼 (如 BR108)',
  航班號碼_如_BR107: '航班號碼 (如 BR107)',
}

export const ITINERARY_EDITOR_LABELS = {
  // === PackageItineraryDialog ===
  packageItinerary: {
    loading: '載入中...',
    editTitle: '編輯行程表',
    createTitle: '建立行程表',
    previewBtn: '預覽',
    itineraryTitleLabel: '行程標題 *',
    itineraryTitlePlaceholder: '行程表標題',
    destinationLabel: '目的地',
    notSet: '(未設定)',
    daysLabel: '行程天數',
    daysUnit: (n: number) => `${n} 天`,
    departDateLabel: '出發日期',
    returnDateLabel: '回程日期',
    aiBtn: 'AI 排行程',
    saveAsNewVersion: '另存新版本',
    update: '更新行程',
    create: '建立行程',
    timelineMode: '時間軸行程',
    simpleMode: '每日行程',
    switchSimple: '簡易模式',
    switchTimeline: '時間軸',
    switchSimpleTitle: '切換簡易模式',
    switchTimelineTitle: '切換時間軸模式',
    defaultCompany: '旅行社',
  },

  // === BrochurePreview ===
  brochurePreview: {
    versionLabel: (version: number) => `版本 ${version}`,
    mainVersion: '主版本',
  },

  // === ItineraryPreview ===
  itineraryPreview: {
    title: '簡易行程表',
    editBtn: '編輯',
    printBtn: '列印',
    defaultTitle: '行程表',
    destinationLabel: '目的地：',
    departDateLabel: '出發日期：',
    daysLabel: '行程天數：',
    daysUnit: (n: number) => `${n} 天`,
    outboundFlightLabel: '去程航班：',
    returnFlightLabel: '回程航班：',
    dateCol: '日期',
    contentCol: '行程內容',
    breakfastCol: '早餐',
    lunchCol: '午餐',
    dinnerCol: '晚餐',
    hotelCol: '住宿',
    footer: (company: string) => `本行程表由 ${company} 提供`,
  },
} as const

export const PACKAGE_ITINERARY_DIALOG_LABELS = {
  旅行社: '旅行社',
  編輯行程表: '編輯行程表',
  建立行程表: '建立行程表',
  行程表標題: '行程表標題',
  未設定_2: '(未設定)',
  更新行程: '更新行程',
  建立行程: '建立行程',
  時間軸行程: '時間軸行程',
  每日行程: '每日行程',
  切換簡易模式: '切換簡易模式',
  切換時間軸模式: '切換時間軸模式',
  簡易模式: '簡易模式',
  時間軸: '時間軸',

  LOADING_6912: '載入中...',
  PREVIEW: '預覽',
  LABEL_5957: '行程標題 *',
  LABEL_5475: '目的地',
  LABEL_6915: '行程天數',
  LABEL_4513: '出發日期',
  LABEL_2731: '回程日期',
  LABEL_6621: '另存新版本',
}

export const ACCOMMODATION_CHANGE_DIALOG_LABELS = {
  住宿變更警示: '住宿變更警示',
  偵測到以下住宿變更: '偵測到以下住宿變更：',
  第: '第',
  天: '天',
  天_dash: '天 —',
  報價單影響: '⚠ 報價單影響',
  以下住宿已有報價成本_變更後將清除: '以下住宿已有報價成本，變更後將清除：',
  需求單影響: '🚨 需求單影響',
  以下住宿已發出需求單_變更後需通知供應商取消: '以下住宿已發出需求單，變更後需通知供應商取消：',
  取消: '取消',
  確認變更: '確認變更',
} as const

export const DAY_ROW_LABELS = {
  續住_前綴: '續住 (',
  拖拽酒店到此處: '拖拽酒店到此處...',
  續住: '續住',
} as const
