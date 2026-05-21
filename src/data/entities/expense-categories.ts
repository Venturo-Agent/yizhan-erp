'use client'

/**
 * Expense Categories Entity（請款類別）
 *
 * 2026-05-21 建：補紅線 H 修法配套
 * 對應表：public.expense_categories（含團體 expense/income + 公司 company_expense/company_income）
 * RLS pattern：workspace_scoped + 系統預設 (workspace_id IS NULL 全租戶可讀)
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']

const expenseCategoryEntity = createEntityHook<ExpenseCategory>('expense_categories', {
  list: {
    select: '*',
    orderBy: { column: 'sort_order', ascending: true },
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useExpenseCategories = expenseCategoryEntity.useList
export const useExpenseCategory = expenseCategoryEntity.useDetail
export const invalidateExpenseCategories = expenseCategoryEntity.invalidate
export const createExpenseCategory = expenseCategoryEntity.create
export const updateExpenseCategory = expenseCategoryEntity.update
export const deleteExpenseCategory = expenseCategoryEntity.delete
export type { ExpenseCategory }
