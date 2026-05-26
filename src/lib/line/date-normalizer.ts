/**
 * 日期 normalizer：抓 user 訊息裡的 date pattern、補上星期幾。
 *
 * 為什麼存在：
 *   LLM 算「X 月 X 日是星期幾」很容易翻車（沒日曆、用記憶 mod 7 硬猜）。
 *   實測 22:30 同事問「10/17 是星期幾」、bot 連續答錯（先說四、糾正後五、
 *   實際星期六）。解法：在 user 訊息進 LLM 前、code 先抓 date pattern 算
 *   好星期幾、替換成「10 月 17 日（星期六）」、LLM 不用算、看到字面直接用。
 *
 * 抓 patterns：
 *   - YYYY-MM-DD / YYYY/MM/DD（譬如 2026-10-17、2026/10/17）
 *   - MM/DD（譬如 10/17、預設今年）
 *   - M 月 D 日 / M月D日（譬如 10 月 17 日、預設今年）
 *
 * 不抓（避免誤傷）：
 *   - 相對日期（「明天」「下週」「明年 X 月」）— 太複雜、留給 LLM
 *   - 純年份（「2026 年」）— 不關星期幾
 *   - 純月份（「10 月」沒帶日）— 不能算星期
 *
 * 時區：強制 Asia/Taipei。
 */

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

/**
 * 算給定 Y/M/D 是星期幾（用 UTC 為 baseline、避免 host timezone 跨日問題）。
 * 失敗回 null（invalid date）。
 *
 * 為什麼用 Date.UTC：
 *   `new Date('2026-10-17T00:00:00+08:00').getUTCDay()` 會反推回 UTC 前一日、算出來錯一天。
 *   直接用 `Date.UTC(y, m-1, d)` 建一個「UTC 此日」的 timestamp、getUTCDay() 才準。
 */
function getWeekdayOf(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const ts = Date.UTC(year, month - 1, day)
  if (isNaN(ts)) return null
  const d = new Date(ts)
  // 反查確認沒被 JS 自動進位（譬如 2026-02-30 → 2026-03-02）
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
    return null
  }
  return WEEKDAYS[d.getUTCDay()]
}

/**
 * 取台灣時區的「今日」資訊。
 *
 * 用 en-CA locale + Intl 拿穩定的 YYYY-MM-DD 格式（en-CA 就是 ISO date）、
 * 再用 Date.UTC 算星期、確保不受 host timezone 影響。
 */
export function getTaipeiToday(): {
  isoDate: string // '2026-05-19'
  weekday: string // '日'/'一'/.../'六'
  formatted: string // '2026-05-19（星期一）'
} {
  const now = new Date()
  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [y, m, d] = isoDate.split('-').map(Number)
  const weekday = getWeekdayOf(y, m, d) ?? '？'
  return {
    isoDate,
    weekday,
    formatted: `${isoDate}（星期${weekday}）`,
  }
}

/**
 * 預處理 user 訊息：抓 date pattern、補上「（星期 X）」。
 *
 * 範例：
 *   「我想 10 月 17 日去」 → 「我想 10 月 17 日（星期六）去」
 *   「2026-10-17 出發」    → 「2026-10-17（星期六）出發」
 *   「10/17 可以嗎」        → 「10/17（星期六）可以嗎」
 *
 * 沒命中：原文回傳。
 */
export function normalizeDatesInText(userText: string, todayIsoDate?: string): string {
  const today = todayIsoDate ?? getTaipeiToday().isoDate
  const currentYear = parseInt(today.split('-')[0], 10)

  let result = userText

  // pattern 1: YYYY-MM-DD 或 YYYY/MM/DD（最 specific、先處理避開後續誤抓）
  result = result.replace(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/g, (full, y, m, d) => {
    const weekday = getWeekdayOf(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10))
    return weekday ? `${full}（星期${weekday}）` : full
  })

  // pattern 2: M月D日 / M 月 D 日（中文）
  result = result.replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, (full, m, d) => {
    const weekday = getWeekdayOf(currentYear, parseInt(m, 10), parseInt(d, 10))
    return weekday ? `${full}（星期${weekday}）` : full
  })

  // pattern 3: M/D（沒年份、預設今年；避開 YYYY-MM-DD 已處理過的 case）
  // 用 negative lookbehind 排除年份前綴（已被 pattern 1 抓）
  result = result.replace(/(?<![\d/-])(\d{1,2})\/(\d{1,2})(?!\d|\/)/g, (full, m, d) => {
    const mNum = parseInt(m, 10)
    const dNum = parseInt(d, 10)
    // 過濾不合理數字（防誤抓「7/24 小時」等）
    if (mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) return full
    const weekday = getWeekdayOf(currentYear, mNum, dNum)
    return weekday ? `${full}（星期${weekday}）` : full
  })

  return result
}
