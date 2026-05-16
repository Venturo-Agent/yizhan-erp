'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { apiGet } from '@/lib/api/client'

interface AccountingSubject {
  id: string
  code: string
  name: string
  type: string
}

/**
 * 取得會計科目清單（用於下拉選擇）
 *
 * 資料源：chart_of_accounts（透過 /api/finance/accounting-subjects endpoint，
 *        endpoint 內部 query chart_of_accounts、回傳時 mapping account_type → type）
 */
export function useAccountingSubjects(
  filterType?: 'expense' | 'cost' | 'asset' | 'liability' | 'revenue'
) {
  const workspaceId = useAuthStore(s => s.user?.workspace_id)
  const [items, setItems] = useState<AccountingSubject[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    setLoading(true)
    apiGet<AccountingSubject[]>(`/api/finance/accounting-subjects?workspace_id=${workspaceId}`)
      .then(data => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        if (!cancelled) logger.error('[useAccountingSubjects] load failed', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  // 根據 filterType 過濾
  const subjects: AccountingSubject[] = useMemo(() => {
    if (!filterType) return items
    return items.filter(s => s.type === filterType)
  }, [items, filterType])

  // 轉換為 Combobox 選項格式
  const options = useMemo(
    () =>
      subjects.map(s => ({
        value: s.id,
        label: `${s.code} ${s.name}`,
        code: s.code,
        name: s.name,
      })),
    [subjects]
  )

  // 成本類科目（5xxx）
  const costOptions = useMemo(
    () =>
      subjects
        .filter(s => s.code.startsWith('5'))
        .map(s => ({
          value: s.id,
          label: `${s.code} ${s.name}`,
          code: s.code,
          name: s.name,
        })),
    [subjects]
  )

  // 費用類科目（6xxx）
  const expenseOptions = useMemo(
    () =>
      subjects
        .filter(s => s.code.startsWith('6'))
        .map(s => ({
          value: s.id,
          label: `${s.code} ${s.name}`,
          code: s.code,
          name: s.name,
        })),
    [subjects]
  )

  return { subjects, options, costOptions, expenseOptions, loading }
}

/**
 * 根據請款類別自動取得預設會計科目
 */
export function getDefaultSubjectByCategory(
  category: string,
  subjects: AccountingSubject[]
): AccountingSubject | undefined {
  const categoryMap: Record<string, string> = {
    住宿: '5102',
    交通: '5101',
    餐食: '5103',
    門票: '5104',
    導遊: '5106',
    保險: '5105',
    同業: '5106',
    其他: '5106',
    出團款: '1104',
    回團款: '1102',
    員工代墊: '5106',
  }

  const code = categoryMap[category]
  if (code) {
    return subjects.find(s => s.code === code)
  }
  return undefined
}
