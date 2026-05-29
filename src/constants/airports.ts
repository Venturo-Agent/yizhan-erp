/**
 * 機場代號對應座標
 * 用於地圖預設中心點
 */

interface AirportCoordinate {
  code: string
  name: string
  city: string
  latitude: number
  longitude: number
}

const AIRPORT_COORDINATES: Record<string, AirportCoordinate> = {
  // 日本
  FUK: { code: 'FUK', name: '福岡機場', city: '福岡', latitude: 33.5859, longitude: 130.4507 },
  NRT: { code: 'NRT', name: '成田機場', city: '東京', latitude: 35.772, longitude: 140.3929 },
  HND: { code: 'HND', name: '羽田機場', city: '東京', latitude: 35.5494, longitude: 139.7798 },
  KIX: { code: 'KIX', name: '關西機場', city: '大阪', latitude: 34.4347, longitude: 135.2441 },
  ITM: { code: 'ITM', name: '伊丹機場', city: '大阪', latitude: 34.7855, longitude: 135.438 },
  NGO: {
    code: 'NGO',
    name: '中部國際機場',
    city: '名古屋',
    latitude: 34.8584,
    longitude: 136.8123,
  },
  CTS: { code: 'CTS', name: '新千歲機場', city: '札幌', latitude: 42.7752, longitude: 141.6925 },
  OKA: { code: 'OKA', name: '那霸機場', city: '沖繩', latitude: 26.1958, longitude: 127.6459 },
  KOJ: { code: 'KOJ', name: '鹿兒島機場', city: '鹿兒島', latitude: 31.8034, longitude: 130.7194 },
  OIT: { code: 'OIT', name: '大分機場', city: '大分', latitude: 33.4794, longitude: 131.7372 },
  KMJ: { code: 'KMJ', name: '熊本機場', city: '熊本', latitude: 32.8373, longitude: 130.8551 },
  NGS: { code: 'NGS', name: '長崎機場', city: '長崎', latitude: 32.9169, longitude: 129.9136 },
  MYJ: { code: 'MYJ', name: '松山機場', city: '松山', latitude: 33.8272, longitude: 132.6996 },
  HIJ: { code: 'HIJ', name: '廣島機場', city: '廣島', latitude: 34.4361, longitude: 132.9194 },
  TAK: { code: 'TAK', name: '高松機場', city: '高松', latitude: 34.2142, longitude: 134.0156 },
  OKJ: { code: 'OKJ', name: '岡山機場', city: '岡山', latitude: 34.7569, longitude: 133.8551 },
  SDJ: { code: 'SDJ', name: '仙台機場', city: '仙台', latitude: 38.1397, longitude: 140.917 },
  AOJ: { code: 'AOJ', name: '青森機場', city: '青森', latitude: 40.7347, longitude: 140.6906 },
  HKD: { code: 'HKD', name: '函館機場', city: '函館', latitude: 41.77, longitude: 140.8219 },
  KMI: { code: 'KMI', name: '宮崎機場', city: '宮崎', latitude: 31.8772, longitude: 131.4486 },
  ISG: { code: 'ISG', name: '石垣機場', city: '石垣', latitude: 24.3964, longitude: 124.2453 },
  MMY: { code: 'MMY', name: '宮古機場', city: '宮古', latitude: 24.7828, longitude: 125.295 },

  // 韓國
  ICN: { code: 'ICN', name: '仁川機場', city: '首爾', latitude: 37.4602, longitude: 126.4407 },
  GMP: { code: 'GMP', name: '金浦機場', city: '首爾', latitude: 37.5583, longitude: 126.7906 },
  PUS: { code: 'PUS', name: '金海機場', city: '釜山', latitude: 35.1795, longitude: 128.9382 },
  CJU: { code: 'CJU', name: '濟州機場', city: '濟州', latitude: 33.5113, longitude: 126.4929 },

  // 台灣
  TPE: { code: 'TPE', name: '桃園機場', city: '台北', latitude: 25.0797, longitude: 121.2342 },
  TSA: { code: 'TSA', name: '松山機場', city: '台北', latitude: 25.0694, longitude: 121.5525 },
  RMQ: { code: 'RMQ', name: '台中機場', city: '台中', latitude: 24.2647, longitude: 120.6206 },
  KHH: { code: 'KHH', name: '高雄機場', city: '高雄', latitude: 22.5771, longitude: 120.35 },

  // 東南亞
  BKK: { code: 'BKK', name: '素萬那普機場', city: '曼谷', latitude: 13.69, longitude: 100.7501 },
  DMK: { code: 'DMK', name: '廊曼機場', city: '曼谷', latitude: 13.9126, longitude: 100.6068 },
  HKT: { code: 'HKT', name: '普吉機場', city: '普吉', latitude: 8.1132, longitude: 98.3169 },
  CNX: { code: 'CNX', name: '清邁機場', city: '清邁', latitude: 18.7668, longitude: 98.9625 },
  SGN: {
    code: 'SGN',
    name: '新山一機場',
    city: '胡志明市',
    latitude: 10.8188,
    longitude: 106.6519,
  },
  HAN: { code: 'HAN', name: '內排機場', city: '河內', latitude: 21.2212, longitude: 105.8072 },
  DAD: { code: 'DAD', name: '峴港機場', city: '峴港', latitude: 16.0439, longitude: 108.1994 },
  SIN: { code: 'SIN', name: '樟宜機場', city: '新加坡', latitude: 1.3644, longitude: 103.9915 },
  KUL: { code: 'KUL', name: '吉隆坡機場', city: '吉隆坡', latitude: 2.7456, longitude: 101.7099 },
  MNL: { code: 'MNL', name: '馬尼拉機場', city: '馬尼拉', latitude: 14.5086, longitude: 121.0197 },
  CEB: { code: 'CEB', name: '宿霧機場', city: '宿霧', latitude: 10.3075, longitude: 123.9794 },
  DPS: { code: 'DPS', name: '峇里島機場', city: '峇里島', latitude: -8.7482, longitude: 115.1672 },

  // 中國
  PVG: { code: 'PVG', name: '浦東機場', city: '上海', latitude: 31.1443, longitude: 121.8083 },
  SHA: { code: 'SHA', name: '虹橋機場', city: '上海', latitude: 31.1979, longitude: 121.3363 },
  PEK: { code: 'PEK', name: '首都機場', city: '北京', latitude: 40.0799, longitude: 116.6031 },
  PKX: { code: 'PKX', name: '大興機場', city: '北京', latitude: 39.5098, longitude: 116.4107 },
  CAN: { code: 'CAN', name: '白雲機場', city: '廣州', latitude: 23.3924, longitude: 113.2988 },
  SZX: { code: 'SZX', name: '寶安機場', city: '深圳', latitude: 22.6393, longitude: 113.8106 },
  HKG: { code: 'HKG', name: '香港機場', city: '香港', latitude: 22.308, longitude: 113.9185 },
  MFM: { code: 'MFM', name: '澳門機場', city: '澳門', latitude: 22.1496, longitude: 113.5915 },
  CTU: { code: 'CTU', name: '成都機場', city: '成都', latitude: 30.5785, longitude: 103.9471 },
  TFU: { code: 'TFU', name: '天府機場', city: '成都', latitude: 30.3147, longitude: 104.4456 },
  KMG: { code: 'KMG', name: '昆明機場', city: '昆明', latitude: 24.9924, longitude: 102.7432 },
  XIY: { code: 'XIY', name: '西安機場', city: '西安', latitude: 34.4471, longitude: 108.7516 },
  CSX: { code: 'CSX', name: '長沙機場', city: '長沙', latitude: 28.1892, longitude: 113.22 },
  WUH: { code: 'WUH', name: '天河機場', city: '武漢', latitude: 30.7838, longitude: 114.2081 },
  NKG: { code: 'NKG', name: '祿口機場', city: '南京', latitude: 31.742, longitude: 118.8622 },
  HGH: { code: 'HGH', name: '蕭山機場', city: '杭州', latitude: 30.2295, longitude: 120.4343 },
  XMN: { code: 'XMN', name: '高崎機場', city: '廈門', latitude: 24.544, longitude: 118.1277 },
  FOC: { code: 'FOC', name: '長樂機場', city: '福州', latitude: 25.9351, longitude: 119.6633 },
  TAO: { code: 'TAO', name: '流亭機場', city: '青島', latitude: 36.2661, longitude: 120.3744 },
  DLC: { code: 'DLC', name: '周水子機場', city: '大連', latitude: 38.9657, longitude: 121.5386 },
  SHE: { code: 'SHE', name: '桃仙機場', city: '瀋陽', latitude: 41.6398, longitude: 123.4833 },
  HRB: { code: 'HRB', name: '太平機場', city: '哈爾濱', latitude: 45.6234, longitude: 126.2503 },
}

/**
 * 根據機場代號取得座標
 */
export function getAirportCoordinate(code: string): AirportCoordinate | null {
  return AIRPORT_COORDINATES[code.toUpperCase()] || null
}

/**
 * 從團的資訊推斷機場代號
 * 優先順序：destination_airport > tour_code 前綴
 */
export function inferAirportCode(tour: {
  destination_airport?: string | null
  tour_code?: string | null
}): string | null {
  // 1. 直接使用 destination_airport
  if (tour.destination_airport) {
    return tour.destination_airport.toUpperCase()
  }

  // 2. 從 tour_code 前綴推斷（如 FUK260702A → FUK）
  if (tour.tour_code) {
    const prefix = tour.tour_code.substring(0, 3).toUpperCase()
    if (AIRPORT_COORDINATES[prefix]) {
      return prefix
    }
  }

  return null
}
