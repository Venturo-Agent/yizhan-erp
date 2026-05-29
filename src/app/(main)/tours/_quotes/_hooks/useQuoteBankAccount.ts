'use client'

/**
 * 報價單收款帳戶解析 hook
 * 設計來源：workspace/架構整理/2026-05-29-報價單收款帳戶遷移-spec.md §2.2
 *
 * 候選 = 啟用中 + is_quote_display + (帳戶 branch_id 為 NULL「全公司共用」或 = 報價單 branch_id)
 * 解析順序：quote.bank_account_id 已設且存在 → 用它；否則候選 is_default 優先、再最早建立。
 * 走紅線 F：經 bank_accounts entity hook 讀取，不散刻 SWR。
 */

import { useMemo } from 'react'
import { useBankAccounts, type BankAccount } from '@/data/entities/bank-accounts'

export interface QuoteBankDisplay {
  id: string
  bank_name: string | null
  bank_branch: string | null
  account_number: string | null
  account_holder_name: string | null
}

function toDisplay(a: BankAccount): QuoteBankDisplay {
  return {
    id: a.id,
    bank_name: a.bank_name ?? null,
    bank_branch: a.bank_branch ?? null,
    account_number: a.account_number ?? null,
    account_holder_name: a.account_holder_name ?? null,
  }
}

export function useQuoteBankAccount(quote: {
  branch_id?: string | null
  bank_account_id?: string | null
}) {
  const { items, loading } = useBankAccounts()

  // 候選清單（依解析規則排序：is_default 優先、再 created_at 最早）
  const candidates = useMemo<QuoteBankDisplay[]>(() => {
    const branchId = quote.branch_id ?? null
    return (items as BankAccount[])
      .filter(a => a.is_active !== false && a.is_quote_display === true)
      .filter(a => a.branch_id == null || a.branch_id === branchId)
      .slice()
      .sort((a, b) => {
        if (!!a.is_default !== !!b.is_default) return a.is_default ? -1 : 1
        return (a.created_at ?? '').localeCompare(b.created_at ?? '')
      })
      .map(toDisplay)
  }, [items, quote.branch_id])

  // 預設解析帳戶 id：quote 已指定且帳戶仍存在 → 用它（即使已取消 is_quote_display，尊重明確選擇）；
  // 否則候選第一筆。
  const defaultId = useMemo<string | null>(() => {
    if (
      quote.bank_account_id &&
      (items as BankAccount[]).some(a => a.id === quote.bank_account_id)
    ) {
      return quote.bank_account_id
    }
    return candidates[0]?.id ?? null
  }, [quote.bank_account_id, candidates, items])

  // 依 id 取顯示資料（涵蓋非候選但被明確選定的帳戶）
  const resolveById = useMemo(() => {
    const map = new Map<string, QuoteBankDisplay>()
    ;(items as BankAccount[]).forEach(a => map.set(a.id, toDisplay(a)))
    return (id: string | null): QuoteBankDisplay | null => (id ? (map.get(id) ?? null) : null)
  }, [items])

  return { candidates, defaultId, resolveById, loading }
}
