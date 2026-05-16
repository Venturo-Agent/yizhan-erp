/**
 * PNR 名稱配對演算法
 * 用於比對 PNR 旅客姓名與團員護照拼音
 */

interface TourMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  pnr?: string | null
}

/**
 * 正規化姓名（移除稱謂、空格、轉大寫）
 */
export function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+(MR|MRS|MS|MISS|MSTR|CHD|INF)$/i, '') // 移除稱謂
    .replace(/\s+/g, '') // 移除空格
    .trim()
}

/**
 * 分離護照拼音的姓氏和名字
 * 格式: SURNAME/GIVENNAME 或 SURNAME/GIVENNAME MR
 */
export function splitPassportName(name: string): { surname: string; givenName: string } {
  const normalized = normalizeName(name)
  const parts = normalized.split('/')
  if (parts.length >= 2) {
    return { surname: parts[0], givenName: parts.slice(1).join('/') }
  }
  // 沒有斜線的情況，當作整個是姓名
  return { surname: normalized, givenName: '' }
}

/**
 * 計算兩個字串的相似度（Jaro-Winkler 演算法簡化版）
 * @returns 0-100 的相似度分數
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0 && len2 === 0) return 100
  if (len1 === 0 || len2 === 0) return 0

  // 計算共同字元
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1
  const matched1 = new Array(len1).fill(false)
  const matched2 = new Array(len2).fill(false)
  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(len2, i + matchWindow + 1)

    for (let j = start; j < end; j++) {
      if (matched2[j] || str1[i] !== str2[j]) continue
      matched1[i] = true
      matched2[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  // 計算換位
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!matched1[i]) continue
    while (!matched2[k]) k++
    if (str1[i] !== str2[k]) transpositions++
    k++
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

  // Winkler 加權（共同前綴）
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (str1[i] === str2[i]) prefix++
    else break
  }

  return Math.round((jaro + prefix * 0.1 * (1 - jaro)) * 100)
}

/**
 * 從團員名單中找出最佳配對
 */
export function findBestMatch(
  pnrName: string,
  members: TourMember[]
): { member: TourMember | null; confidence: 'exact' | 'partial' | 'none'; score: number } {
  // 正規化 PNR 姓名
  const normalizedPnr = normalizeName(pnrName)
  const pnrParts = splitPassportName(pnrName)

  let bestMatch: TourMember | null = null
  let bestScore = 0

  for (const member of members) {
    if (!member.passport_name) continue

    const normalizedMember = normalizeName(member.passport_name)
    const memberParts = splitPassportName(member.passport_name)

    // 1. 完全相符（護照拼音完全一樣）
    if (normalizedPnr === normalizedMember) {
      return { member, confidence: 'exact', score: 100 }
    }

    // 2. 姓氏必須完全相同才考慮
    if (pnrParts.surname !== memberParts.surname) continue

    // 3. 姓氏相同，計算名字相似度
    const givenNameScore = calculateSimilarity(pnrParts.givenName, memberParts.givenName)

    if (givenNameScore > bestScore) {
      bestScore = givenNameScore
      bestMatch = member
    }
  }

  // 判斷信心度
  let confidence: 'exact' | 'partial' | 'none' = 'none'

  if (bestScore >= 80) {
    confidence = 'partial'
  } else if (bestScore >= 60) {
    confidence = 'partial'
  } else {
    confidence = 'none'
    bestMatch = null
  }

  return { member: bestMatch, confidence, score: bestScore }
}
