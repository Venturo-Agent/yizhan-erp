/**
 * HTML 格式機票確認單解析器
 */

import { ParsedHTMLConfirmation } from '../types'

/**
 * 解析 HTML 格式的機票確認單（公司系統匯出）
 */
export function parseHTMLConfirmation(html: string): ParsedHTMLConfirmation {
  const result: ParsedHTMLConfirmation = {
    recordLocator: '',
    passengerNames: [],
    segments: [],
    ticketNumbers: [],
    airlineContacts: [],
  }

  // 移除 HTML 標籤，保留換行
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 解析電腦代號
    const rlMatch = line.match(/電腦代號[:：]?\s*([A-Z0-9]{6})/i)
    if (rlMatch) {
      result.recordLocator = rlMatch[1]
      continue
    }

    // 解析旅客姓名
    const nameMatch = line.match(/旅客姓名[:：]?\s*\d+\.\s*([A-Z\/]+(?:\s+(?:MR|MRS|MS))?)/i)
    if (nameMatch) {
      result.passengerNames.push(nameMatch[1].trim())
      continue
    }

    // 解析航班資訊
    const airlineMatch = line.match(/^(.+?)\(([A-Z]{2}\d+)\)/)
    if (airlineMatch && i + 2 < lines.length) {
      const airline = airlineMatch[1].trim()
      const flightNumber = airlineMatch[2]

      const durationMatch = line.match(/飛行(\d+小時\d+分)/)
      const duration = durationMatch ? durationMatch[1] : undefined

      const nextLine = lines[i + 1]
      const arrivalLine = lines[i + 2]

      const depMatch = nextLine.match(
        /(\d+月\d+日)\([^)]+\)\s*(\d{2}:\d{2})\s*出發[:：]\s*([^/]+?)\s*(?:航站(\d+)\s*)?\/([^/]+)\s*\/([A-Z]+)/i
      )

      const arrMatch = arrivalLine.match(
        /(\d{2}:\d{2})\s*抵達[:：]\s*([^/]+?)\s*(?:航站(\d+)\s*)?\/([^/]+)\s*\/(.+)/i
      )

      if (depMatch && arrMatch) {
        const cleanAirport = (name: string) => {
          return name.replace(/\([^)]+\)/g, '').trim()
        }

        const segment = {
          airline,
          flightNumber,
          departureDate: depMatch[1],
          departureTime: depMatch[2],
          departureAirport: cleanAirport(depMatch[3]),
          departureTerminal: depMatch[4] || undefined,
          cabin: depMatch[5].trim(),
          status: depMatch[6].trim(),
          arrivalTime: arrMatch[1],
          arrivalAirport: cleanAirport(arrMatch[2]),
          arrivalTerminal: arrMatch[3] || undefined,
          aircraft: arrMatch[4].trim(),
          meal: arrMatch[5].includes('餐點'),
          duration,
        }

        result.segments.push(segment)
        i += 2
        continue
      }
    }

    // 解析機票號碼（中文格式）
    const ticketMatch = line.match(/機票號碼[:：]?\s*([0-9-]+)\s*-\s*([A-Z\/]+)/i)
    if (ticketMatch) {
      result.ticketNumbers.push({
        number: ticketMatch[1],
        passenger: ticketMatch[2],
      })
      continue
    }

    // 解析 GDS FA 行機票號碼
    const faMatch = line.match(/(?:^\d+\s+)?FA\s+PAX\s+(\d{3})-?(\d{10,})/i)
    if (faMatch) {
      result.ticketNumbers.push({
        number: `${faMatch[1]}-${faMatch[2]}`,
        passenger: '',
      })
      continue
    }

    // 解析航空公司確認電話
    const contactMatch = line.match(/航空公司確認電話[:：]?\s*(.+)/i)
    if (contactMatch) {
      result.airlineContacts.push(contactMatch[1].trim())
      let j = i + 1
      while (j < lines.length && !lines[j].match(/^[a-z一-龥]+[:：]/i)) {
        result.airlineContacts.push(lines[j].trim())
        j++
      }
      i = j - 1
      continue
    }
  }

  return result
}
