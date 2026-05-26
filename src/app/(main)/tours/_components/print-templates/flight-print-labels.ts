/**
 * flight-print-template 專用標籤
 * 所有列印模板使用的中文字串集中管理
 */

// SVG airplane icon pointing UP (not rotated)
const PLANE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>'

export const FLIGHT_PRINT_LABELS = {
  // Company — 由呼叫端從 workspace 帶入，這裡只放預設值
  COMPANY_NAME: '',
  COMPANY_ADDRESS: '',
  COMPANY_TEL: '',
  COMPANY_FAX: '',
  COMPANY_EMAIL: '',
  FOOTER_COMPANY_LINE: '',

  // Passenger row
  PASSENGER_NAME_LABEL: '旅客姓名 Passenger',
  PNR_LABEL: '訂位代號 PNR',
  ETICKET_LABEL: '電子票號 E-Ticket',

  // Section titles
  ITINERARY_DETAILS_TITLE: '航班資訊 Itinerary Details',
  SPECIAL_REQUESTS_TITLE: '特殊需求 Special Requests',
  NOTICE_TITLE: '注意事項 Important Notice',
  ORDER_NUMBER_LABEL: '訂單編號',

  // Flight card
  AIRLINE_DOT: '*',
  HEADER_SEPARATOR: ' | ',
  CHECKED_BAGGAGE_LABEL: '託運',
  ECONOMY_CLASS: '經濟艙',
  DIRECT_FLIGHT: '直飛 Direct',
  STOPOVER_LABEL: '經停',
  TERMINAL_PREFIX: '第',
  TERMINAL_SUFFIX: '航廈',

  // Baggage keywords for OSI matching
  CHECKED_BAGGAGE_KEYWORD: '託運行李',
  CARRY_ON_KEYWORD: '手提行李',

  // Date
  YEAR_SUFFIX: '年',
  MONTH_SUFFIX: '月',
  DAY_SUFFIX: '日',
  WEEKDAY_SUN: '日',
  WEEKDAY_MON: '一',
  WEEKDAY_TUE: '二',
  WEEKDAY_WED: '三',
  WEEKDAY_THU: '四',
  WEEKDAY_FRI: '五',
  WEEKDAY_SAT: '六',

  // Notice items
  NOTICE_ITEMS: [
    '本文件僅供參考，實際資訊以航空公司及相關旅遊供應商為準。',
    '請確認姓名與護照完全一致，開票後更名可能無法辦理或需額外付費。',
    '國際線建議提前 3 小時抵達機場辦理報到手續。',
    '日本入境需事先完成 Visit Japan Web 線上申報。',
    '護照效期需超過預定返國日 6 個月以上。',
  ],

  // Page title
  PAGE_TITLE: (code: string) => `電子機票 - ${code}`,

  // Plane icon SVG (pointing UP)
  PLANE_ICON_SVG: PLANE_SVG,
} as const
