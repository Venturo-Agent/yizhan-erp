import useSWR from 'swr'
import { useAuthStore } from '@/stores/auth-store'

export interface Department {
  id: string
  name: string
  code: string
  display_order: number
  branch_id?: string | null
  /** seed migration 帶的預設「總部」部門。EmployeeForm 用來判斷「使用者沒新增過部門」就隱藏欄位 */
  is_default?: boolean
}

const fetcher = async (url: string): Promise<Department[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/**
 * 抓 workspace 的部門列表。Cache 跨 page 共享、切 workspace 隔離。
 *
 * @param branchId 可選：只列該分公司底下的部門（EmployeeForm 級聯選擇用）
 */
export function useDepartments(branchId?: string | null) {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const key = workspaceId
    ? branchId
      ? `departments-${workspaceId}-${branchId}`
      : `departments-${workspaceId}`
    : null

  const url = branchId
    ? `/api/departments?branch_id=${encodeURIComponent(branchId)}`
    : '/api/departments'

  const { data, isLoading, mutate } = useSWR<Department[]>(key, () => fetcher(url), {
    revalidateOnFocus: false,
  })

  return {
    departments: data ?? [],
    loading: isLoading,
    mutate,
  }
}
