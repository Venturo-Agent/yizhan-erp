/**
 * 時間格式化工具（含台北時區相關）
 */

import { formatDate } from './basic'

/**
 * 格式化日期時間為顯示格式
 * @param date - ISO 字串或 Date 物件
 * @returns 2024-01-15 14:30 格式
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const datePart = formatDate(d)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${datePart} ${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * 只格式化時間
 * @param date - ISO 字串或 Date 物件
 * @returns HH:mm 格式
 */
export function formatTimeOnly(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * 取得日期的開始時間（午夜 00:00:00.000）
 * 用於日期比較時消除時間影響
 *
 * @param date - Date 物件
 * @returns 該日期午夜的 Date 物件
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * 格式化日期為台北時區 YYYY-MM-DD（QDF R2 SSOT）
 *
 * 跟 formatDate 差異：
 *   - formatDate：本地時區（user 設備所在）
 *   - formatDateTaipei：強制 Asia/Taipei
 *
 * 用途：
 *   - "今天日期" 字串（譬如送 DB 當 date column）
 *   - FullCalendar 全天事件
 *   - 跨時區用戶仍需呈現台北日期的場景
 *
 * 取代以下散刻 pattern：
 *   - new Date().toISOString().slice(0, 10) — 是 UTC、不是台北
 *   - date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
 *
 * @param date - Date / ISO 字串 / null / undefined
 * @returns YYYY-MM-DD 字串（台北時區）
 *
 * @example
 * formatDateTaipei(new Date()) // 台北今天
 * formatDateTaipei('2024-01-15T16:00:00.000Z') // "2024-01-16"
 */
export function formatDateTaipei(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  } catch {
    return ''
  }
}

/**
 * 從 ISO 時間字串取得台灣時區的日期字串 (YYYY-MM-DD)
 *
 * @deprecated 改用 formatDateTaipei（功能完全相同、命名更一致）
 *
 * @param isoString - ISO 格式時間字串，如 "2024-01-15T16:00:00.000Z"
 * @returns YYYY-MM-DD 格式的日期字串（台灣時區）
 */
export function toTaipeiDateString(isoString: string | null | undefined): string {
  if (!isoString) return ''

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    // 使用 sv-SE locale 取得 YYYY-MM-DD 格式，指定台北時區
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  } catch {
    return isoString
  }
}

/**
 * 從 ISO 時間字串取得台灣時區的時間字串 (HH:MM)
 *
 * @param isoString - ISO 格式時間字串
 * @param options - 選項
 * @param options.skipMidnight - 是否跳過午夜時間（回傳空字串）
 * @returns HH:MM 格式的時間字串
 */
export function toTaipeiTimeString(
  isoString: string | null | undefined,
  options: { skipMidnight?: boolean } = {}
): string {
  if (!isoString) return ''

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''

    const timeStr = date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei',
    })

    // 如果是午夜且設定跳過，回傳空字串
    if (options.skipMidnight && timeStr === '00:00') return ''

    return timeStr
  } catch {
    return ''
  }
}
