import useSWR from 'swr'
import { useAuthStore } from '@/stores/auth-store'

export interface Role {
  id: string
  name: string
  description: string | null
  is_admin: boolean
  sort_order: number
  workspace_id: string
}

const fetcher = async (url: string): Promise<Role[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * 抓 workspace 的 HR roles 列表（含 admin / 業務 / 會計 / OP / 助理 / ...）。
 * Cache key 含 workspaceId、切 workspace 不會 leak 別家資料。
 *
 * Wraps REST endpoint /api/roles（不是直接 supabase query、createEntityHook 不適用）。
 */
export function useRoles() {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const key = workspaceId ? `workspace-roles-${workspaceId}` : null

  const { data, isLoading, mutate } = useSWR<Role[]>(key, () => fetcher('/api/roles'), {
    revalidateOnFocus: false,
  })

  return {
    roles: data ?? [],
    loading: isLoading,
    mutate,
  }
}
