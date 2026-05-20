'use client'

/**
 * useRequireAppAuth — /app namespace 內所有「需登入」page 的 auth guard
 *
 * 2026-05-21 加：原本 /app/dashboard / /app/orders 等沒擋未登入、是 P0 資安洞
 * 用法：每個 /app/<page>/page.tsx 頂部呼叫 useRequireAppAuth()
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export function useRequireAppAuth(): void {
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/app')
    }
  }, [isAuthenticated, router])
}
