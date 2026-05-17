'use client'

import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Finance 模組權限守衛
 * 覆蓋 /finance 所有子路由（payments / requests / treasury / reports / settings）
 * 進門條件：擁有 finance 任一 tab 的 read capability
 */
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { canReadAnyInModule, loading } = useMyCapabilities()
  if (loading) return null
  if (!canReadAnyInModule('finance')) return <UnauthorizedPage />
  return <>{children}</>
}
