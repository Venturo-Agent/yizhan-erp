/**
 * 護照 OCR 文字解析器
 * 合併 OCR.space（MRZ）和 Google Vision（中文）的結果
 */

import { parseMrzLine1, parseMrzLine2, parseFallbackFields } from './passport-parser.mrz'
import { extractChineseName } from './passport-parser.chinese'

// ============================================
// Types
// ============================================

export interface PassportCustomerData {
  name: string
  english_name?: string
  passport_number?: string
  passport_name?: string
  passport_name_print?: string
  national_id?: string
  birth_date?: string
  passport_expiry?: string
  nationality?: string
  sex?: string
  phone?: string
}

// ============================================
// 主解析函數
// ============================================

/**
 * 解析護照 OCR 文字
 */
export function parsePassportText(
  ocrSpaceText: string,
  googleVisionText: string | null,
  _fileName: string
): PassportCustomerData {
  const cleanText = ocrSpaceText.replace(/\s+/g, '')
  const cleanGoogleText = googleVisionText?.replace(/\s+/g, '') || ''

  const customerData: PassportCustomerData = { name: '', phone: '' }

  // 解析 MRZ 第一行（姓名、國籍）
  const mrz1 = parseMrzLine1(cleanText, cleanGoogleText)
  if (mrz1.nationality) customerData.nationality = mrz1.nationality
  if (mrz1.passportName) customerData.passport_name = mrz1.passportName
  if (mrz1.passportNamePrint) customerData.passport_name_print = mrz1.passportNamePrint
  if (mrz1.englishName) {
    customerData.english_name = mrz1.englishName
    customerData.name = mrz1.englishName
  }

  // 解析 MRZ 第二行（護照號碼、生日、性別、效期）
  const mrz2 = parseMrzLine2(cleanText, cleanGoogleText, mrz1.nationality)
  if (mrz2.passportNumber) customerData.passport_number = mrz2.passportNumber
  if (!customerData.nationality && mrz2.nationality) customerData.nationality = mrz2.nationality
  if (mrz2.birthDate) customerData.birth_date = mrz2.birthDate
  if (mrz2.sex) customerData.sex = mrz2.sex
  if (mrz2.passportExpiry) customerData.passport_expiry = mrz2.passportExpiry
  if (mrz2.nationalId) customerData.national_id = mrz2.nationalId

  // MRZ 第二行解析失敗時使用備用方案
  if (!mrz2.passportNumber) {
    const fallback = parseFallbackFields(cleanText, ocrSpaceText, googleVisionText)
    if (fallback.passportNumber) customerData.passport_number = fallback.passportNumber
    if (fallback.nationalId) customerData.national_id = fallback.nationalId
    if (fallback.sex) customerData.sex = fallback.sex
    if (fallback.passportExpiry) customerData.passport_expiry = fallback.passportExpiry
    if (fallback.birthDate) customerData.birth_date = fallback.birthDate
  }

  // 從 Google Vision 抓中文名
  const { name: chineseName, confidence } = extractChineseName(
    googleVisionText,
    customerData.passport_name || null,
    mrz1.romanizationWithDash
  )

  // 從 OCR.space 抓英文名（備用）
  let englishName = ''
  if (!customerData.name) {
    const lines = ocrSpaceText.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (/name|surname|given/i.test(trimmed)) continue
      const nameMatch = trimmed.match(/^([A-Z]{2,}),\s*([A-Z][A-Z-]+)$/i)
      if (nameMatch) {
        const surname = nameMatch[1]
        const givenNameWithDash = nameMatch[2]
        const givenNameClean = givenNameWithDash.replace(/-/g, '')
        englishName = `${surname} ${givenNameClean}`
        customerData.english_name = englishName
        customerData.passport_name = `${surname}/${givenNameClean}`
        customerData.passport_name_print = `${surname}, ${givenNameWithDash}`
        break
      }
    }
  }

  // 決定最終姓名
  if (chineseName && confidence === 'high') {
    customerData.name = chineseName
    if (englishName) customerData.english_name = englishName
  } else if (chineseName && confidence === 'medium') {
    customerData.name = `${chineseName}⚠️`
    if (englishName) customerData.english_name = englishName
  } else if (chineseName && confidence === 'low') {
    customerData.name = customerData.passport_name
      ? `${chineseName}(${customerData.passport_name})⚠️`
      : `${chineseName}⚠️`
    if (englishName) customerData.english_name = englishName
  } else if (customerData.passport_name) {
    const [surname, givenName] = customerData.passport_name.split('/')
    customerData.name = givenName ? `${surname} ${givenName}` : surname
    customerData.english_name = customerData.name
  } else if (englishName) {
    customerData.name = englishName
  }

  if (!customerData.name) {
    customerData.name = customerData.english_name || '未命名'
  }

  return customerData
}
