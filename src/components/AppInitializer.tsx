'use client'
/**
 * 應用初始化腳本
 * 在應用啟動時自動初始化並確保 Auth 同步
 */

import { logger } from '@/lib/utils/logger'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { initAuthSync } from '@/lib/auth/auth-sync'

export function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      try {
        // 初始化 Auth 同步系統（設定登出監聽器）
        initAuthSync()

        // 等待 auth-store hydration 完成
        const authStore = useAuthStore.getState()

        if (!authStore._hasHydrated) {
          await new Promise<void>(resolve => {
            const unsubscribe = useAuthStore.subscribe(state => {
              if (state._hasHydrated) {
                unsubscribe()
                resolve()
              }
            })

            // 安全超時（5 秒）
            setTimeout(() => {
              unsubscribe()
              resolve()
            }, 5000)
          })
        }

        // 如果使用者已登入，從 Supabase 刷新最新資料（權限、角色等）
        const currentUser = useAuthStore.getState().user
        if (currentUser?.id) {
          await useAuthStore.getState().refreshUserData()
        }
      } catch (error) {
        logger.error('❌ AppInitializer error:', error)
      }
    }

    init()
  }, [])

  return <>{children}</>
}
