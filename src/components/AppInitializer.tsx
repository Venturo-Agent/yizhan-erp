'use client'
/**
 * 應用初始化腳本
 * 在應用啟動時自動初始化並確保 Auth 同步
 */

import { logger } from '@/lib/utils/logger'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { initAuthSync } from '@/lib/auth/auth-sync'
import { DEMO_MODE, demoCapabilities, demoFeatures } from '@/lib/demo/demo'

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
        } else if (DEMO_MODE) {
          useAuthStore.getState().setAuthContext({
            capabilities: demoCapabilities,
            features: demoFeatures,
            premium_enabled: true,
          })
          useAuthStore.getState().setUser({
            id: 'demo-employee',
            employee_number: 'DEMO',
            english_name: 'Demo User',
            display_name: 'Demo 使用者',
            chinese_name: 'Demo 使用者',
            personal_info: {
              national_id: 'A000000000',
              birth_date: '1990-01-01',
              phone: '0900-000-000',
              email: 'demo@local',
              address: 'Demo Address',
              emergency_contact: {
                name: 'Demo Contact',
                relationship: 'N/A',
                phone: '0900-000-001',
              },
            },
            job_info: { hire_date: '2020-01-01' },
            salary_info: { base_salary: 50000, allowances: [], salary_history: [] },
            role_id: 'demo-role',
            roles: [],
            attendance: { leave_records: [], overtime_records: [] },
            contracts: [],
            status: 'active',
            workspace_id: 'demo-workspace',
            branch_id: null,
            workspace_code: 'DEMO',
            workspace_name: 'Demo Workspace',
            avatar: undefined,
            must_change_password: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      } catch (error) {
        logger.error('❌ AppInitializer error:', error)
      }
    }

    init()
  }, [])

  return <>{children}</>
}
