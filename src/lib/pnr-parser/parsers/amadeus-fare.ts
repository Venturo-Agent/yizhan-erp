/**
 * Amadeus PNR 票價解析邏輯
 */

import { ParsedFareData, TaxItem } from '../types'

/**
 * 從 Amadeus 電報解析票價資訊
 */
export function parseFareFromTelegram(rawPNR: string): ParsedFareData | null {
  const lines = rawPNR.split('\n').map(line => line.trim())
  const fullText = rawPNR.toUpperCase()

  let currency = 'TWD'
  let baseFare: number | null = null
  let taxes: number | null = null
  let totalFare: number | null = null
  let fareBasis: string | null = null
  let validatingCarrier: string | null = null
  const taxBreakdown: TaxItem[] = []
  let perPassenger = true
  const rawFareLines: string[] = []

  const fvMatch = fullText.match(/FV\s+([A-Z]{2})/)
  if (fvMatch) {
    validatingCarrier = fvMatch[1]
  }

  const fbMatch = fullText.match(/(?:K\s+FB-?|FBA-?)\s*([A-Z0-9]+)/i)
  if (fbMatch) {
    fareBasis = fbMatch[1]
  }

  for (const line of lines) {
    const upperLine = line.toUpperCase()

    const kFareMatch = upperLine.match(/K\s+FARE\s+([A-Z]{3})[\s]*([\d,]+(?:\.\d{2})?)/)
    if (kFareMatch) {
      currency = kFareMatch[1]
      baseFare = parseFloat(kFareMatch[2].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const kTaxMatch = upperLine.match(/K\s+TAX\s+(?:([A-Z]{3})[\s]*)?([\d,]+(?:\.\d{2})?)/)
    if (kTaxMatch) {
      if (kTaxMatch[1]) currency = kTaxMatch[1]
      taxes = parseFloat(kTaxMatch[2].replace(/,/g, ''))
      rawFareLines.push(line)

      const taxCodeMatch = upperLine.match(/([\d.]+)([A-Z]{2})/g)
      if (taxCodeMatch) {
        for (const match of taxCodeMatch) {
          const [, amount, code] = match.match(/([\d.]+)([A-Z]{2})/) || []
          if (amount && code) {
            taxBreakdown.push({ code, amount: parseFloat(amount) })
          }
        }
      }
      continue
    }

    const kTotalMatch = upperLine.match(/K\s+TOTAL\s+([A-Z]{3})[\s]*([\d,]+(?:\.\d{2})?)/)
    if (kTotalMatch) {
      currency = kTotalMatch[1]
      totalFare = parseFloat(kTotalMatch[2].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const fareMatch = upperLine.match(/^FARE\s+([A-Z]{3})[\s]*([\d,]+(?:\.\d{2})?)/)
    if (fareMatch) {
      currency = fareMatch[1]
      baseFare = parseFloat(fareMatch[2].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const taxMatch = upperLine.match(/^TAX\s+(?:([A-Z]{3})[\s]*)?([\d,]+(?:\.\d{2})?)/)
    if (taxMatch) {
      const taxAmount = parseFloat(taxMatch[2].replace(/,/g, ''))
      if (taxMatch[1]) {
        currency = taxMatch[1]
        taxes = taxAmount
      } else {
        const allTaxes = upperLine.match(/([\d]+)([A-Z]{2})/g)
        if (allTaxes) {
          taxes = 0
          for (const t of allTaxes) {
            const [, amount, code] = t.match(/([\d]+)([A-Z]{2})/) || []
            if (amount && code) {
              const taxAmt = parseFloat(amount)
              taxes += taxAmt
              taxBreakdown.push({ code, amount: taxAmt })
            }
          }
        } else {
          taxes = taxAmount
        }
      }
      rawFareLines.push(line)
      continue
    }

    const totalMatch = upperLine.match(/^TOTAL\s+([A-Z]{3})[\s]*([\d,]+(?:\.\d{2})?)/)
    if (totalMatch) {
      currency = totalMatch[1]
      totalFare = parseFloat(totalMatch[2].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const cnFareMatch = line.match(/票價[:：]\s*(?:NT\$|TWD|USD)?\s*([\d,]+)/)
    if (cnFareMatch) {
      baseFare = parseFloat(cnFareMatch[1].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const cnTaxMatch = line.match(/稅金[:：]\s*(?:NT\$|TWD|USD)?\s*([\d,]+)/)
    if (cnTaxMatch) {
      taxes = parseFloat(cnTaxMatch[1].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const cnTotalMatch = line.match(/[合總]計[:：]\s*(?:NT\$|TWD|USD)?\s*([\d,]+)/)
    if (cnTotalMatch) {
      totalFare = parseFloat(cnTotalMatch[1].replace(/,/g, ''))
      rawFareLines.push(line)
      continue
    }

    const grandTotalMatch = upperLine.match(/GRAND\s+TOTAL\s+([A-Z]{3})[\s]*([\d,]+(?:\.\d{2})?)/)
    if (grandTotalMatch) {
      currency = grandTotalMatch[1]
      totalFare = parseFloat(grandTotalMatch[2].replace(/,/g, ''))
      perPassenger = false
      rawFareLines.push(line)
      continue
    }
  }

  if (totalFare === null && baseFare === null) {
    return null
  }

  if (totalFare === null && baseFare !== null) {
    totalFare = baseFare + (taxes || 0)
  }

  if (baseFare === null && totalFare !== null && taxes !== null) {
    baseFare = totalFare - taxes
  }

  return {
    currency,
    baseFare,
    taxes,
    totalFare: totalFare || 0,
    fareBasis,
    validatingCarrier,
    taxBreakdown,
    perPassenger,
    raw: rawFareLines.join('\n'),
  }
}
