/**
 * 日期解析工具（避免時區問題）
 */

/**
 * 將日期字串解析為本地時間的 Date 物件（午夜）
 *
 * 重要：這是解決時區問題的標準方法！
 *
 * 問題：new Date('2024-01-15') 或 parseISO('2024-01-15') 會被解析為 UTC 午夜
 *       在台灣時區 (UTC+8) 會變成 2024-01-15 08:00，可能導致日期比較錯誤
 *
 * 解決：使用 new Date(year, month-1, day) 建立本地時間的日期物件
 *
 * @param dateStr - 日期字串，支援以下格式：
 *   - "2024-01-15" (純日期)
 *   - "2024-01-15T00:00:00" (含時間)
 *   - "2024-01-15T00:00:00.000Z" (ISO 格式)
 * @returns 本地時間午夜的 Date 物件，或 null（解析失敗時）
 *
 * @example
 * parseLocalDate('2024-01-15') // → new Date(2024, 0, 15) 本地午夜
 * parseLocalDate('2024-01-15T08:30:00') // → new Date(2024, 0, 15) 本地午夜
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  try {
    // 只取日期部分 YYYY-MM-DD（忽略時間部分）
    const datePart = dateStr.split('T')[0]
    const parts = datePart.split('-')
    if (parts.length !== 3) return null

    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)

    // 驗證數值合理性
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    // 使用 new Date(year, month-1, day) 建立本地時間日期
    const date = new Date(year, month - 1, day)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
