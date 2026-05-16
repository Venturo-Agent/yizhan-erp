/**
 * 旅遊團航班相關型別定義
 * 注意：這是旅遊團用的 FlightInfo / FlightSegment，與 @/types/flight.types 的通用 FlightInfo 不同
 * 差異：旅遊團版本欄位為必填（非 optional），且支援多段航班（segments）
 */

// 單一航班段資訊（用於轉機或多段航班）
export interface FlightSegment {
  airline: string // 航空公司
  flightNumber: string // 班次
  departureAirport: string // 出發機場代碼
  arrivalAirport: string // 抵達機場代碼
  departureDate?: string | null // 出發日期
  departureTime?: string | null // 出發時間
  arrivalTime?: string | null // 抵達時間
  status?: string // 訂位狀態（如：HK）
  class?: string // 艙等
}

// 航班資訊（含多段航班支援）
export interface FlightInfo {
  airline: string // 航空公司（主要航班）
  flightNumber: string // 班次（主要航班）
  departureAirport: string // 出發機場代碼（如：TPE）
  departureTime: string // 出發時間（如：06:50）
  departureDate?: string // 出發日期（如：10/21）
  arrivalAirport: string // 抵達機場代碼（如：FUK）
  arrivalTime: string // 抵達時間（如：09:55）
  duration?: string // 飛行時間（如：2小時5分）
  // 多段航班支援（轉機或分批出發）
  pnr?: string // PNR 訂位代號
  segments?: FlightSegment[] // 所有航班段（含轉機）
}
