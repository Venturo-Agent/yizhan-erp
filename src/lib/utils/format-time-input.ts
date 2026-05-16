/**
 * 時間輸入格式化工具
 *
 * 功能：
 * 1. 全形轉半形 (０７：００ → 07:00)
 * 2. 自動加冒號 (0700 → 07:00)
 * 3. 支援各種輸入格式
 */

// 全形轉半形對照表
const fullWidthToHalfWidth: Record<string, string> = {
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
  '：': ':',
  '．': '.',
  '－': '-',
  '／': '/',
}

/**
 * 將全形字符轉換為半形
 */
export function fullWidthToHalf(str: string): string {
  return str
    .split('')
    .map(char => fullWidthToHalfWidth[char] || char)
    .join('')
}

/**
 * 格式化時間輸入
 * 支援的輸入格式：
 * - 0700 → 07:00
 * - 700 → 07:00
 * - 07:00 → 07:00
 * - 7:00 → 07:00
 * - ０７００ → 07:00 (全形)
 * - ０７：００ → 07:00 (全形)
 */
export function formatTimeInput(input: string): string {
  if (!input) return ''

  // 先轉換全形為半形
  let value = fullWidthToHalf(input.trim())

  // 移除非數字和冒號的字符
  value = value.replace(/[^\d:]/g, '')

  // 如果已經包含冒號，驗證格式
  if (value.includes(':')) {
    const parts = value.split(':')
    if (parts.length === 2) {
      const hours = parts[0].padStart(2, '0')
      const minutes = parts[1].padStart(2, '0').slice(0, 2)

      const h = parseInt(hours, 10)
      const m = parseInt(minutes, 10)

      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${hours}:${minutes}`
      }
    }
    return value // 無效格式，返回原值讓用戶繼續編輯
  }

  // 純數字格式，自動加冒號
  const digits = value.replace(/\D/g, '')

  if (digits.length === 0) return ''

  if (digits.length <= 2) {
    // 1-2 位數字，可能是小時，不自動加冒號
    return digits
  }

  if (digits.length === 3) {
    // 3 位數字：700 → 07:00
    const hours = digits.slice(0, 1).padStart(2, '0')
    const minutes = digits.slice(1, 3)
    return `${hours}:${minutes}`
  }

  if (digits.length >= 4) {
    // 4+ 位數字：0700 → 07:00
    const hours = digits.slice(0, 2)
    const minutes = digits.slice(2, 4)

    const h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)

    // 驗證時間有效性
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    }

    // 如果無效，嘗試解析為 H:MM 格式 (例如 1234 可能是 12:34)
    return `${hours}:${minutes}`
  }

  return value
}

/**
 * 驗證時間格式是否有效
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time) return true // 空值視為有效（可選欄位）

  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
  return regex.test(time)
}
