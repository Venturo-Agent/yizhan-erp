'use client'

import {
  useQuotes as useQuotesData,
  createQuote,
  updateQuote as updateQuoteData,
  deleteQuote as deleteQuoteData,
  invalidateQuotes,
} from '@/data'
import { quoteService } from '../_services/quote.service'
import { Quote } from '@/stores/types'

/**
 * Feature-level quotes hook
 * 包裝 @/data 的 CRUD 操作 + 業務邏輯方法
 */
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
    duplicateQuote: async (id: string) => {
      return await quoteService.duplicateQuote(id)
    },

    getQuotesByTour: (tour_id: string) => {
      return quoteService.getQuotesByTour(tour_id)
    },

    getQuotesByStatus: (status: Quote['status']) => {
      return quoteService.getQuotesByStatus(status)
    },

    calculateTotalCost: (quote: Quote) => {
      return quoteService.calculateTotalCost(quote)
    },
  }
}

// 向後兼容：保留原有 export 名稱
export const useQuotes = useQuotesFeature
