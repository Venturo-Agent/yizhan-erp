/**
 * 護照效期檢查工具
 * 檢查護照是否已過期或距離出發日不足 6 個月
 */

type PassportExpiryStatus = 'expired' | 'insufficient' | 'valid' | 'unknown'

interface PassportExpiryResult {
  status: PassportExpiryStatus
  label: string
  color: string // Tailwind CSS class
}

/**
 * 檢查護照效期狀態
 * @param passportExpiry - 護照效期日期 (YYYY-MM-DD 格式)
 * @param departureDate - 出發日期 (YYYY-MM-DD 格式，可選)
 * @returns 護照效期狀態
 */
export function checkPassportExpiry(
  passportExpiry: string | null | undefined,
  departureDate?: string | null
): PassportExpiryResult {
  // 沒有護照效期資料
  if (!passportExpiry) {
    return { status: 'unknown', label: '', color: '' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(passportExpiry)
  expiry.setHours(0, 0, 0, 0)

  // 檢查是否已過期
  if (expiry < today) {
    return { status: 'expired', label: '已過期', color: 'text-status-danger' }
  }

  // 如果有出發日期，檢查是否距離出發日不足 6 個月
  if (departureDate) {
    const departure = new Date(departureDate)
    departure.setHours(0, 0, 0, 0)

    // 計算出發日 + 6 個月
    const requiredExpiry = new Date(departure)
    requiredExpiry.setMonth(requiredExpiry.getMonth() + 6)

    if (expiry < requiredExpiry) {
      return { status: 'insufficient', label: '效期不足', color: 'text-status-warning' }
    }
  } else {
    // 沒有出發日期時，檢查是否距離今天不足 6 個月
    const sixMonthsFromNow = new Date(today)
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

    if (expiry < sixMonthsFromNow) {
      return { status: 'insufficient', label: '效期不足', color: 'text-status-warning' }
    }
  }

  return { status: 'valid', label: '', color: '' }
}

/**
 * 格式化護照效期顯示（含狀態標籤）
 * @param passportExpiry - 護照效期日期
 * @param departureDate - 出發日期（可選）
 * @returns 格式化的顯示字串和樣式
 */
export function formatPassportExpiryWithStatus(
  passportExpiry: string | null | undefined,
  departureDate?: string | null
): { text: string; className: string; statusLabel: string } {
  if (!passportExpiry) {
    return { text: '-', className: 'text-morandi-primary', statusLabel: '' }
  }

  const result = checkPassportExpiry(passportExpiry, departureDate)

  return {
    text: passportExpiry,
    className: result.color || 'text-morandi-primary',
    statusLabel: result.label,
  }
}
