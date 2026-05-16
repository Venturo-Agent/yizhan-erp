/**
 * 護照 OCR 解析器 — MRZ 解析邏輯
 * 解析 Machine Readable Zone 第一行（姓名、國籍）與第二行（號碼、日期、性別）
 */

// ============================================
// MRZ 第一行解析（姓名、國籍、英文拼音）
// ============================================

export interface MrzParseResult {
  passportName: string | null
  passportNamePrint: string | null
  englishName: string | null
  nationality: string | null
  romanizationWithDash: string | null
}

export function parseMrzLine1(cleanText: string, cleanGoogleText: string): MrzParseResult {
  const result: MrzParseResult = {
    passportName: null,
    passportNamePrint: null,
    englishName: null,
    nationality: null,
    romanizationWithDash: null,
  }

  let mrzLine1Match: RegExpMatchArray | null = null

  // 優先嘗試 Google Vision（更準確）
  if (cleanGoogleText) {
    mrzLine1Match = cleanGoogleText.match(/P<([A-Z]{3})([A-Z<]{2,39})/i)
  }
  if (!mrzLine1Match) {
    mrzLine1Match = cleanText.match(/P<([A-Z]{3})([A-Z<]{2,39})/i)
  }

  // 備用：處理 OCR 誤讀 < 為 I 的情況
  if (!mrzLine1Match) {
    const relaxedMatch =
      cleanText.match(/P[<I\|]([A-Z]{3})([A-Z<I\|]{2,39})/i) ||
      cleanGoogleText?.match(/P[<I\|]([A-Z]{3})([A-Z<I\|]{2,39})/i)
    if (relaxedMatch) {
      mrzLine1Match = [
        relaxedMatch[0],
        relaxedMatch[1],
        relaxedMatch[2].replace(/[I\|]/g, '<'),
      ] as RegExpMatchArray
    }
  }

  if (!mrzLine1Match) return result

  result.nationality = mrzLine1Match[1]
  const namePart = mrzLine1Match[2]
  const parts = namePart.split('<<')

  if (parts.length >= 2) {
    const surname = parts[0].replace(/</g, '')
    const givenNamesWithDash = parts[1].replace(/</g, '-').replace(/-+$/, '').trim()
    const givenNamesClean = givenNamesWithDash.replace(/-/g, '')

    result.passportName = `${surname}/${givenNamesClean}`
    result.passportNamePrint = `${surname}, ${givenNamesWithDash}`
    result.romanizationWithDash = `${surname}/${givenNamesWithDash}`
    result.englishName = `${surname} ${givenNamesClean}`
  } else if (parts.length === 1) {
    const surname = parts[0].replace(/</g, '')
    result.passportName = surname
    result.passportNamePrint = surname
    result.englishName = surname
  }

  return result
}

// ============================================
// MRZ 第二行解析（護照號碼、生日、性別、效期）
// ============================================

export interface MrzLine2Result {
  passportNumber: string | null
  nationality: string | null
  birthDate: string | null
  sex: string | null
  passportExpiry: string | null
  nationalId: string | null
}

export function parseMrzLine2(
  cleanText: string,
  cleanGoogleText: string,
  knownNationality: string | null
): MrzLine2Result {
  const result: MrzLine2Result = {
    passportNumber: null,
    nationality: null,
    birthDate: null,
    sex: null,
    passportExpiry: null,
    nationalId: null,
  }

  let match: RegExpMatchArray | null = null
  if (cleanGoogleText) {
    match = cleanGoogleText.match(/(\d{9})(\d)([A-Z]{3})(\d{6})(\d)([MF])(\d{6})(\d)([A-Z0-9<]+)/i)
  }
  if (!match) {
    match = cleanText.match(/(\d{9})(\d)([A-Z]{3})(\d{6})(\d)([MF])(\d{6})(\d)([A-Z0-9<]+)/i)
  }

  if (match) {
    result.passportNumber = match[1]
    result.nationality = match[3]

    const birthYY = match[4].substring(0, 2)
    const birthMM = match[4].substring(2, 4)
    const birthDD = match[4].substring(4, 6)
    const birthYear = parseInt(birthYY) > 50 ? `19${birthYY}` : `20${birthYY}`
    result.birthDate = `${birthYear}-${birthMM}-${birthDD}`

    result.sex = match[6] === 'F' ? '女' : '男'

    const expiryYY = match[7].substring(0, 2)
    const expiryMM = match[7].substring(2, 4)
    const expiryDD = match[7].substring(4, 6)
    const expiryYear = parseInt(expiryYY) > 50 ? `19${expiryYY}` : `20${expiryYY}`
    result.passportExpiry = `${expiryYear}-${expiryMM}-${expiryDD}`

    const effectiveNationality = result.nationality || knownNationality
    if (effectiveNationality === 'TWN') {
      const remaining = match[9].replace(/</g, '')
      const nationalIdMatch = remaining.match(/([A-Z]\d{9})/i)
      if (nationalIdMatch) {
        result.nationalId = nationalIdMatch[1]
      }
    }
  }

  return result
}

// ============================================
// MRZ 解析失敗時的備用解析（文字比對）
// ============================================

export function parseFallbackFields(
  cleanText: string,
  ocrSpaceText: string,
  googleVisionText: string | null
): MrzLine2Result {
  const result: MrzLine2Result = {
    passportNumber: null,
    nationality: null,
    birthDate: null,
    sex: null,
    passportExpiry: null,
    nationalId: null,
  }

  const textToSearch = cleanText

  const passportMatch = textToSearch.match(/(\d{9})/g)
  if (passportMatch && passportMatch.length > 0) {
    result.passportNumber = passportMatch[0]
  }

  const nationalIdMatch = textToSearch.match(/[A-Z][12]\d{8}/i)
  if (nationalIdMatch) {
    result.nationalId = nationalIdMatch[0]
    result.sex = nationalIdMatch[0].charAt(1) === '1' ? '男' : '女'
  }

  const dateTextSource = ocrSpaceText || googleVisionText || ''
  const monthMap: Record<string, string> = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  }

  const formatDate = (m: RegExpMatchArray) => {
    const day = m[1].padStart(2, '0')
    const month = monthMap[m[2].toUpperCase()]
    const year = m[3]
    return `${year}-${month}-${day}`
  }

  const expiryMatch = dateTextSource.match(
    /(?:expiry|有效期|截止|效期)[^\d]*(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/i
  )
  const issueMatch = dateTextSource.match(
    /(?:issue|發照|發給)[^\d]*(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/i
  )
  const birthMatch = dateTextSource.match(
    /(?:birth|出生)[^\d]*(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/i
  )

  if (expiryMatch) result.passportExpiry = formatDate(expiryMatch)
  if (birthMatch) result.birthDate = formatDate(birthMatch)

  if (!result.passportExpiry || !result.birthDate) {
    const issueDateStr = issueMatch ? formatDate(issueMatch) : null
    const allDateMatches = dateTextSource.match(
      /(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/gi
    )

    if (allDateMatches) {
      for (const dateStr of allDateMatches) {
        const match = dateStr.match(
          /(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{4})/i
        )
        if (match) {
          const formattedDate = formatDate(match)
          const year = parseInt(match[3])
          if (formattedDate === issueDateStr) continue
          if (year >= 2024 && !result.passportExpiry) {
            result.passportExpiry = formattedDate
          } else if (year >= 1920 && year <= 2015 && !result.birthDate) {
            result.birthDate = formattedDate
          }
        }
      }
    }
  }

  return result
}
