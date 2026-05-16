'use client'

import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Library 模組權限守衛
 * 覆蓋 /library 子路由
 * 進門條件：擁有 database 任一 tab 的 read capability
 *
 * 註：capability module code 仍為 `database`（DB schema SSOT、不隨路由 rename）
 */
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  const { canReadAnyInModule, loading } = useMyCapabilities()
  if (loading) return null  // ModuleGuard 已在外層顯示 loading、避免 cascade
  if (!canReadAnyInModule('database')) return <UnauthorizedPage />
  return <>{children}</>
}
