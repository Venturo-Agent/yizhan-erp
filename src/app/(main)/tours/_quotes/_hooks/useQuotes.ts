'use client'

/**
 * Feature-level quotes hook
 *
 * 2026-05-30 重構：
 * - 業務方法（duplicateQuote / getQuotesByTour / getQuotesByStatus）從 quote.service 搬入
 *   原因：這些方法本來透過 useQuoteStore.getState() 同步讀 store，但讀取 SSOT 統一走 entity hook，
 *   所以邏輯責任應落在 React 層、由 hook 取得 quotes 後做運算
 * - duplicateQuote 改為 async：透過 hook 的 quotes 找 original、走 createQuote 寫入
 * - getQuotesByTour / getQuotesByStatus 維持同步：quotes 已在 client state，直接 filter
 * - calculateTotalCost 直接 re-export 純函式（不依賴 hook 狀態）
 */

import {
  useQuotes as useQuotesData,
  createQuote,
  updateQuote as updateQuoteData,
  deleteQuote as deleteQuoteData,
  invalidateQuotes,
} from '@/data'
import { calculateTotalCost as calcTotalCost } from '../_services/quote.service'
import { Quote } from '@/stores/types'

const useQuotesFeature = () => {
  const { items: quotes, loading } = useQuotesData()

  return {
    // ========== 資料 ==========
    quotes,
    loading,

    // ========== CRUD 操作 ==========
    addQuote: async (
      data: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'version' | 'versions'>
    ) => {
      return await createQuote(data as Parameters<typeof createQuote>[0])
    },

    updateQuote: async (id: string, data: Partial<Quote>) => {
      return await updateQuoteData(id, data as Parameters<typeof updateQuoteData>[1])
    },

    deleteQuote: async (id: string) => {
      return await deleteQuoteData(id)
    },

    refreshQuotes: () => {
      void invalidateQuotes()
    },

    // 向後兼容：SWR 自動載入，此方法現在等同於 refreshQuotes
    loadQuotes: () => {
      void invalidateQuotes()
    },

    // ========== 業務方法 ==========

    /**
     * 複製報價單
     *
     * @description 深複製一份報價單，名稱加「(副本)」後綴，
     * 狀態重置為 proposed，不保留 code（讓系統自動生成新編號）和 is_pinned。
     */
    duplicateQuote: async (id: string): Promise<Quote | undefined> => {
      const original = quotes.find(q => q.id === id)
      if (!original) return undefined

      // 排除不應該傳入的欄位
      const {
        id: _id,
        created_at: _created,
        updated_at: _updated,
        code: _code,
        is_pinned: _pinned,
        ...rest
      } = original

      const created = await createQuote({
        ...rest,
        name: `${original.name} (副本)`,
        status: 'proposed',
        is_pinned: false,
      } as Parameters<typeof createQuote>[0])

      return created as Quote | undefined
    },

    getQuotesByTour: (tour_id: string): Quote[] => {
      return quotes.filter(q => q.tour_id === tour_id)
    },

    getQuotesByStatus: (status: Quote['status']): Quote[] => {
      return quotes.filter(q => q.status === status)
    },

    calculateTotalCost: (quote: Quote): number => {
      return calcTotalCost(quote)
    },
  }
}

// 向後兼容：保留原有 export 名稱
export const useQuotes = useQuotesFeature
