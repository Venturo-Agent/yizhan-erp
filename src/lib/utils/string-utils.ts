/**
 * 字串處理工具函數
 */

/**
 * 移除 HTML 標籤，只保留純文字
 * @param html - 包含 HTML 的字串
 * @returns 純文字內容
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * 截斷文字並加上省略號
 * @param text - 原始文字
 * @param maxLength - 最大長度
 * @returns 截斷後的文字
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 將駝峰式命名轉換為 kebab-case
 * @param str - 駝峰式字串
 * @returns kebab-case 字串
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 將 kebab-case 轉換為駝峰式命名
 * @param str - kebab-case 字串
 * @returns 駝峰式字串
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}
