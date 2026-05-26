/**
 * 護照 OCR 解析器 — 中文名辨識邏輯
 * 拼音驗證 + 多策略中文名抽取
 */

import { COMMON_SYLLABLES, EXCLUDE_WORDS, SUSPICIOUS_CHARS } from './passport-parser.constants'

// ============================================
// 拼音驗證
// ============================================

/**
 * 用拼音驗證中文名是否合理
 */
export function validateChineseNameByPinyin(
  chineseName: string,
  romanization: string
): { valid: boolean; expectedLength: number } {
  if (!romanization || !chineseName) {
    return { valid: true, expectedLength: 0 }
  }

  const parts = romanization.toUpperCase().split('/')
  if (parts.length !== 2) {
    return { valid: true, expectedLength: 0 }
  }

  const surname = parts[0]
  const givenName = parts[1]

  const countSyllables = (s: string): number => {
    if (s.includes('-')) {
      return s.split('-').filter(Boolean).length
    }

    s = s.toUpperCase()
    let count = 0
    let remaining = s

    while (remaining.length > 0) {
      let matched = false
      for (let len = Math.min(6, remaining.length); len >= 2; len--) {
        const prefix = remaining.substring(0, len)
        if (COMMON_SYLLABLES.includes(prefix)) {
          count++
          remaining = remaining.substring(len)
          matched = true
          break
        }
      }
      if (!matched) {
        const vowelMatch = remaining.match(/^[^AEIOU]*[AEIOU]+[NG]*/i)
        if (vowelMatch) {
          count++
          remaining = remaining.substring(vowelMatch[0].length)
        } else if (remaining.length > 0) {
          count++
          break
        }
      }
    }

    return Math.max(count, 1)
  }

  const expectedLength = countSyllables(surname) + countSyllables(givenName)
  const valid = chineseName.length >= expectedLength

  return { valid, expectedLength }
}

// ============================================
// 中文名辨識（多策略）
// ============================================

/**
 * 從 Google Vision OCR 文字中抽取中文名
 * 使用多策略：姓名標籤、Name 區塊、英文名附近
 */
export function extractChineseName(
  googleVisionText: string | null,
  passportName: string | null,
  romanizationWithDash: string | null
): { name: string; confidence: string } {
  if (!googleVisionText) return { name: '', confidence: 'none' }

  let chineseName = ''
  let confidence = 'high'

  const isExcluded = (candidate: string) => EXCLUDE_WORDS.some(word => candidate.includes(word))

  // 策略 0: 找 "姓名" 標籤後的中文名
  const nameBlockMatch = googleVisionText.match(/(?:姓名|姓\s*名|Name)[^\n]*[\n\r]+([一-鿿]{2,4})/i)
  if (nameBlockMatch && !isExcluded(nameBlockMatch[1])) {
    chineseName = nameBlockMatch[1]
    confidence = 'high'
  }

  // 策略 1: 找 Name 區塊後面的中文名
  if (!chineseName) {
    const lines = googleVisionText.split('\n')
    let foundNameSection = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (/Name|姓名|Given names/i.test(trimmed)) {
        foundNameSection = true
        continue
      }
      if (foundNameSection) {
        const chineseMatch = trimmed.match(/^([一-鿿]{2,4})$/)
        if (chineseMatch && !isExcluded(chineseMatch[1])) {
          chineseName = chineseMatch[1]
          confidence = 'high'
          break
        }
        if (/^[A-Z]+,\s*[A-Z-]+/.test(trimmed)) {
          const inlineMatch = trimmed.match(/([一-鿿]{2,4})/)
          if (inlineMatch && !isExcluded(inlineMatch[1])) {
            chineseName = inlineMatch[1]
            confidence = 'high'
          }
          break
        }
      }
    }
  }

  // 策略 2: 找英文名附近的中文
  if (!chineseName && passportName) {
    const surname = passportName.split('/')[0]?.toUpperCase()
    if (surname) {
      const pattern = new RegExp(`${surname}[,\\s]+[A-Z-]+`, 'i')
      const englishNameMatch = googleVisionText.match(pattern)
      if (englishNameMatch) {
        const matchIndex = googleVisionText.indexOf(englishNameMatch[0])
        const beforeEnglish = googleVisionText.substring(Math.max(0, matchIndex - 80), matchIndex)
        const chineseMatches = beforeEnglish.match(/[一-鿿]{2,4}/g)
        if (chineseMatches) {
          for (let i = chineseMatches.length - 1; i >= 0; i--) {
            if (!isExcluded(chineseMatches[i])) {
              chineseName = chineseMatches[i]
              confidence = 'medium'
              break
            }
          }
        }
      }
    }
  }

  if (!chineseName) confidence = 'none'

  // 可疑字元檢查
  if (chineseName && SUSPICIOUS_CHARS.some(char => chineseName.includes(char))) {
    confidence = 'low'
  }

  // 拼音交叉驗證
  const romanization = romanizationWithDash || passportName
  if (chineseName && romanization) {
    const validation = validateChineseNameByPinyin(chineseName, romanization)
    if (!validation.valid) {
      if (Math.abs(validation.expectedLength - chineseName.length) > 1) {
        return { name: '', confidence: 'none' }
      }
      confidence = 'low'
    }
  }

  return { name: chineseName, confidence }
}
