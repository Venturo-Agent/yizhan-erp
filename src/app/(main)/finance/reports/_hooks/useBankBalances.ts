'use client'

/**
 * useBankBalances — 銀行餘額 dashboard
 *
 * 拉 bank_accounts（active）、對每個有 account_id（連會計科目）的帳戶、
 * 從 journal_lines 聚合 SUM(debit - credit) 當餘額（會計帳餘額、唯一真相）。
 *
 * 限制（待之後 phase）：
 *   1. 多幣別：bank_accounts schema 還沒 currency 欄位、目前一律 TWD
 *      → 之後加 currency 欄位 + 匯率轉換成本位幣顯示
 *   2. 沒啟用 accounting / 帳戶沒綁科目 → 顯示「未綁定科目」、餘額為 null
 */

import { supabase } from '@/lib/supabase/client'
import { createReportHook } from '@/lib/swr/createReportHook'

export interface BankBalanceRow {
  bank_account_id: string
  code: string
  name: string
  bank_name: string | null
  account_number: string | null
  is_default: boolean
  account_id: string | null // FK to chart_of_accounts
  account_code: string | null
  account_name: string | null
  balance: number | null // null = 未綁科目 / 會計未啟用
  currency: string // 暫一律 'TWD'、待外幣 phase
}

interface BankBalancesStats {
  count: number
  total_balance: number // 已綁科目的加總
  unlinked_count: number // 未綁科目的數量
}

const DEFAULT_STATS: BankBalancesStats = { count: 0, total_balance: 0, unlinked_count: 0 }

export const useBankBalances = createReportHook<BankBalanceRow, BankBalancesStats>({
  key: 'bank-balances-report',
  defaultStats: DEFAULT_STATS,
  swrOptions: { dedupingInterval: 60000 }, // 1 分鐘 - 銀行餘額變動較慢
  fetcher: async () => {
    const { data: accounts, error: queryError } = await supabase
      .from('bank_accounts')
      .select('id, code, name, bank_name, account_number, account_id, is_default, is_active')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('code', { ascending: true })
      .limit(200)

    if (queryError) throw new Error(queryError.message)

    const accountIds = Array.from(
      new Set((accounts || []).map(a => a.account_id).filter(Boolean))
    ) as string[]

    const [coaRes, linesRes] = await Promise.all([
      accountIds.length > 0
        ? supabase.from('chart_of_accounts').select('id, code, name').in('id', accountIds)
        : Promise.resolve({ data: [], error: null }),
      accountIds.length > 0
        ? supabase
            .from('journal_lines')
            .select('account_id, debit_amount, credit_amount')
            .in('account_id', accountIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const coaInfo = new Map<string, { code: string; name: string }>()
    for (const c of coaRes.data || []) coaInfo.set(c.id, { code: c.code || '', name: c.name || '' })

    const balanceByAccount = new Map<string, number>()
    for (const line of linesRes.data || []) {
      if (!line.account_id) continue
      const cur = balanceByAccount.get(line.account_id) || 0
      const debit = Number(line.debit_amount) || 0
      const credit = Number(line.credit_amount) || 0
      balanceByAccount.set(line.account_id, cur + debit - credit)
    }

    const rows: BankBalanceRow[] = (accounts || []).map(a => {
      const coa = a.account_id ? coaInfo.get(a.account_id) : null
      return {
        bank_account_id: a.id,
        code: a.code || '',
        name: a.name || '',
        bank_name: a.bank_name,
        account_number: a.account_number,
        is_default: a.is_default || false,
        account_id: a.account_id,
        account_code: coa?.code || null,
        account_name: coa?.name || null,
        balance: a.account_id ? balanceByAccount.get(a.account_id) || 0 : null,
        currency: 'TWD',
      }
    })

    const stats: BankBalancesStats = {
      count: rows.length,
      total_balance: rows.reduce((sum, r) => sum + (r.balance || 0), 0),
      unlinked_count: rows.filter(r => r.balance === null).length,
    }

    return { rows, stats }
  },
})
