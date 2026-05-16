/**
 * 航班資訊統一類型定義
 *
 * 所有欄位為 optional，各元件按需使用
 * 取代散落在各處的重複 FlightInfo interface
 */

export interface FlightInfo {
  /** 航空公司 */
  airline?: string | null
  /** 航班號 */
  flightNumber?: string | null
  /** 出發機場 IATA */
  departureAirport?: string | null
  /** 出發機場中文名 */
  departureAirportName?: string | null
  /** 抵達機場 IATA */
  arrivalAirport?: string | null
  /** 抵達機場中文名 */
  arrivalAirportName?: string | null
  /** 出發時間 (HH:mm) */
  departureTime?: string | null
  /** 抵達時間 (HH:mm) */
  arrivalTime?: string | null
  /** 出發日期 (YYYY-MM-DD) */
  departureDate?: string | null
  /** 飛行時長 */
  duration?: string | null
  /** 是否有餐點 */
  hasMeal?: boolean | null
}

/**
 * 航班資訊（必填版本）
 * 用於表單提交等需要完整資料的場景
 */
export interface FlightInfoRequired {
  airline: string
  flightNumber: string
  departureAirport: string
  arrivalAirport: string
  departureTime: string
  arrivalTime: string
  departureDate?: string
  duration?: string
}

/**
 * 航段資訊（供航班搜尋選擇用）
 */
export interface FlightSegmentInfo {
  flightNumber: string
  airline: string
  departureAirport: string
  departureAirportName?: string
  arrivalAirport: string
  arrivalAirportName?: string
  departureTime: string
  arrivalTime: string
  departureDate?: string
}
