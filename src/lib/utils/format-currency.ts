/**
 * 金額格式化工具
 * 統一全專案金額顯示格式
 */

/**
 * 格式化金額為標準貨幣顯示格式
 * @param amount - 金額數值
 * @param currency - 貨幣類型 (TWD, USD, CNY)
 * @returns 格式化的金額字串 (例: NT$ 1,000)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: 'TWD' | 'USD' | 'CNY' = 'TWD'
): string {
  if (amount === null || amount === undefined) return ''

  // 2026-05-26 William 拍板：台幣不顯示符號（NT$ 拿掉、只留數字）、外幣保留符號
  const prefix = {
    TWD: '',
    USD: '$',
    CNY: '¥',
  }[currency]

  const sign = amount < 0 ? '-' : ''
  const space = prefix ? ' ' : ''
  return `${sign}${prefix}${space}${Math.abs(amount).toLocaleString()}`
}

/**
 * 格式化金額（僅數字，無貨幣符號）
 * @param amount - 金額數值
 * @returns 格式化的數字字串 (例: 1,000)
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return ''
  return amount.toLocaleString('zh-TW')
}

/**
 * 格式化金額為台幣（帶符號）
 * @param amount - 金額數值
 * @returns 格式化的台幣字串 (例: NT$ 1,000)
 */
export function formatTWD(amount: number | null | undefined): string {
  return formatCurrency(amount, 'TWD')
}

/**
 * 格式化金額為美元（帶符號）
 * @param amount - 金額數值
 * @returns 格式化的美元字串 (例: $ 1,000)
 */
export function formatUSD(amount: number | null | undefined): string {
  return formatCurrency(amount, 'USD')
}

/**
 * 格式化金額（拍板規格 §1：$1,000 / JPY 50,000、千分位、無空格 TWD 用 $、外幣 code prefix + 空格）
 * 用於 <Money> component
 */
const CURRENCY_CONFIG: Record<string, { symbol: string; spaced: boolean; decimals: number }> = {
  TWD: { symbol: '', spaced: false, decimals: 0 }, // 2026-05-26 台幣不顯示符號（William 拍板）
  USD: { symbol: '$', spaced: false, decimals: 2 },
  JPY: { symbol: 'JPY', spaced: true, decimals: 0 },
  CNY: { symbol: '¥', spaced: false, decimals: 2 },
  KRW: { symbol: 'KRW', spaced: true, decimals: 0 },
  EUR: { symbol: '€', spaced: false, decimals: 2 },
  GBP: { symbol: '£', spaced: false, decimals: 2 },
  HKD: { symbol: 'HK$', spaced: false, decimals: 2 },
  SGD: { symbol: 'S$', spaced: false, decimals: 2 },
  THB: { symbol: '฿', spaced: false, decimals: 2 },
  VND: { symbol: 'VND', spaced: true, decimals: 0 },
  IDR: { symbol: 'IDR', spaced: true, decimals: 0 },
  MYR: { symbol: 'RM', spaced: false, decimals: 2 },
}

export function formatMoneyWithCurrency(
  amount: number | null | undefined,
  currency: string = 'TWD',
  options?: { decimals?: number; showSymbol?: boolean }
): string {
  if (amount === null || amount === undefined) return ''
  const config = CURRENCY_CONFIG[currency] || { symbol: currency, spaced: true, decimals: 2 }
  const decimals = options?.decimals ?? config.decimals
  const showSymbol = options?.showSymbol ?? true
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  if (!showSymbol) return `${sign}${formatted}`
  return config.spaced
    ? `${sign}${config.symbol} ${formatted}`
    : `${sign}${config.symbol}${formatted}`
}
