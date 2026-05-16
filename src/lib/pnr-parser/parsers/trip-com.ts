/**
 * Trip.com 行程確認單解析器
 */

import { logger } from '@/lib/utils/logger'
import { ParsedPNR, FlightSegment, OSICategory } from '../types'
import { extractTripComAirportCode } from '../utils'
import { MONTH_NAMES } from '../constants'

/**
 * 解析 Trip.com 行程確認單
 */
export function parseTripComConfirmation(input: string): ParsedPNR {
  const lines = input
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  logger.log('📋 開始解析 Trip.com 確認單，共', lines.length, '行')

  const result: ParsedPNR = {
    recordLocator: '',
    passengerNames: [],
    passengers: [],
    segments: [],
    ticketingDeadline: null,
    cancellationDeadline: null,
    specialRequests: [],
    otherInfo: [],
    contactInfo: [],
    validation: { isValid: true, errors: [], warnings: [], suggestions: [] },
    fareData: null,
    ticketNumbers: [],
    sourceFormat: 'trip_com',
  }

  // 當前航班
  let currentSegment: Partial<FlightSegment> | null = null
  // 經停資訊
  let transitStops: Array<{
    city: string
    airport?: string
    airportName?: string
    duration?: string
  }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 解析訂單編號
    const orderMatch = line.match(/訂單編號\s*(\d+)/)
    if (orderMatch) {
      result.contactInfo.push(`Trip.com 訂單: ${orderMatch[1]}`)
      logger.log('  ✅ 找到訂單編號:', orderMatch[1])
      continue
    }

    // 解析旅客資訊行
    const passengerMatch = line.match(
      /^([A-Z]+)\s*\(姓\)\s*([A-Z]+)\s*\(名\)\s*(\S+艙?)\s+(\d{3}-\d+)\s+([A-Z0-9]{5,6})$/i
    )
    if (passengerMatch) {
      const surname = passengerMatch[1].toUpperCase()
      const givenName = passengerMatch[2].toUpperCase()
      const fullName = `${surname}/${givenName}`
      const cabin = passengerMatch[3]
      const ticketNumber = passengerMatch[4]
      const bookingRef = passengerMatch[5].toUpperCase()

      result.passengerNames.push(fullName)
      result.passengers.push({
        index: result.passengers.length + 1,
        name: fullName,
        type: 'ADT',
      })
      result.ticketNumbers.push({
        number: ticketNumber,
        passenger: fullName,
      })

      if (!result.recordLocator) {
        result.recordLocator = bookingRef
      }

      const cabinCode = cabin.includes('商務')
        ? 'C'
        : cabin.includes('頭等')
          ? 'F'
          : cabin.includes('豪華經濟')
            ? 'W'
            : 'Y'

      result.otherInfo.push({
        airline: 'YY',
        message: `艙等: ${cabin} (${cabinCode})`,
        raw: line,
        category: OSICategory.GENERAL,
      })

      logger.log(
        '  ✅ 找到旅客:',
        fullName,
        '艙等:',
        cabin,
        '票號:',
        ticketNumber,
        '訂位:',
        bookingRef
      )
      continue
    }

    // 解析出發資訊
    const departureMatch = line.match(
      /出發\s*(\d{4})年(\d{1,2})月(\d{1,2})日(\d{2}):(\d{2}),?\s*(.+?機場)\s*(T?\d+)?$/
    )
    if (departureMatch) {
      const month = departureMatch[2].padStart(2, '0')
      const day = departureMatch[3].padStart(2, '0')
      const hour = departureMatch[4]
      const minute = departureMatch[5]
      const airport = departureMatch[6].trim()
      const terminal = departureMatch[7]?.replace('T', '') || ''

      const departureDate = `${day}${MONTH_NAMES[parseInt(month) - 1]}`
      const origin = extractTripComAirportCode(airport)

      currentSegment = {
        departureDate,
        departureTime: `${hour}${minute}`,
        origin,
        departureTerminal: terminal,
        status: 'HK',
        passengers: result.passengerNames.length || 1,
      }

      logger.log(
        '  ✅ 找到出發:',
        `${departureMatch[1]}-${month}-${day} ${hour}:${minute}`,
        airport,
        origin
      )
      continue
    }

    // 解析抵達資訊
    const arrivalMatch = line.match(
      /抵達\s*(\d{4})年(\d{1,2})月(\d{1,2})日(\d{2}):(\d{2}),?\s*(.+?機場)\s*(T?\d+)?$/
    )
    if (arrivalMatch && currentSegment) {
      const hour = arrivalMatch[4]
      const minute = arrivalMatch[5]
      const airport = arrivalMatch[6].trim()
      const terminal = arrivalMatch[7]?.replace('T', '') || ''

      const destination = extractTripComAirportCode(airport)

      currentSegment.arrivalTime = `${hour}${minute}`
      currentSegment.destination = destination
      currentSegment.arrivalTerminal = terminal

      logger.log('  ✅ 找到抵達:', `${hour}:${minute}`, airport, destination)
      continue
    }

    // 解析航空公司和航班號
    const airlineMatch = line.match(/航空公司\s+(.+?)\s+([A-Z]{2})(\d{1,4})$/i)
    if (airlineMatch && currentSegment) {
      const airlineCode = airlineMatch[2].toUpperCase()
      const flightNumber = airlineMatch[3]

      currentSegment.airline = airlineCode
      currentSegment.flightNumber = flightNumber

      // 從 OSI 取得艙等代碼
      const cabinInfo = result.otherInfo.find(o => o.message.includes('艙等:'))
      if (cabinInfo) {
        const cabinMatch = cabinInfo.message.match(/\(([A-Z])\)/)
        if (cabinMatch) {
          currentSegment.class = cabinMatch[1]
        }
      }
      if (!currentSegment.class) {
        currentSegment.class = 'Y'
      }

      currentSegment.isDirect = transitStops.length === 0
      if (transitStops.length > 0) {
        currentSegment.via = [...transitStops]
      }

      // 儲存航班
      if (currentSegment.destination) {
        result.segments.push(currentSegment as FlightSegment)
        const viaInfo =
          transitStops.length > 0 ? ` (經 ${transitStops.map(s => s.city).join(', ')})` : ''
        logger.log(
          '  ✅ 找到航班:',
          airlineCode + flightNumber,
          '從',
          currentSegment.origin,
          '到',
          currentSegment.destination + viaInfo
        )
      }

      currentSegment = null
      transitStops = []
      continue
    }

    // 解析經停（更新最後一個航段）
    const transitMatch = line.match(/停留[:：]\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)/)
    if (transitMatch) {
      const city = transitMatch[1].trim()
      const airportName = transitMatch[2].trim()
      const duration = transitMatch[3].trim()
      const airportCode = extractTripComAirportCode(airportName)

      const viaInfo = {
        city,
        airport: airportCode !== 'XXX' ? airportCode : undefined,
        airportName,
        duration,
      }

      if (result.segments.length > 0) {
        const lastSegment = result.segments[result.segments.length - 1]
        if (!lastSegment.via) {
          lastSegment.via = []
        }
        lastSegment.via.push(viaInfo)
        lastSegment.isDirect = false
        logger.log('  ✅ 更新最後航段經停:', city, `(${airportCode})`, duration)
      } else {
        transitStops.push(viaInfo)
        logger.log('  ✅ 找到經停:', city, `(${airportCode})`, duration)
      }
      continue
    }

    // 解析手提行李
    const carryOnMatch = line.match(/手提行李\s+(.+)/)
    if (carryOnMatch) {
      result.otherInfo.push({
        airline: 'YY',
        message: `手提行李: ${carryOnMatch[1]}`,
        raw: line,
        category: OSICategory.GENERAL,
      })
      continue
    }

    // 解析託運行李
    const checkedMatch = line.match(/託運行李\s+(.+)/)
    if (checkedMatch) {
      result.otherInfo.push({
        airline: 'YY',
        message: `託運行李: ${checkedMatch[1]}`,
        raw: line,
        category: OSICategory.GENERAL,
      })
      continue
    }
  }

  // 儲存最後一段航班
  if (currentSegment && currentSegment.airline && currentSegment.destination) {
    result.segments.push(currentSegment as FlightSegment)
  }

  logger.log('📋 Trip.com 確認單解析完成:', {
    旅客數: result.passengerNames.length,
    航班數: result.segments.length,
    訂位代號: result.recordLocator,
    票號數: result.ticketNumbers.length,
  })

  return result
}
