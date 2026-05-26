/**
 * Amadeus PNR 電報解析器（orchestrator）
 *
 * 驗證邏輯：./amadeus-validate.ts
 * 票價解析：./amadeus-fare.ts
 */

import { logger } from '@/lib/utils/logger'
import { ParsedPNR, PassengerInfo, SSRCategory, OSICategory } from '../types'
import {
  mergeMultilineEntries,
  parseAmadeusDate,
  parseEnhancedSSR,
  parseEnhancedOSI,
  isValidRecordLocator,
} from '../utils'
import { validateAmadeusPNR } from './amadeus-validate'
import { parseFareFromTelegram } from './amadeus-fare'

/**
 * 解析 Amadeus PNR 電報
 */
export function parseAmadeusPNR(rawPNR: string): ParsedPNR {
  const lines = mergeMultilineEntries(rawPNR)

  logger.log('📋 開始解析電報，共', lines.length, '行')

  const validation = validateAmadeusPNR(rawPNR)

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
    validation,
    fareData: null,
    ticketNumbers: [],
    sourceFormat: 'amadeus_pnr',
  }

  for (const line of lines) {
    logger.log('  檢查行:', line)

    // 解析 Header Line 提取 Record Locator（最可信）
    if (line.startsWith('RP/') && !result.recordLocator) {
      const headerMatch = line.match(/([A-Z0-9]{6})$/)
      if (headerMatch && isValidRecordLocator(headerMatch[1])) {
        result.recordLocator = headerMatch[1]
        result.recordLocatorSource = 'rp_header'
      }
      continue
    }

    // 從 SSR OTHS 行抓 PNR locator（譬如「DUPLICATE OF FXGZDF-TL」內的 FXGZDF）
    if (!result.recordLocator && /SSR\s+OTHS/i.test(line)) {
      const dupMatch = line.match(/DUPLICATE\s+OF\s+([A-Z0-9]{6})/i)
      if (dupMatch && isValidRecordLocator(dupMatch[1])) {
        result.recordLocator = dupMatch[1]
        result.recordLocatorSource = 'ssr_duplicate'
      }
    }

    // 解析旅客姓名
    const passengerLineMatch = line.match(/(\d+)\.([A-Z]+\/[A-Z]+)(?:\(([^)]+)\))?/gi)
    if (passengerLineMatch) {
      for (const match of passengerLineMatch) {
        const passengerMatch = match.match(/(\d+)\.([A-Z]+\/[A-Z]+)(?:\(([^)]+)\))?/i)
        if (passengerMatch) {
          const index = parseInt(passengerMatch[1])
          const name = passengerMatch[2]
          const extra = passengerMatch[3]

          if (name && !result.passengerNames.includes(name)) {
            result.passengerNames.push(name)
            logger.log('    ✅ 找到旅客:', name)
          }

          const passenger: PassengerInfo = {
            index,
            name,
            type: 'ADT',
          }

          if (extra) {
            const chdMatch = extra.match(/^CHD\/?(\d{2}[A-Z]{3}\d{2})$/i)
            if (chdMatch) {
              passenger.type = 'CHD'
              passenger.birthDate = chdMatch[1]
              logger.log('    ✅ 找到兒童:', name, '生日:', chdMatch[1])
            }

            const infMatch = extra.match(/^INF([A-Z]+)\/([A-Z]+)\/(\d{2}[A-Z]{3}\d{2})$/i)
            if (infMatch) {
              passenger.infant = {
                name: `${infMatch[1]}/${infMatch[2]}`,
                birthDate: infMatch[3],
              }
              logger.log(
                '    ✅ 找到嬰兒:',
                passenger.infant.name,
                '生日:',
                infMatch[3],
                '隨行成人:',
                name
              )
            }

            if (!passenger.infant) {
              const infMatch2 = extra.match(/^INF\s+([A-Z]+\/[A-Z]+)\s+(\d{2}[A-Z]{3}\d{2})$/i)
              if (infMatch2) {
                passenger.infant = {
                  name: infMatch2[1],
                  birthDate: infMatch2[2],
                }
                logger.log(
                  '    ✅ 找到嬰兒(備用格式):',
                  passenger.infant.name,
                  '生日:',
                  infMatch2[2]
                )
              }
            }
          }

          result.passengers.push(passenger)
        }
      }
      continue
    }

    // 解析航班資訊
    const segmentMatch = line.match(
      /^(\d+)\s+([A-Z0-9]{2})\s*(\d{1,4})\s+([A-Z])\s+(\d{2}[A-Z]{3})\s+\d?\*?\s*([A-Z]{6})\s+([A-Z]{2})(\d+)\s+(\d{4})\s+(\d{4})/i
    )

    if (segmentMatch) {
      const origin = segmentMatch[6].substring(0, 3)
      const destination = segmentMatch[6].substring(3, 6)

      result.segments.push({
        lineNumber: parseInt(segmentMatch[1]),
        airline: segmentMatch[2],
        flightNumber: segmentMatch[3],
        class: segmentMatch[4],
        departureDate: segmentMatch[5],
        origin: origin,
        destination: destination,
        status: segmentMatch[7],
        passengers: parseInt(segmentMatch[8]),
        departureTime: segmentMatch[9],
        arrivalTime: segmentMatch[10],
      })

      // PNR 沒 RP/ header 時、嘗試從 segment 末尾抽 airline-specific locator
      // 譬如 "CI 517 ... CI/D2SKV5" → D2SKV5
      if (!result.recordLocator) {
        const tailLocator = line.match(/\b[A-Z]{2}\/([A-Z0-9]{5,8})\b/)
        if (tailLocator && isValidRecordLocator(tailLocator[1])) {
          result.recordLocator = tailLocator[1]
          result.recordLocatorSource = 'segment_tail'
        }
      }
      continue
    }

    // 解析出票期限 (OPW/OPC 格式)
    const opwMatch = line.match(/(?:ON OR BEFORE|BEFORE)\s+(\d{2})([A-Z]{3}):?(\d{4})?/i)
    if (opwMatch) {
      logger.log('    ✅ 找到 OPW 出票期限!', opwMatch)
      const day = opwMatch[1]
      const monthStr = opwMatch[2].toUpperCase()
      const time = opwMatch[3]
      const deadline = parseAmadeusDate(day, monthStr, time)
      logger.log('    📅 解析日期:', deadline, time ? `時間: ${time}` : '')
      result.ticketingDeadline = deadline
      continue
    }

    // 解析出票期限 (TK TL 格式)
    const tkTlMatch = line.match(/TK\s+TL\s*(\d{2})([A-Z]{3})/i)
    if (tkTlMatch && !result.ticketingDeadline) {
      logger.log('    ✅ 找到 TK TL 出票期限 (備用)!', tkTlMatch)
      const day = tkTlMatch[1]
      const monthStr = tkTlMatch[2].toUpperCase()
      const deadline = parseAmadeusDate(day, monthStr)
      logger.log('    📅 解析日期:', deadline)
      result.ticketingDeadline = deadline
      continue
    }

    // 解析嬰兒 SSR
    const ssrInftMatch = line.match(
      /^\d+\s+SSR\s+INFT\s+([A-Z]{2})\s+([A-Z]{2})(\d+)\s+([A-Z]+\/[A-Z]+)\s+(\d{2}[A-Z]{3}\d{2})(?:\/S(\d+))?(?:\/P(\d+))?/i
    )
    if (ssrInftMatch) {
      const infantName = ssrInftMatch[4]
      const infantBirthDate = ssrInftMatch[5]
      const segmentNum = ssrInftMatch[6] ? parseInt(ssrInftMatch[6]) : undefined
      const passengerNum = ssrInftMatch[7] ? parseInt(ssrInftMatch[7]) : undefined

      result.specialRequests.push({
        code: 'INFT',
        description: `嬰兒: ${infantName} (${infantBirthDate})`,
        segments: segmentNum ? [segmentNum] : undefined,
        passenger: passengerNum,
        airline: ssrInftMatch[1],
        raw: line,
        category: SSRCategory.PASSENGER,
      })

      if (passengerNum) {
        const passenger = result.passengers.find(p => p.index === passengerNum)
        if (passenger && !passenger.infant) {
          passenger.infant = {
            name: infantName,
            birthDate: infantBirthDate,
          }
        }
      }
      continue
    }

    // 解析兒童 SSR
    const ssrChldMatch = line.match(
      /^\d+\s+SSR\s+CHLD\s+([A-Z]{2})\s+([A-Z]{2})(\d+)\s+(\d{2}[A-Z]{3}\d{2})(?:\/P(\d+))?/i
    )
    if (ssrChldMatch) {
      const childBirthDate = ssrChldMatch[4]
      const passengerNum = ssrChldMatch[5] ? parseInt(ssrChldMatch[5]) : undefined

      result.specialRequests.push({
        code: 'CHLD',
        description: `兒童 (${childBirthDate})`,
        passenger: passengerNum,
        airline: ssrChldMatch[1],
        raw: line,
        category: SSRCategory.PASSENGER,
      })

      if (passengerNum) {
        const passenger = result.passengers.find(p => p.index === passengerNum)
        if (passenger) {
          passenger.type = 'CHD'
          passenger.birthDate = childBirthDate
        }
      }
      continue
    }

    // 標準增強型 SSR
    if (line.match(/^SR[A-Z]{4}/i)) {
      const ssr = parseEnhancedSSR(line)
      if (ssr) {
        result.specialRequests.push(ssr)
        continue
      }
    }

    // 舊格式 SSR 兼容
    if (line.match(/^SR\s+/i) || line.match(/^SSR\s+/i)) {
      const rawText = line.replace(/^S{1,2}R\s+/i, '').trim()
      result.specialRequests.push({
        code: 'UNKN',
        description: rawText,
        raw: line,
        category: SSRCategory.OTHER,
      })
      continue
    }

    // 解析增強型 OSI
    if (line.match(/^OS[A-Z]{2}\s+/i)) {
      const osi = parseEnhancedOSI(line)
      if (osi) {
        result.otherInfo.push(osi)
        continue
      }
    }

    // 舊格式 OSI 兼容
    if (line.match(/^OSI\s+/i)) {
      const message = line.replace(/^OSI\s+/i, '').trim()
      result.otherInfo.push({
        airline: 'YY',
        message,
        raw: line,
        category: OSICategory.GENERAL,
      })
      continue
    }

    // 解析聯絡資訊
    const contactMatch = line.match(/^AP[EM]?\s+(.+)/i)
    if (contactMatch) {
      result.contactInfo.push(contactMatch[1].trim())
      continue
    }

    // 解析機票號碼 FA 行
    const faMatch = line.match(/(?:^\d+\s+)?FA\s+PAX\s+(\d{3})-?(\d{10,})/i)
    if (faMatch) {
      const ticketNumber = `${faMatch[1]}-${faMatch[2]}`
      let passengerIndex: number | null = null
      const pMatch = line.match(/\/P(\d+)\s*$/i)
      if (pMatch) {
        passengerIndex = parseInt(pMatch[1], 10)
      } else {
        const nextLineIndex = lines.indexOf(line) + 1
        if (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex]
          const nextPMatch = nextLine.match(/\/P(\d+)\s*$/i)
          if (nextPMatch) {
            passengerIndex = parseInt(nextPMatch[1], 10)
          }
        }
      }
      let passengerName = ''
      if (
        passengerIndex !== null &&
        passengerIndex > 0 &&
        passengerIndex <= result.passengerNames.length
      ) {
        passengerName = result.passengerNames[passengerIndex - 1]
      }
      result.ticketNumbers.push({
        number: ticketNumber,
        passenger: passengerName,
      })
      logger.log(
        '    ✅ 找到機票號碼:',
        ticketNumber,
        passengerIndex ? `(P${passengerIndex}: ${passengerName})` : ''
      )
      continue
    }
  }

  // 解析票價資訊
  result.fareData = parseFareFromTelegram(rawPNR)

  // 補 recordLocatorSource、若上面都沒抓到就標 'none'
  if (!result.recordLocator) {
    result.recordLocatorSource = 'none'
  }

  logger.log('📋 Amadeus PNR 解析完成:', {
    訂位代號: result.recordLocator,
    來源: result.recordLocatorSource,
    旅客數: result.passengerNames.length,
    旅客: result.passengerNames,
    航班數: result.segments.length,
  })

  return result
}
