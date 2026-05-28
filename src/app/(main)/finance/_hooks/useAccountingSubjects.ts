'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { useAuthStore } from '@/stores/auth-store'
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

  // 會計科目是「字典型」資料（很少變、只有改科目表才動）→ 長快取、不每次開「新增請款」都重撈整本。
  // 30 分鐘內多次掛載共用快取（效能 #2：省 Supabase egress）。走 API endpoint（內部 mapping account_type）、非 entity table。
  // eslint-disable-next-line venturo/no-direct-useswr-in-pages -- 走 API endpoint、entity hook 不適用；字典型長快取、比照其他自訂查詢 hook
  const { data, isLoading: loading } = useSWR(
    workspaceId ? `accounting-subjects:${workspaceId}` : null,
    () =>
      apiGet<AccountingSubject[]>(`/api/finance/accounting-subjects?workspace_id=${workspaceId}`),
    { revalidateOnFocus: false, dedupingInterval: 30 * 60 * 1000 }
  )
  const items = useMemo<AccountingSubject[]>(() => (Array.isArray(data) ? data : []), [data])

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
