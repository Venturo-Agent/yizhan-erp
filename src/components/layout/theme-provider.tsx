'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initTheme = useThemeStore(s => s.initTheme)

  // 載入時從 localStorage 讀取並套用（initTheme 內部已 setAttribute）
  useEffect(() => {
    initTheme()
  }, [initTheme])

  return <>{children}</>
}
