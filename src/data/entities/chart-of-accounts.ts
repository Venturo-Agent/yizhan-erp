'use client'

/**
 * Chart of Accounts Entity（會計科目）
 *
 * 5/19 SWR 水管健檢補建。原本 accounting/accounts EditAccountDialog 散刻
 * supabase.from('chart_of_accounts').delete() 沒 invalidate、會計科目改完不刷新。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type Account = Database['public']['Tables']['chart_of_accounts']['Row']

const chartOfAccountsEntity = createEntityHook<Account>('chart_of_accounts', {
  list: {
    select: '*',
    orderBy: { column: 'account_code', ascending: true },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useChartOfAccounts = chartOfAccountsEntity.useList
export const useChartOfAccount = chartOfAccountsEntity.useDetail
export const createChartOfAccount = chartOfAccountsEntity.create
export const updateChartOfAccount = chartOfAccountsEntity.update
export const deleteChartOfAccount = chartOfAccountsEntity.delete
export const invalidateChartOfAccounts = chartOfAccountsEntity.invalidate
