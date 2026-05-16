/**
 * PNR 解析器類型定義
 */

/** PNR 解析來源格式 */
type PnrSourceFormat =
  | 'ticket_order_detail'
  | 'e_ticket'
  | 'amadeus_pnr'
  | 'html_confirmation'
  | 'trip_com'

/**
 * recordLocator 來源、決定 UI 信心度提示
 * - rp_header：從 RP/SIN1AB1234/SIN1AB1234 抓到（最可信）
 * - segment_tail：從 segment 末尾「CI/D2SKV5」抓到
 * - ssr_duplicate：從 SSR OTHS「DUPLICATE OF FXGZDF」抓到
 * - tk_line：從 TK 行附近抓到
 * - other：別的 parser（e-ticket、HTML、trip.com）回傳
 * - none：抽不到、需要 user 手動填
 */
export type RecordLocatorSource =
  | 'rp_header'
  | 'segment_tail'
  | 'ssr_duplicate'
  | 'tk_line'
  | 'other'
  | 'none'

export interface ParsedPNR {
  recordLocator: string
  recordLocatorSource?: RecordLocatorSource
  passengerNames: string[]
  passengers: PassengerInfo[]
  segments: FlightSegment[]
  ticketingDeadline: Date | null
  cancellationDeadline: Date | null
  specialRequests: EnhancedSSR[]
  otherInfo: EnhancedOSI[]
  contactInfo: string[]
  validation: ValidationResult
  fareData: ParsedFareData | null
  ticketNumbers: Array<{ number: string; passenger: string }>
  sourceFormat?: PnrSourceFormat
}

/**
 * 旅客資訊（含嬰兒/兒童）
 */
export interface PassengerInfo {
  index: number
  name: string
  type: 'ADT' | 'CHD' | 'INF' | 'INS'
  birthDate?: string
  infant?: {
    name: string
    birthDate: string
  }
}

/**
 * 票價解析結果
 */
export interface ParsedFareData {
  currency: string
  baseFare: number | null
  taxes: number | null
  totalFare: number
  fareBasis: string | null
  validatingCarrier: string | null
  taxBreakdown: TaxItem[]
  perPassenger: boolean
  raw: string
}

export interface TaxItem {
  code: string
  amount: number
  currency?: string
}

export interface EnhancedSSR {
  code: string
  description?: string
  segments?: number[]
  passenger?: number
  airline?: string
  raw: string
  category: SSRCategory
}

export interface EnhancedOSI {
  airline: string
  message: string
  raw: string
  category: OSICategory
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export enum SSRCategory {
  MEAL = 'MEAL',
  MEDICAL = 'MEDICAL',
  SEAT = 'SEAT',
  BAGGAGE = 'BAGGAGE',
  FREQUENT = 'FREQUENT',
  PASSENGER = 'PASSENGER',
  OTHER = 'OTHER',
}

export enum OSICategory {
  CONTACT = 'CONTACT',
  MEDICAL = 'MEDICAL',
  VIP = 'VIP',
  GENERAL = 'GENERAL',
}

export interface FlightSegment {
  lineNumber?: number
  airline: string
  flightNumber: string
  class: string
  departureDate: string
  origin: string
  destination: string
  status: string
  passengers: number
  departureTime?: string
  arrivalTime?: string
  aircraft?: string
  departureTerminal?: string
  arrivalTerminal?: string
  meal?: string
  isDirect?: boolean
  duration?: string
  via?: Array<{
    city: string
    airport?: string
    airportName?: string
    duration?: string
  }>
}

/**
 * HTML 確認單解析結果
 */
export interface ParsedHTMLConfirmation {
  recordLocator: string
  passengerNames: string[]
  segments: Array<{
    airline: string
    flightNumber: string
    departureDate: string
    departureTime: string
    departureAirport: string
    arrivalTime: string
    arrivalAirport: string
    cabin: string
    status: string
    aircraft?: string
    terminal?: string
    duration?: string
    meal?: boolean
  }>
  ticketNumbers: Array<{ number: string; passenger: string }>
  airlineContacts: string[]
}
