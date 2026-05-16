/**
 * 中文日期格式化工具
 */

/**
 * 格式化日期為中文完整格式 (YYYY年M月D日)
 * @param date - ISO 字串或 Date 物件
 * @returns 2024年1月15日 格式
 */
export function formatDateChinese(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為中文月日格式 (M月D日)
 * @param date - ISO 字串或 Date 物件
 * @returns 1月15日 格式
 */
export function formatDateMonthDayChinese(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

/**
 * 格式化為年月格式 (YYYY年M月)
 * @param date - ISO 字串或 Date 物件
 * @returns 2024年1月 格式
 */
export function formatYearMonth(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  } catch {
    return ''
  }
}

/**
 * 格式化星期幾 (週X)
 * @param date - ISO 字串或 Date 物件
 * @returns 週一、週二... 格式
 */
export function formatWeekday(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
    return weekdays[d.getDay()]
  } catch {
    return ''
  }
}

/**
 * 格式化日期為中文完整格式含星期 (YYYY年M月D日 週X)
 * @param date - ISO 字串或 Date 物件
 * @returns 2024年1月15日 週一 格式
 */
export function formatDateChineseWithWeekday(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${formatDateChinese(d)} ${formatWeekday(d)}`
  } catch {
    return ''
  }
}
