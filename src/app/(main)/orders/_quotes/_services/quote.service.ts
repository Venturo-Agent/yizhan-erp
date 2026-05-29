/**
 * Quote Service - 報價單核心邏輯
 *
 * @module quote.service
 * @description
 * 報價單的 CRUD 操作、複製和成本計算。
 * 繼承 BaseService 提供基礎 CRUD，額外提供：
 * - 報價單複製（duplicateQuote）
 * - 成本計算（calculateTotalCost）
 */

import { BaseService, StoreOperations } from '@/lib/services/base.service'
import { Quote } from '@/stores/types/quote.types'
import { useQuoteStore } from '@/stores'
import { ValidationError } from '@/lib/errors/app-errors'

class QuoteService extends BaseService<Quote> {
  protected resourceName = 'quotes'

  protected getStore = (): StoreOperations<Quote> => {
    const store = useQuoteStore.getState()
    return {
      getAll: () => store.items,
      getById: (id: string) => store.items.find(q => q.id === id),
      add: async (quote: Quote) => {
        // 移除系統自動生成的欄位
        const { id: _id, created_at: _created_at, updated_at: _updated_at, ...createData } = quote
        const result = await store.create(createData)
        return result
      },
      update: async (id: string, data: Partial<Quote>) => {
        await store.update(id, data)
      },
      delete: async (id: string) => {
        await store.delete(id)
      },
    }
  }

  protected validate(data: Partial<Quote>): void {
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

  // ========== 業務邏輯方法 ==========

  /**
   * 複製報價單
   *
   * @description 深複製一份報價單，名稱加「(副本)」後綴，
   * 狀態重置為 proposed，不保留 code（讓系統自動生成新編號）和 is_pinned。
   *
   * @param id - 原始報價單 ID
   * @returns 複製後的報價單，若原始不存在則返回 undefined
   */
  async duplicateQuote(id: string): Promise<Quote | undefined> {
    const store = useQuoteStore.getState()
    const original = store.items.find(q => q.id === id)
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

    // 複製時不保留 code（讓系統自動生成新編號）和 is_pinned（不自動置頂）
    const duplicated = await store.create({
      ...rest,
      name: `${original.name} (副本)`,
      status: 'proposed',
      is_pinned: false, // 複製的報價單不自動置頂
    })

    // 確保返回完整的資料（包含 id）
    if (duplicated) {
      // 從 store 重新取得完整資料
      const fullDuplicated = store.items.find(q => q.id === duplicated.id)
      return fullDuplicated || duplicated
    }

    return duplicated
  }

  getQuotesByTour(tour_id: string): Quote[] {
    const store = useQuoteStore.getState()
    return store.items.filter(q => q.tour_id === tour_id)
  }

  getQuotesByStatus(status: Quote['status']): Quote[] {
    const store = useQuoteStore.getState()
    return store.items.filter(q => q.status === status)
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
  calculateTotalCost(quote: Quote): number {
    return (quote.categories || []).reduce((sum, cat) => sum + cat.total, 0)
  }
}

export const quoteService = new QuoteService()
