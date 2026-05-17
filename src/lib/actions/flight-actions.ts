'use server'

import { logger } from '@/lib/utils/logger'
import {
  loadReferenceData,
  getApiKey,
  getAirportChineseName,
  getAirlineChineseName,
  formatTime,
  getStatusText,
  validateFlightData,
  transformFlightData,
  type ApiFlightData,
} from '@/lib/utils/flight-utils'

// Re-export types so callers don't need to change import paths
export type { FlightData, AirportFlightItem } from '@/lib/utils/flight-utils'

/**
 * 查詢單一航班
 * AeroDataBox API: /flights/number/{flightNumber}/{date}
 *
 * 注意：同一航班號可能有多個航段（如 TR874 有 SIN→TPE 和 TPE→NRT）
 * - 單一航段時返回 { data: FlightData }
 * - 多航段時返回 { segments: FlightData[] } 讓 UI 選擇
 */
export async function searchFlightAction(
  flightNumber: string,
  flightDate: string
): Promise<{
  data?: import('@/lib/utils/flight-utils').FlightData
  segments?: import('@/lib/utils/flight-utils').FlightData[]
  error?: string
  warning?: string
}> {
  // 載入機場/航空公司參考資料（從資料庫，有快取）
  await loadReferenceData()

  const apiKey = await getApiKey()

  if (!apiKey) {
    logger.error('❌ AeroDataBox API key is not configured.')
    return { error: 'API 金鑰未設定，請聯絡系統主管。' }
  }

  // 清理航班號碼（移除空格）
  const cleanFlightNumber = flightNumber.replace(/\s/g, '').toUpperCase()

  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${cleanFlightNumber}/${flightDate}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      // Next.js fetch 有內建 timeout，不需要手動 AbortController
    })

    // 🔧 修復：先攔截 204 No Content（API 無資料時回傳 204）
    if (response.status === 204) {
      logger.warn(`⚠️ AeroDataBox 回傳 204 No Content: ${cleanFlightNumber} on ${flightDate}`)
      return { error: `找不到 ${cleanFlightNumber} 在 ${flightDate} 的航班資訊，可能尚未排班。` }
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { error: '找不到該航班的資訊。' }
      }
      if (response.status === 429) {
        return { error: '本月查詢額度已用完，請下個月再試。' }
      }
      logger.error(`AeroDataBox API Error: ${response.status}`)
      return { error: '無法查詢航班資訊，請稍後再試。' }
    }

    // 解析 JSON 回應
    let apiData: ApiFlightData[]
    try {
      const responseText = await response.text()
      if (!responseText || responseText.trim().length === 0) {
        logger.warn(`⚠️ AeroDataBox 回傳空 body: ${cleanFlightNumber} on ${flightDate}`)
        return { error: `找不到 ${cleanFlightNumber} 在 ${flightDate} 的航班資訊。` }
      }
      const rawData = JSON.parse(responseText)
      // AeroDataBox API 可能回傳陣列或單一物件，統一轉為陣列
      apiData = Array.isArray(rawData) ? rawData : [rawData]
    } catch (jsonError) {
      logger.error(`航班 API JSON 解析失敗 (${cleanFlightNumber} on ${flightDate}):`, jsonError)
      return { error: `航班 ${cleanFlightNumber} 查詢失敗（API 回應異常），請手動輸入航班資訊。` }
    }

    if (!apiData || apiData.length === 0) {
      return { error: '找不到該航班的資訊。' }
    }

    // 轉換所有航段資料
    const allSegments = apiData.map((flight: ApiFlightData) =>
      transformFlightData(flight, flightDate, cleanFlightNumber)
    )

    // 如果只有一筆結果，直接返回
    if (allSegments.length === 1) {
      const missingFields = validateFlightData(apiData[0])
      logger.log(`✅ 航班查詢成功（單一航段）: ${cleanFlightNumber}`)

      // 如果資料不完整，返回警告
      if (missingFields.length > 0) {
        const warning = `航班資料不完整，缺少：${missingFields.join('、')}。可能是日期太遠，建議手動輸入。`
        logger.warn(`⚠️ ${cleanFlightNumber} 資料不完整: ${missingFields.join(', ')}`)
        return { data: allSegments[0], warning }
      }

      return { data: allSegments[0] }
    }

    // 多航段：返回所有航段讓用戶選擇
    // 檢查是否有航段資料不完整
    const incompleteSegments = apiData.filter(
      (flight: ApiFlightData) => validateFlightData(flight).length > 0
    )
    const warning =
      incompleteSegments.length > 0
        ? `部分航段資料不完整，可能是日期太遠，請確認後手動補充。`
        : undefined

    logger.log(`✅ 航班查詢成功: ${cleanFlightNumber}，共 ${allSegments.length} 個航段`)
    return { segments: allSegments, warning }
  } catch (error) {
    logger.error('Failed to fetch flight data:', error)
    return { error: '查詢航班時發生網路錯誤。' }
  }
}

/**
 * 查詢機場出發航班
 * AeroDataBox API: /flights/airports/iata/{airportCode}/{fromLocal}/{toLocal}
 */
export async function searchAirportDeparturesAction(
  airportCode: string,
  date: string,
  destinationFilter?: string
): Promise<{ data?: import('@/lib/utils/flight-utils').AirportFlightItem[]; error?: string }> {
  // 載入機場/航空公司參考資料（從資料庫，有快取）
  await loadReferenceData()

  const apiKey = await getApiKey()

  if (!apiKey) {
    logger.error('❌ AeroDataBox API key is not configured.')
    return { error: 'API 金鑰未設定，請聯絡系統主管。' }
  }

  // 驗證日期格式 (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    logger.error(`❌ 日期格式錯誤: ${date}，應為 YYYY-MM-DD`)
    return { error: '日期格式錯誤，請使用 YYYY-MM-DD 格式。' }
  }

  const cleanAirportCode = airportCode.toUpperCase().trim()

  // 驗證機場代碼
  if (!cleanAirportCode || cleanAirportCode.length !== 3) {
    logger.error(`❌ 機場代碼格式錯誤: ${cleanAirportCode}`)
    return { error: '機場代碼應為 3 個字母（如 TPE）。' }
  }

  // API 限制：時間範圍不能超過 12 小時，所以需要分兩次查詢
  const timeRanges = [
    { from: `${date}T00:00`, to: `${date}T11:59` },
    { from: `${date}T12:00`, to: `${date}T23:59` },
  ]

  try {
    logger.log(`🔍 查詢機場出發航班: ${cleanAirportCode} on ${date}`)

    let allDepartures: ApiFlightData[] = []

    for (const range of timeRanges) {
      const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${cleanAirportCode}/${range.from}/${range.to}?direction=Departure&withCancelled=true`
      logger.log(`🔗 API URL: ${url}`)

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
        logger.error(`❌ Request: ${cleanAirportCode} on ${date}`)

        if (response.status === 400) {
          return {
            error: `查詢參數錯誤：機場 ${cleanAirportCode}，日期 ${date}。請確認機場代碼正確。`,
          }
        }
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
        logger.error('機場出發航班 API JSON 解析失敗:', jsonError)
        return { error: 'API 回應格式錯誤，請稍後再試。' }
      }
      const departures = apiData.departures || []
      allDepartures = allDepartures.concat(departures)
    }

    const departures = allDepartures

    // 轉換資料格式
    // 注意：Airport Departures API 使用 movement 結構，而非 departure/arrival
    let flights: import('@/lib/utils/flight-utils').AirportFlightItem[] = departures.map(
      (flight: ApiFlightData) => {
        // 優先使用 movement（Airport API），fallback 到 departure（Flight API）
        const movement = flight.movement || flight.departure
        const depTime = movement?.scheduledTime?.local || movement?.scheduledTime?.utc
        const estTime = movement?.revisedTime?.local || movement?.revisedTime?.utc
        const airlineCode = flight.airline?.iata || ''
        // 目的地：movement.airport 是目的地機場（對於出發航班）
        const destAirport = flight.movement?.airport || flight.arrival?.airport
        const destIata = destAirport?.iata || ''
        return {
          flightNumber: flight.number || '',
          airline: getAirlineChineseName(airlineCode, flight.airline?.name || ''),
          airlineCode: airlineCode,
          destination: getAirportChineseName(destIata, destAirport?.name || ''),
          destinationIata: destIata,
          scheduledTime: formatTime(depTime),
          estimatedTime: estTime ? formatTime(estTime) : undefined,
          status: getStatusText(flight.status || 'Unknown'),
          terminal: movement?.terminal,
          gate: movement?.gate,
        }
      }
    )

    // 如果有指定目的地，過濾結果
    if (destinationFilter) {
      const filterUpper = destinationFilter.toUpperCase()
      flights = flights.filter(
        f => f.destinationIata === filterUpper || f.destination.toUpperCase().includes(filterUpper)
      )
    }

    // 按時間排序
    flights.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

    logger.log(`✅ 機場航班查詢成功: ${cleanAirportCode}，共 ${flights.length} 班`)
    return { data: flights }
  } catch (error) {
    logger.error('Failed to fetch airport flights:', error)
    return { error: '查詢機場航班時發生網路錯誤。' }
  }
}
