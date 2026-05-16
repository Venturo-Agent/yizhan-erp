'use client'

/**
 * 模組權限守衛
 * 兩道 gate：
 *   1. workspace_features — workspace 等級「有沒有買這個功能」
 *   2. role_capabilities（HR）— 個人職務「能不能看這個模組」
 *
 * 鐵律：系統內沒有 user 特權、所有路由統一走這兩道 gate、沒有第二條路。
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useWorkspaceFeatures, getModuleFromRoute } from '@/lib/permissions'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { ModuleLoading } from '@/components/module-loading'

interface ModuleGuardProps {
  children: React.ReactNode
}

const PUBLIC_ROUTES = ['/login', '/no-access', '/public']

// 永遠放行：根目錄、首頁、個人設定（不受職務權限管控）
const ALWAYS_ALLOWED_EXACT = new Set(['/', '/dashboard', '/settings', '/settings/personal'])

const ALWAYS_ALLOWED_PREFIXES = ['/dashboard/']

export function ModuleGuard({ children }: ModuleGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { canReadAnyInModule, loading: capLoading } = useMyCapabilities()
  const { isRouteAvailable, loading: featuresLoading, features } = useWorkspaceFeatures()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (featuresLoading || capLoading) return

    // 公開路由
    if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
      setChecked(true)
      return
    }

    // 永遠放行
    if (
      ALWAYS_ALLOWED_EXACT.has(pathname) ||
      ALWAYS_ALLOWED_PREFIXES.some(r => pathname.startsWith(r))
    ) {
      setChecked(true)
      return
    }

    // workspace_features：workspace 沒買功能就擋（features.length === 0 為向下相容、預設全開）
    if (features.length > 0 && !isRouteAvailable(pathname)) {
      router.replace('/no-access')
      return
    }

    // HR 職務權限：模組層 canReadAny（HR 沒給該模組任一 tab 權限就擋）
    // 細粒度 tab gate 由 page.tsx 自己用 canRead(module, tab) 守
    const moduleCode = getModuleFromRoute(pathname)
    if (moduleCode && !canReadAnyInModule(moduleCode)) {
      router.replace('/no-access')
      return
    }

    setChecked(true)
  }, [
    pathname,
    featuresLoading,
    capLoading,
    isRouteAvailable,
    router,
    features.length,
    canReadAnyInModule,
  ])

  // 公開路由 & 永遠放行：不等待 capabilities、直接渲染（Sidebar 也不被卡）
  const isAlwaysAllowed =
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    ALWAYS_ALLOWED_EXACT.has(pathname) ||
    ALWAYS_ALLOWED_PREFIXES.some(r => pathname.startsWith(r))

  if (isAlwaysAllowed) {
    return <>{children}</>
  }

  if (featuresLoading || capLoading || !checked) {
    return <ModuleLoading />
  }

  return <>{children}</>
}
