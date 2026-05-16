'use server'

import { logger } from '@/lib/utils/logger'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getIntegrationConfig } from '@/lib/integrations/get-integration-config'

// ============================================
// 機場/航空公司名稱快取（統一從資料庫讀取）
// ============================================
interface RefCache {
  airports: Map<string, string> // iata_code -> name_zh
  airlines: Map<string, string> // iata_code -> name_zh
  lastFetched: number
}

const CACHE_TTL = 60 * 60 * 1000 // 1 小時
let refCache: RefCache = {
  airports: new Map(),
  airlines: new Map(),
  lastFetched: 0,
}

/**
 * 載入參考資料（機場、航空公司名稱）
 */
export async function loadReferenceData(): Promise<void> {
  const now = Date.now()
  if (refCache.lastFetched > 0 && now - refCache.lastFetched < CACHE_TTL) {
    return // 快取有效
  }

  const supabase = getSupabaseAdminClient()

  const [airportsResult, airlinesResult] = await Promise.all([
    supabase.from('ref_airports').select('iata_code, name_zh'),
    supabase.from('ref_airlines').select('iata_code, name_zh').eq('is_active', true),
  ])

  if (airportsResult.data) {
    refCache.airports = new Map(
      airportsResult.data.map(row => [row.iata_code, row.name_zh || row.iata_code])
    )
  }

  if (airlinesResult.data) {
    refCache.airlines = new Map(
      airlinesResult.data.map(row => [row.iata_code, row.name_zh || row.iata_code])
    )
  }

  refCache.lastFetched = now
  logger.log(
    `✅ 航班參考資料已載入: ${refCache.airports.size} 機場, ${refCache.airlines.size} 航空公司`
  )
}

// 航班資料介面
export interface FlightData {
  flightNumber: string
  airline: string
  departure: {
    airport: string
    iata: string
    terminal?: string
    gate?: string
    time: string
    scheduledTime?: string
    actualTime?: string
    delay?: number
  }
  arrival: {
    airport: string
    iata: string
    terminal?: string
    gate?: string
    time: string
    scheduledTime?: string
    actualTime?: string
  }
  status: string
  statusText: string
  aircraft?: string
  date: string
  duration?: string
}

// 機場航班列表項目
export interface AirportFlightItem {
  flightNumber: string
  airline: string
  airlineCode: string
  destination: string
  destinationIata: string
  origin?: string
  originIata?: string
  scheduledTime: string
  estimatedTime?: string
  status: string
  terminal?: string
  gate?: string
}

// API 回傳的航班資料格式
export interface ApiFlightData {
  number?: string
  airline?: { iata?: string; name?: string }
  departure?: {
    airport?: { iata?: string; name?: string }
    scheduledTime?: { local?: string; utc?: string }
    revisedTime?: { local?: string; utc?: string }
    terminal?: string
    gate?: string
  }
  arrival?: {
    airport?: { iata?: string; name?: string }
    scheduledTime?: { local?: string; utc?: string }
    revisedTime?: { local?: string; utc?: string }
    terminal?: string
    gate?: string
  }
  // Airport Departures/Arrivals API 使用 movement 結構
  movement?: {
    airport?: { iata?: string; name?: string }
    scheduledTime?: { local?: string; utc?: string }
    revisedTime?: { local?: string; utc?: string }
    terminal?: string
    gate?: string
  }
  status?: string
}

/**
 * 取得 AeroDataBox API Key
 *
 * 優先序：
 *   1. workspace_integrations.flight_search.api_key（per-tenant、加密儲存）
 *   2. env AERODATABOX_API_KEY（platform 共用 fallback、漫途過渡期用）
 */
export async function getApiKey(): Promise<string | null> {
  try {
    const auth = await getServerAuth()
    if (auth.success && auth.data.workspaceId) {
      const cfg = await getIntegrationConfig(auth.data.workspaceId, 'flight_search')
      if (cfg?.api_key) return cfg.api_key
    }
  } catch (err) {
    // getServerAuth 在沒 session 時會丟、忽略、fallback env
    logger.warn('flight-actions: 無法從 workspace_integrations 取 key、fallback env', err)
  }
  return process.env.AERODATABOX_API_KEY || null
}

/**
 * 格式化時間為 HH:mm
 * API 回傳的 local 時間已經是當地時間（如 "2025-12-09 14:35+09:00"）
 * 直接提取 HH:mm，不做時區轉換
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '--:--'
  try {
    // AeroDataBox 格式: "2025-12-09 14:35+09:00" 或 ISO 格式
    // 直接從字串中提取時間部分（當地時間）
    const timeMatch = dateString.match(/(\d{2}):(\d{2})/)
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`
    }
    // fallback: 如果格式不符，嘗試解析
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '--:--'
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '--:--'
  }
}

/**
 * 計算飛行時間
 */
export function calculateDuration(departure: string, arrival: string): string {
  try {
    const dep = new Date(departure)
    const arr = new Date(arrival)
    const diffMs = arr.getTime() - dep.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  } catch {
    return ''
  }
}

/**
 * 轉換航班狀態為中文
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    Unknown: '未知',
    Expected: '預計',
    EnRoute: '飛行中',
    CheckIn: '報到中',
    Boarding: '登機中',
    GateClosed: '登機門已關',
    Departed: '已起飛',
    Delayed: '延誤',
    Approaching: '即將抵達',
    Arrived: '已抵達',
    Canceled: '已取消',
    Diverted: '改降',
    CanceledUncertain: '可能取消',
  }
  return statusMap[status] || status
}

/**
 * 機場中文名稱（從快取讀取，統一資料來源）
 */
export function getAirportChineseName(iataCode: string, englishName: string): string {
  return refCache.airports.get(iataCode) || englishName
}

/**
 * 航空公司中文名稱（從快取讀取，統一資料來源）
 */
export function getAirlineChineseName(iataCode: string, englishName: string): string {
  return refCache.airlines.get(iataCode) || englishName
}

/**
 * 檢查航班資料是否完整
 * 返回缺少的欄位列表
 */
export function validateFlightData(flight: ApiFlightData): string[] {
  const missing: string[] = []
  const dep = flight.departure || {}
  const arr = flight.arrival || {}

  if (!dep.scheduledTime?.local && !dep.scheduledTime?.utc) {
    missing.push('出發時間')
  }
  if (!dep.airport?.iata) {
    missing.push('出發機場代碼')
  }
  if (!arr.scheduledTime?.local && !arr.scheduledTime?.utc) {
    missing.push('抵達時間')
  }
  if (!arr.airport?.iata) {
    missing.push('抵達機場代碼')
  }

  return missing
}

/**
 * 將 API 回傳的單筆航班資料轉換為 FlightData 格式
 */
export function transformFlightData(
  flight: ApiFlightData,
  flightDate: string,
  cleanFlightNumber: string
): FlightData {
  const dep = flight.departure || {}
  const arr = flight.arrival || {}

  // AeroDataBox 時間格式: scheduledTime.local = "2025-12-09 14:35+09:00"
  const depScheduledTime = dep.scheduledTime?.local || dep.scheduledTime?.utc
  const arrScheduledTime = arr.scheduledTime?.local || arr.scheduledTime?.utc
  const depActualTime = dep.revisedTime?.local || dep.revisedTime?.utc
  const arrActualTime = arr.revisedTime?.local || arr.revisedTime?.utc

  const airlineCode = flight.airline?.iata || ''
  const airlineName = getAirlineChineseName(airlineCode, flight.airline?.name || '')
  const depIata = dep.airport?.iata || ''
  const arrIata = arr.airport?.iata || ''

  return {
    flightNumber: flight.number || cleanFlightNumber,
    airline: airlineName,
    departure: {
      airport: getAirportChineseName(depIata, dep.airport?.name || ''),
      iata: depIata,
      terminal: dep.terminal,
      gate: dep.gate,
      time: formatTime(depScheduledTime),
      scheduledTime: formatTime(depScheduledTime),
      actualTime: depActualTime ? formatTime(depActualTime) : undefined,
    },
    arrival: {
      airport: getAirportChineseName(arrIata, arr.airport?.name || ''),
      iata: arrIata,
      terminal: arr.terminal,
      gate: arr.gate,
      time: formatTime(arrScheduledTime),
      scheduledTime: formatTime(arrScheduledTime),
      actualTime: arrActualTime ? formatTime(arrActualTime) : undefined,
    },
    status: flight.status || 'Unknown',
    statusText: getStatusText(flight.status || 'Unknown'),
    aircraft: (flight as ApiFlightData & { aircraft?: { model?: string } }).aircraft?.model,
    date: flightDate,
    duration:
      depScheduledTime && arrScheduledTime
        ? calculateDuration(depScheduledTime, arrScheduledTime)
        : undefined,
  }
}
