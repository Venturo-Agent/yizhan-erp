/**
 * 日期處理工具函數
 */

// 日期格式轉換輔助函式
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // 支援 YYYY/MM/DD 或 YYYY-MM-DD 格式
  let parts: string[]
  if (dateStr.includes('/')) {
    parts = dateStr.split('/')
  } else if (dateStr.includes('-')) {
    parts = dateStr.split('-')
  } else {
    return null
  }

  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}

function _formatDateShort(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

export function formatDateFull(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
