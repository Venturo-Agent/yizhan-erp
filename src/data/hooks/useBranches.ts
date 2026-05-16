import useSWR from 'swr'
import { useAuthStore } from '@/stores/auth-store'

export interface Branch {
  id: string
  name: string
  code: string
  display_order: number
}

const fetcher = async (url: string): Promise<Branch[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/**
 * 抓 workspace 的分公司列表。Cache 跨 page 共享、切 workspace 隔離。
 */
export function useBranches() {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const key = workspaceId ? `branches-${workspaceId}` : null

  const { data, isLoading, mutate } = useSWR<Branch[]>(key, () => fetcher('/api/branches'), {
    revalidateOnFocus: false,
  })

  return {
    branches: data ?? [],
    loading: isLoading,
    mutate,
  }
}
