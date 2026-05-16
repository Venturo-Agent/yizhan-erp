import { describe, it, expect, beforeEach } from 'vitest'
import { useAccountingStore } from '@/stores/accounting-store'

/**
 * accounting-store 是 zero-stub（個人記帳遺留模組）。
 * 所有方法都 no-op、stats 永遠回 0。
 * 這份 test 鎖住「遺留 store 不可變動 contract」、
 * 防止未來有人不小心把它接回真實邏輯造成 UI 行為飄移。
 */

describe('AccountingStore (zero-stub legacy)', () => {
  beforeEach(() => {
    // 還原 stub 初始值
    useAccountingStore.setState({
      transactions: [],
      transactionsPage: 1,
      transactionsPageSize: 50,
      transactionsCount: 0,
      stats: {
        total_assets: 0,
        total_income: 0,
        total_expense: 0,
        monthly_income: 0,
        monthly_expense: 0,
        net_worth: 0,
        category_breakdown: [],
      },
      isLoading: false,
    })
  })

  describe('Initial State', () => {
    it('should start with empty transactions', () => {
      expect(useAccountingStore.getState().transactions).toEqual([])
    })

    it('should default transactionsPage to 1', () => {
      expect(useAccountingStore.getState().transactionsPage).toBe(1)
    })

    it('should default transactionsPageSize to 50', () => {
      expect(useAccountingStore.getState().transactionsPageSize).toBe(50)
    })

    it('should default transactionsCount to 0', () => {
      expect(useAccountingStore.getState().transactionsCount).toBe(0)
    })

    it('should default isLoading to false', () => {
      expect(useAccountingStore.getState().isLoading).toBe(false)
    })

    it('should expose all required AccountingStats keys with zero values', () => {
      const { stats } = useAccountingStore.getState()
      expect(stats.total_assets).toBe(0)
      expect(stats.total_income).toBe(0)
      expect(stats.total_expense).toBe(0)
      expect(stats.monthly_income).toBe(0)
      expect(stats.monthly_expense).toBe(0)
      expect(stats.net_worth).toBe(0)
      expect(stats.category_breakdown).toEqual([])
    })
  })

  describe('initialize()', () => {
    it('should be a no-op (resolves without throwing)', async () => {
      await expect(useAccountingStore.getState().initialize()).resolves.toBeUndefined()
    })

    it('should not mutate state', async () => {
      const before = JSON.stringify(useAccountingStore.getState())
      await useAccountingStore.getState().initialize()
      const after = JSON.stringify(useAccountingStore.getState())
      expect(after).toBe(before)
    })

    it('should not populate transactions even after initialize', async () => {
      await useAccountingStore.getState().initialize()
      expect(useAccountingStore.getState().transactions).toEqual([])
      expect(useAccountingStore.getState().transactionsCount).toBe(0)
    })
  })

  describe('fetchTransactions()', () => {
    it('should resolve without throwing when called without page', async () => {
      await expect(useAccountingStore.getState().fetchTransactions()).resolves.toBeUndefined()
    })

    it('should not change transactionsPage when called without page arg', async () => {
      const before = useAccountingStore.getState().transactionsPage
      await useAccountingStore.getState().fetchTransactions()
      expect(useAccountingStore.getState().transactionsPage).toBe(before)
    })

    it('should update transactionsPage when called with page arg', async () => {
      await useAccountingStore.getState().fetchTransactions(3)
      expect(useAccountingStore.getState().transactionsPage).toBe(3)
    })

    it('should accept page = 1 explicitly', async () => {
      useAccountingStore.setState({ transactionsPage: 5 })
      await useAccountingStore.getState().fetchTransactions(1)
      expect(useAccountingStore.getState().transactionsPage).toBe(1)
    })

    it('should accept page = 0 (no validation by design — stub)', async () => {
      await useAccountingStore.getState().fetchTransactions(0)
      // 0 是 falsy 但 !== undefined、應該被 set
      expect(useAccountingStore.getState().transactionsPage).toBe(0)
    })

    it('should not fetch real data (transactions stays empty)', async () => {
      await useAccountingStore.getState().fetchTransactions(2)
      expect(useAccountingStore.getState().transactions).toEqual([])
      expect(useAccountingStore.getState().transactionsCount).toBe(0)
    })

    it('should not flip isLoading (stub does not simulate loading)', async () => {
      await useAccountingStore.getState().fetchTransactions(2)
      expect(useAccountingStore.getState().isLoading).toBe(false)
    })

    it('should not change stats', async () => {
      const before = useAccountingStore.getState().stats
      await useAccountingStore.getState().fetchTransactions(7)
      expect(useAccountingStore.getState().stats).toBe(before)
    })
  })

  describe('Contract: should remain a stub', () => {
    it('should expose the documented public API surface', () => {
      const state = useAccountingStore.getState()
      expect(typeof state.initialize).toBe('function')
      expect(typeof state.fetchTransactions).toBe('function')
      expect(Array.isArray(state.transactions)).toBe(true)
      expect(Array.isArray(state.stats.category_breakdown)).toBe(true)
    })
  })
})
