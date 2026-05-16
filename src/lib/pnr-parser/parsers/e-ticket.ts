/**
 * 電子機票確認單（E-Ticket Confirmation）解析器
 */

import { logger } from '@/lib/utils/logger'
import { ParsedPNR, FlightSegment, TaxItem } from '../types'
import { extractAirportCode } from '../utils'

/**
 * 解析電子機票確認單
 */
export function parseETicketConfirmation(input: string): ParsedPNR {
  const lines = input
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  logger.log('📋 開始解析電子機票，共', lines.length, '行')

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
    sourceFormat: 'e_ticket',
  }

  let baseFare: number | null = null
  let taxes: number | null = null
  let totalFare: number | null = null
  const taxBreakdown: TaxItem[] = []

  let currentSegment: Partial<FlightSegment> | null = null
  let expectingArrival = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const _upperLine = line.toUpperCase()

    // 解析旅客姓名
    const nameMatch = line.match(/NAME\s*[:：]\s*([A-Z]+\/[A-Z]+)/i)
    if (nameMatch) {
      const name = nameMatch[1].toUpperCase()
      result.passengerNames.push(name)
      result.passengers.push({
        index: result.passengers.length + 1,
        name,
        type: 'ADT',
      })
      logger.log('  ✅ 找到旅客:', name)
      continue
    }

    // 解析機票號碼
    const ticketMatch = line.match(/TICKET\s+NUMBER\s*[:：]\s*(?:ETKT\s+)?(\d{3})\s+(\d+)/i)
    if (ticketMatch) {
      const ticketNumber = `${ticketMatch[1]}-${ticketMatch[2]}`
      result.ticketNumbers.push({
        number: ticketNumber,
        passenger: result.passengerNames[result.ticketNumbers.length] || '',
      })
      logger.log('  ✅ 找到機票號碼:', ticketNumber)
      continue
    }

    // 解析訂位代號
    const bookingMatch = line.match(/BOOKING\s+REF\s*[:：]\s*AMADEUS\s*[:：]?\s*([A-Z0-9]{5,6})/i)
    if (bookingMatch) {
      result.recordLocator = bookingMatch[1]
      logger.log('  ✅ 找到訂位代號:', bookingMatch[1])
      continue
    }

    // 解析航班行
    const flightMatch = line.match(
      /^([A-Z\s]+?)\s+([A-Z]{2})\s+(\d{1,4})\s+([A-Z])\s+(\d{2}[A-Z]{3})\s+(\d{4})\s+/i
    )
    if (flightMatch && !line.includes('FROM') && !line.includes('FLIGHT')) {
      if (currentSegment && currentSegment.airline) {
        result.segments.push(currentSegment as FlightSegment)
      }

      const origin = extractAirportCode(flightMatch[1].trim())
      currentSegment = {
        airline: flightMatch[2].toUpperCase(),
        flightNumber: flightMatch[3],
        class: flightMatch[4].toUpperCase(),
        departureDate: flightMatch[5].toUpperCase(),
        origin: origin,
        destination: '',
        status: 'HK',
        passengers: result.passengerNames.length || 1,
        departureTime: flightMatch[6],
      }

      const statusMatch = line.match(/\s+(OK|HK|TK|RR|UC|UN|NO|XX)\s*$/i)
      if (statusMatch) {
        currentSegment.status = statusMatch[1].toUpperCase()
      }

      expectingArrival = true
      logger.log(
        '  ✅ 找到航班:',
        (currentSegment.airline || '') + (currentSegment.flightNumber || ''),
        '從',
        origin
      )
      continue
    }

    // 解析航站資訊
    const terminalMatch = line.match(/TERMINAL\s*[:：]\s*(\d+)/i)
    if (terminalMatch && currentSegment) {
      if (expectingArrival && !currentSegment.arrivalTerminal) {
        currentSegment.departureTerminal = terminalMatch[1]
      } else {
        currentSegment.arrivalTerminal = terminalMatch[1]
      }
      continue
    }

    // 解析抵達資訊
    const arrivalMatch = line.match(
      /^([A-Z\s]+?)\s+ARRIVAL\s+TIME\s*[:：]\s*(\d{4})\s+ARRIVAL\s+DATE\s*[:：]\s*(\d{2}[A-Z]{3})/i
    )
    if (arrivalMatch && currentSegment && expectingArrival) {
      const destination = extractAirportCode(arrivalMatch[1].trim())
      currentSegment.destination = destination
      currentSegment.arrivalTime = arrivalMatch[2]
      expectingArrival = false
      logger.log('    抵達:', destination, '時間:', arrivalMatch[2])
      continue
    }

    // 解析票價 AIR FARE
    const airFareMatch = line.match(/AIR\s+FARE\s*[:：]\s*([A-Z]{3})\s+([\d,]+)/i)
    if (airFareMatch) {
      baseFare = parseFloat(airFareMatch[2].replace(/,/g, ''))
      continue
    }

    // 解析稅金
    const taxMatch = line.match(/^TAX\s*[:：]\s*(.+)/i)
    if (taxMatch) {
      const taxParts = taxMatch[1].match(/([A-Z]{3})\s+([\d,]+)([A-Z]{2})/gi)
      if (taxParts) {
        taxes = 0
        for (const part of taxParts) {
          const m = part.match(/([A-Z]{3})\s+([\d,]+)([A-Z]{2})/i)
          if (m) {
            const amount = parseFloat(m[2].replace(/,/g, ''))
            taxes += amount
            taxBreakdown.push({ code: m[3], amount, currency: m[1] })
          }
        }
      }
      continue
    }

    // 解析附加費
    const surchargeMatch = line.match(
      /AIRLINE\s+SURCHARGES?\s*[:：]\s*([A-Z]{3})\s+([\d,]+)([A-Z]{2})/i
    )
    if (surchargeMatch) {
      const amount = parseFloat(surchargeMatch[2].replace(/,/g, ''))
      if (taxes === null) taxes = 0
      taxes += amount
      taxBreakdown.push({ code: surchargeMatch[3], amount, currency: surchargeMatch[1] })
      continue
    }

    // 解析總價
    const totalMatch = line.match(/^TOTAL\s*[:：]\s*([A-Z]{3})\s+([\d,]+)/i)
    if (totalMatch) {
      totalFare = parseFloat(totalMatch[2].replace(/,/g, ''))
      continue
    }
  }

  // 儲存最後一段航班
  if (currentSegment && currentSegment.airline && currentSegment.destination) {
    result.segments.push(currentSegment as FlightSegment)
  }

  // 組合票價資料
  if (totalFare !== null || baseFare !== null) {
    result.fareData = {
      currency: 'TWD',
      baseFare,
      taxes,
      totalFare: totalFare || (baseFare || 0) + (taxes || 0),
      fareBasis: null,
      validatingCarrier: null,
      taxBreakdown,
      perPassenger: true,
      raw: '',
    }
  }

  logger.log('📋 電子機票解析完成:', {
    旅客數: result.passengerNames.length,
    航班數: result.segments.length,
    訂位代號: result.recordLocator,
  })

  return result
}
