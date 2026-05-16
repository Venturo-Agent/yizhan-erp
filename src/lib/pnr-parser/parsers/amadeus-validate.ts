/**
 * Amadeus PNR 電報驗證邏輯
 */

import { ValidationResult } from '../types'

/**
 * 驗證 AMADEUS PNR 格式
 */
export function validateAmadeusPNR(rawPNR: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  const lines = rawPNR
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    errors.push('電報內容不能為空')
    return { isValid: false, errors, warnings, suggestions }
  }

  const hasHeader = lines.some(line => line.startsWith('RP/'))
  if (!hasHeader) {
    warnings.push('建議包含Header資訊 (RP/...)')
  }

  const hasValidNames = lines.some(line => /\d+\.[A-Z]+\/[A-Z]+/g.test(line))
  if (!hasValidNames) {
    errors.push('未找到有效的旅客姓名格式 (例: 1.SMITH/JOHN)')
  }

  const hasFlightSegments = lines.some(line =>
    /^\d+\s+[A-Z0-9]{2}\s+\d{1,4}\s+[A-Z]\s+\d{2}[A-Z]{3}/i.test(line)
  )
  if (!hasFlightSegments) {
    warnings.push('未找到航班資訊')
  }

  const hasTicketingDeadline = lines.some(line =>
    /(?:ON OR BEFORE|BEFORE)\s+\d{2}[A-Z]{3}/i.test(line)
  )
  if (!hasTicketingDeadline) {
    suggestions.push('建議包含出票期限資訊')
  }

  lines.forEach((line, idx) => {
    if (line.match(/^SR[A-Z]{4}/i)) {
      const match = line.match(/^SR([A-Z]{4})(?:-(.+?))?(?:\/S(\d+(?:-\d+)?))?(?:\/P(\d+))?/i)
      if (!match) {
        warnings.push(`第${idx + 1}行SSR格式可能不正確: ${line}`)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}
