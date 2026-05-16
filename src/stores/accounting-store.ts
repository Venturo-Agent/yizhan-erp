import { create } from 'zustand'

/**
 * 個人記帳遺留 store、目前為 zero-stub。
 * 對外型別與欄位保留避免 UI 炸、所有 stat 永遠回 0。
 */

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  account_name?: string
  category_id?: string
  category_name?: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  description?: string
  date: string
  to_account_id?: string
  to_account_name?: string
  created_at: string
  updated_at: string
}

interface AccountingStats {
  total_assets: number
  total_income: number
  total_expense: number
  monthly_income: number
  monthly_expense: number
  net_worth: number
  category_breakdown: Array<{
    category_id: string
    category_name: string
    amount: number
    percentage: number
  }>
}

interface AccountingStore {
  transactions: Transaction[]
  transactionsPage: number
  transactionsPageSize: number
  transactionsCount: number
  stats: AccountingStats
  isLoading: boolean
  initialize: () => Promise<void>
  fetchTransactions: (page?: number) => Promise<void>
}

const EMPTY_STATS: AccountingStats = {
  total_assets: 0,
  total_income: 0,
  total_expense: 0,
  monthly_income: 0,
  monthly_expense: 0,
  net_worth: 0,
  category_breakdown: [],
}

export const useAccountingStore = create<AccountingStore>(set => ({
  transactions: [],
  transactionsPage: 1,
  transactionsPageSize: 50,
  transactionsCount: 0,
  stats: EMPTY_STATS,
  isLoading: false,
  initialize: async () => {
    // no-op
  },
  fetchTransactions: async (page?: number) => {
    if (page !== undefined) {
      set({ transactionsPage: page })
    }
  },
}))
