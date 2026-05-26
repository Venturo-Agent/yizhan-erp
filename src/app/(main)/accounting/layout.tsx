'use client'

import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Accounting 模組權限守衛
 * 覆蓋 /accounting 所有子路由（page / accounts / checks / period-closing / reports / vouchers）
 * 進門條件：擁有 accounting 任一 tab 的 read capability
 */
export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const { canReadAnyInModule, loading } = useMyCapabilities()
  if (loading) return null // ModuleGuard 已在外層顯示 loading、避免 cascade
  if (!canReadAnyInModule('accounting')) return <UnauthorizedPage />
  return <>{children}</>
}
