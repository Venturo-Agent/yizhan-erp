/**
 * Quote Service — 報價單純函式集
 *
 * @module quote.service
 * @description
 * 2026-05-30 重構：
 * - 移除 class / BaseService 繼承（外部從未呼叫繼承下來的 CRUD）
 * - 移除 useQuoteStore.getState() 依賴（外部讀資料統一走 @/data 的 entity hook）
 * - 業務方法（duplicateQuote / getQuotesByTour / getQuotesByStatus）搬到 useQuotes hook
 *   原因：這些方法需要 client state（quotes 陣列），屬於 React 層責任，不該在 service singleton 內讀 store
 * - 本檔只保留「不依賴 store 的純函式」：validate 與 calculateTotalCost
 */

import { Quote } from '@/stores/types/quote.types'
import { ValidationError } from '@/lib/errors/app-errors'

/**
 * 報價單欄位驗證（純函式、不碰 store）
 *
 * @throws ValidationError 驗證失敗時拋出
 */
export function validateQuote(data: Partial<Quote>): void {
  if (data.name && data.name.trim().length < 2) {
    throw new ValidationError('name', '報價單標題至少需要 2 個字符')
  }

  if (data.categories) {
    const total_cost = data.categories.reduce((sum, cat) => sum + cat.total, 0)
    if (total_cost < 0) {
      throw new ValidationError('categories', '總金額不能為負數')
    }
  }
}

/**
 * 計算報價單總成本
 *
 * @description 加總所有 categories 的 total 欄位。
 * 這是報價單成本的計算公式，所有顯示報價金額的地方都應使用此函數。
 *
 * @param quote - 報價單物件
 * @returns 總成本金額
 */
export function calculateTotalCost(quote: Quote): number {
  return (quote.categories || []).reduce((sum, cat) => sum + cat.total, 0)
}
