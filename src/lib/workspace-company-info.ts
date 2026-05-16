/**
 * 工作空間公司資訊
 *
 * 提供列印模板、報價單等需要的公司基本資訊
 * 從 auth store 讀取 workspace_name，未來可擴展至 workspace settings
 */

import { useAuthStore } from '@/stores/auth-store'

interface CompanyInfo {
  name: string
  fullName: string
  address: string
  tel: string
  fax: string
  email: string
  taxId: string
  licenseNumber: string
  insuranceNumber: string
}

/**
 * 取得當前 workspace 的公司資訊
 * 目前從 auth store 讀 workspace_name
 */
export function getCompanyInfo(): CompanyInfo {
  const user = useAuthStore.getState().user
  const workspaceName = user?.workspace_name || ''

  return {
    name: workspaceName,
    fullName:
      ((user as unknown as Record<string, unknown>)?.workspace_legal_name as string) ||
      workspaceName ||
      '',
    address: '',
    tel: '',
    fax: '',
    email: '',
    taxId: '',
    licenseNumber: '',
    insuranceNumber: '',
  }
}

/**
 * 取得列印頁尾文字
 */
export function getCompanyFooterLine(): string {
  const info = getCompanyInfo()
  if (!info.fullName) return ''

  const parts = [`此文件由${info.fullName}發出`]
  if (info.licenseNumber) parts.push(info.licenseNumber)
  if (info.insuranceNumber) parts.push(info.insuranceNumber)

  return parts.join(' | ')
}
