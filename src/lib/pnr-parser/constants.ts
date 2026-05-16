/**
 * PNR 解析器常量
 */

import { SSRCategory, OSICategory } from './types'

/**
 * SSR代碼分類映射
 */
export const SSR_CATEGORIES: Record<string, SSRCategory> = {
  // 餐食類
  VGML: SSRCategory.MEAL,
  AVML: SSRCategory.MEAL,
  HNML: SSRCategory.MEAL,
  KOSV: SSRCategory.MEAL,
  MOML: SSRCategory.MEAL,
  SPML: SSRCategory.MEAL,
  BBML: SSRCategory.MEAL,
  CHML: SSRCategory.MEAL,
  GFML: SSRCategory.MEAL,
  // 醫療類
  WCHR: SSRCategory.MEDICAL,
  WCHS: SSRCategory.MEDICAL,
  WCHC: SSRCategory.MEDICAL,
  MAAS: SSRCategory.MEDICAL,
  MEDA: SSRCategory.MEDICAL,
  OXRG: SSRCategory.MEDICAL,
  DEAF: SSRCategory.MEDICAL,
  BLND: SSRCategory.MEDICAL,
  DPNA: SSRCategory.MEDICAL,
  // 座位類
  RQST: SSRCategory.SEAT,
  NSSA: SSRCategory.SEAT,
  NSST: SSRCategory.SEAT,
  EXST: SSRCategory.SEAT,
  BULK: SSRCategory.SEAT,
  ADIR: SSRCategory.SEAT,
  // 行李類
  CBBG: SSRCategory.BAGGAGE,
  BIKE: SSRCategory.BAGGAGE,
  GOLF: SSRCategory.BAGGAGE,
  SURF: SSRCategory.BAGGAGE,
  SKIS: SSRCategory.BAGGAGE,
  OOXY: SSRCategory.BAGGAGE,
  // 會員類
  FQTV: SSRCategory.FREQUENT,
  FQTU: SSRCategory.FREQUENT,
  FQTR: SSRCategory.FREQUENT,
  // 旅客類型
  INFT: SSRCategory.PASSENGER,
  CHLD: SSRCategory.PASSENGER,
}

/**
 * OSI關鍵字分類映射
 */
export const OSI_KEYWORDS: Array<{ keywords: string[]; category: OSICategory }> = [
  { keywords: ['CONTACT', 'PHONE', 'EMAIL', 'MOBILE'], category: OSICategory.CONTACT },
  { keywords: ['MEDICAL', 'DOCTOR', 'OXYGEN', 'MEDICATION'], category: OSICategory.MEDICAL },
  { keywords: ['VIP', 'PRIORITY', 'SPECIAL', 'CELEBRITY'], category: OSICategory.VIP },
]

/**
 * 月份對照表
 */
export const MONTH_MAP: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
}

/**
 * 月份名稱陣列
 */
export const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

/**
 * 機場代碼對照表（英文名稱）
 */
export const AIRPORT_MAP_EN: Record<string, string> = {
  TAIPEI: 'TPE',
  TAOYUAN: 'TPE',
  'TAIPEI TAIWAN': 'TPE',
  SONGSHAN: 'TSA',
  KAOHSIUNG: 'KHH',
  SHANGHAI: 'PVG',
  'SHANGHAI PUDONG': 'PVG',
  'HONG KONG': 'HKG',
  TOKYO: 'NRT',
  NARITA: 'NRT',
  HANEDA: 'HND',
  OSAKA: 'KIX',
  KANSAI: 'KIX',
  SEOUL: 'ICN',
  INCHEON: 'ICN',
  SINGAPORE: 'SIN',
  BANGKOK: 'BKK',
  HARBIN: 'HRB',
  'HARBIN TAIPING': 'HRB',
  MACAU: 'MFM',
}

/**
 * 機場代碼對照表（中文名稱）
 */
export const AIRPORT_MAP_ZH: Record<string, string> = {
  哈爾濱: 'HRB',
  哈爾濱太平: 'HRB',
  廈門: 'XMN',
  廈門高崎: 'XMN',
  濟南: 'TNA',
  濟南遙牆: 'TNA',
  北京首都: 'PEK',
  北京大興: 'PKX',
  上海浦東: 'PVG',
  上海虹橋: 'SHA',
  廣州白雲: 'CAN',
  深圳寶安: 'SZX',
  成都天府: 'TFU',
  成都雙流: 'CTU',
  杭州蕭山: 'HGH',
  南京祿口: 'NKG',
  重慶江北: 'CKG',
  西安咸陽: 'XIY',
  昆明長水: 'KMG',
  桃園: 'TPE',
  臺灣桃園: 'TPE',
  松山: 'TSA',
  臺北松山: 'TSA',
  高雄: 'KHH',
  高雄小港: 'KHH',
  東京成田: 'NRT',
  東京羽田: 'HND',
  大阪關西: 'KIX',
  名古屋中部: 'NGO',
  福岡: 'FUK',
  那霸: 'OKA',
  香港: 'HKG',
  澳門: 'MFM',
  首爾仁川: 'ICN',
  首爾金浦: 'GMP',
  新加坡樟宜: 'SIN',
  曼谷素萬那普: 'BKK',
  曼谷廊曼: 'DMK',
  清邁: 'CNX',
  吉隆坡: 'KUL',
}
