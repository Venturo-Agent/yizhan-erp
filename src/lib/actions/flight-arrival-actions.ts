'use server'

import { logger } from '@/lib/utils/logger'
import {
  loadReferenceData,
  getApiKey,
  getAirportChineseName,
  getAirlineChineseName,
  formatTime,
  getStatusText,
  type AirportFlightItem,
  type ApiFlightData,
} from './flight-utils'

/**
 * 查詢機場抵達航班
 * AeroDataBox API: /flights/airports/iata/{airportCode}/{fromLocal}/{toLocal}
 *
 * 注意：此 function 前綴 _ 代表尚未掛上公開 API route、暫留備用。
 */
export async function searchAirportArrivalsAction(
  airportCode: string,
  date: string,
  originFilter?: string
): Promise<{ data?: AirportFlightItem[]; error?: string }> {
  // 載入機場/航空公司參考資料（從資料庫，有快取）
  await loadReferenceData()

  const apiKey = await getApiKey()

  if (!apiKey) {
    logger.error('❌ AeroDataBox API key is not configured.')
    return { error: 'API 金鑰未設定，請聯絡系統主管。' }
  }

  const fromTime = `${date}T00:00`
  const toTime = `${date}T23:59`
  const cleanAirportCode = airportCode.toUpperCase()

  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${cleanAirportCode}/${fromTime}/${toTime}?direction=Arrival&withCancelled=true`

  try {
    logger.log(`🔍 查詢機場抵達航班: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      logger.error(`❌ AeroDataBox API Error: ${response.status} - ${errorText}`)

      if (response.status === 404) {
        return { error: '找不到該機場的資訊。' }
      }
      if (response.status === 429) {
        return { error: '本月查詢額度已用完，請下個月再試。' }
      }
      if (response.status === 401 || response.status === 403) {
        return { error: 'API 金鑰無效或已過期，請聯絡系統主管。' }
      }
      return { error: `查詢失敗 (${response.status})，請稍後再試。` }
    }

    // 🔧 修復：JSON 解析加上錯誤處理
    let apiData
    try {
      apiData = await response.json()
    } catch (jsonError) {
      logger.error('機場抵達航班 API JSON 解析失敗:', jsonError)
      return { error: 'API 回應格式錯誤，請稍後再試。' }
    }
    const arrivals = apiData.arrivals || []

    // 注意：Airport Arrivals API 使用 movement 結構
    // movement.airport 是出發機場（航班從哪裡來）
    // movement.scheduledTime 是抵達時間
    let flights: AirportFlightItem[] = arrivals.map((flight: ApiFlightData) => {
      // 優先使用 movement（Airport API），fallback 到 arrival（Flight API）
      const movement = flight.movement || flight.arrival
      const arrTime = movement?.scheduledTime?.local || movement?.scheduledTime?.utc
      const estTime = movement?.revisedTime?.local || movement?.revisedTime?.utc
      const airlineCode = flight.airline?.iata || ''
      // 出發地：movement.airport 是出發機場（對於抵達航班）
      const originAirport = flight.movement?.airport || flight.departure?.airport
      const originIata = originAirport?.iata || ''
      return {
        flightNumber: flight.number || '',
        airline: getAirlineChineseName(airlineCode, flight.airline?.name || ''),
        airlineCode: airlineCode,
        origin: getAirportChineseName(originIata, originAirport?.name || ''),
        originIata: originIata,
        destination: getAirportChineseName(cleanAirportCode, cleanAirportCode),
        destinationIata: cleanAirportCode,
        scheduledTime: formatTime(arrTime),
        estimatedTime: estTime ? formatTime(estTime) : undefined,
        status: getStatusText(flight.status || 'Unknown'),
        terminal: movement?.terminal,
        gate: movement?.gate,
      }
    })

    // 如果有指定出發地，過濾結果
    if (originFilter) {
      const filterUpper = originFilter.toUpperCase()
      flights = flights.filter(
        f =>
          f.originIata === filterUpper || (f.origin && f.origin.toUpperCase().includes(filterUpper))
      )
    }

    // 按時間排序
    flights.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

    logger.log(`✅ 機場抵達航班查詢成功: ${cleanAirportCode}，共 ${flights.length} 班`)
    return { data: flights }
  } catch (error) {
    logger.error('Failed to fetch airport arrivals:', error)
    return { error: '查詢機場航班時發生網路錯誤。' }
  }
}
