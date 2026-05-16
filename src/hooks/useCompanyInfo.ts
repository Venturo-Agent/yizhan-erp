import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'
import { useAuthStore } from '@/stores/auth-store'

interface CompanyInfo {
  /** 法定全名（如「角落旅行社股份有限公司」） */
  legalName: string
  /** 公司標語 */
  subtitle: string
}

/**
 * 取得目前 workspace 的法定名稱和標語
 * 用 useWorkspaceSettings（SWR 快取），不重複 fetch
 */
export function useCompanyInfo(): CompanyInfo {
  const ws = useWorkspaceSettings()
  const workspaceName = useAuthStore(state => state.user?.workspace_name) || ''

  return {
    legalName: ws.legal_name || workspaceName || '',
    subtitle: ws.subtitle || '',
  }
}
