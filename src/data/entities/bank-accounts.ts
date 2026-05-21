'use client'

/**
 * Bank Accounts Entity（銀行帳戶）
 *
 * 2026-05-21 建：補紅線 H 修法配套
 * 對應表：public.bank_accounts
 * RLS pattern：workspace_scoped (INSERT/UPDATE/DELETE 守 workspace_id = current)
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type BankAccount = Database['public']['Tables']['bank_accounts']['Row']

const bankAccountEntity = createEntityHook<BankAccount>('bank_accounts', {
  list: {
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useBankAccounts = bankAccountEntity.useList
export const useBankAccount = bankAccountEntity.useDetail
export const invalidateBankAccounts = bankAccountEntity.invalidate
export const createBankAccount = bankAccountEntity.create
export const updateBankAccount = bankAccountEntity.update
export const deleteBankAccount = bankAccountEntity.delete
export type { BankAccount }
