/**
 * LINE Bot 意圖解析（純規則、不依賴 LLM）
 *
 * 從原 handler.ts 抽出、給 handler.ts 和 tryCreateOrderFromHistory 共用。
 */

// ============================================================================
// types
// ============================================================================

export interface ParsedIntent {
  /** 抓到的目標日期 YYYY-MM-DD（沒抓到 = null） */
  targetDate: string | null
  /** 抓到的成人 / 兒童 / 嬰兒人數 */
  adults: number | null
  children: number | null
  infants: number | null
  /** 是否在表達「我要下單 / 確認下單」 */
  wantsToConfirmOrder: boolean
  /** 抓到的聯絡電話 */
  phone: string | null
  /** 推測的聯絡人姓名（粗糙、給 LLM 補強） */
  nameHint: string | null
}

// ============================================================================
// constants
// ============================================================================

const CONFIRM_KEYWORDS = [
  '確認下單',
  '確認訂購',
  '我要下單',
  '我要訂',
  '幫我訂',
  '幫我下單',
  '報名',
  'ok 訂',
]

const PHONE_RE = /(09\d{2}[-\s]?\d{3}[-\s]?\d{3})/

// ============================================================================
// public API
// ============================================================================

export function parseIntent(text: string): ParsedIntent {
  const targetDate = parseDateChinese(text)
  const counts = parsePeopleCounts(text)
  const phoneMatch = text.match(PHONE_RE)
  const wantsToConfirmOrder = CONFIRM_KEYWORDS.some(k => text.includes(k))

  return {
    targetDate,
    adults: counts.adults,
    children: counts.children,
    infants: counts.infants,
    wantsToConfirmOrder,
    phone: phoneMatch ? phoneMatch[1].replace(/[-\s]/g, '') : null,
    nameHint: parseNameHint(text),
  }
}

// ============================================================================
// private helpers
// ============================================================================

/**
 * 抓「7/8」「7月8日」「2026-07-08」這類日期、回 YYYY-MM-DD。
 * - 沒寫年 = 用今年（過了今年的話 +1 年）
 */
function parseDateChinese(text: string): string | null {
  // ISO
  const iso = text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return formatYMD(Number(y), Number(m), Number(d))
  }
  // 中文「X月Y日 / X月Y號」
  const cn = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日號号]?/)
  if (cn) {
    const [, m, d] = cn
    return guessYearAndFormat(Number(m), Number(d))
  }
  // 「7/8」斜線
  const slash = text.match(/(?<!\d)(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/)
  if (slash) {
    const [, m, d] = slash
    return guessYearAndFormat(Number(m), Number(d))
  }
  return null
}

function guessYearAndFormat(month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const now = new Date()
  let year = now.getUTCFullYear()
  const candidate = new Date(Date.UTC(year, month - 1, day))
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  // 如果目標日期已經過了 30 天以上、視為「明年」
  if (candidate.getTime() < today.getTime() - 30 * 24 * 3600 * 1000) {
    year += 1
  }
  return formatYMD(year, month, day)
}

function formatYMD(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
}

function parsePeopleCounts(text: string): {
  adults: number | null
  children: number | null
  infants: number | null
} {
  const adultMatch = text.match(/(\d{1,2})\s*(?:位|個)?\s*(?:大人|成人|大|adult)/i)
  const childMatch = text.match(/(\d{1,2})\s*(?:位|個)?\s*(?:兒童|小孩|child)/i)
  const infantMatch = text.match(/(\d{1,2})\s*(?:位|個)?\s*(?:嬰兒|嬰|infant)/i)
  return {
    adults: adultMatch ? Number(adultMatch[1]) : null,
    children: childMatch ? Number(childMatch[1]) : null,
    infants: infantMatch ? Number(infantMatch[1]) : null,
  }
}

function parseNameHint(text: string): string | null {
  // 「我叫 XXX」「我是 XXX」「聯絡人 XXX」
  const m = text.match(/(?:我叫|我是|聯絡人[：:\s]?)\s*([^\d\s,，。!！?？]{1,8})/)
  return m ? m[1].trim() : null
}
