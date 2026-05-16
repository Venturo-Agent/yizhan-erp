import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { mutate as globalMutate } from 'swr'
import { EmployeeFull } from './types'
import { logger } from '@/lib/utils/logger'
import type { UserRole } from '@/lib/rbac-config'
import type { Database } from '@/lib/supabase/types'
import { ensureAuthSync, resetAuthSyncState } from '@/lib/auth/auth-sync'

const LAYOUT_CONTEXT_SWR_KEY = '/api/auth/layout-context'

type EmployeeRow = Database['public']['Tables']['employees']['Row']

interface WorkspaceInfo {
  code?: string
  name?: string
}

/**
 * 從 EmployeeRow + workspace 資訊 構建全站用 EmployeeFull
 * 權限由 useMyCapabilities() 直接 query role_capabilities、不存在 user 上
 */
function buildUserFromEmployee(
  employeeData: EmployeeRow,
  workspaceInfo: WorkspaceInfo,
  options?: { mustChangePassword?: boolean }
): EmployeeFull {
  const userRoles = ((employeeData as Record<string, unknown>).roles || []) as UserRole[]

  return {
    id: employeeData.id,
    employee_number: employeeData.employee_number,
    english_name: employeeData.english_name ?? '',
    display_name: employeeData.display_name ?? '',
    chinese_name: employeeData.chinese_name ?? employeeData.display_name ?? '',
    personal_info: (employeeData.personal_info ?? {}) as unknown as EmployeeFull['personal_info'],
    job_info: (employeeData.job_info ?? {}) as unknown as EmployeeFull['job_info'],
    salary_info: (employeeData.salary_info ?? {}) as unknown as EmployeeFull['salary_info'],
    role_id: (employeeData as Record<string, unknown>).role_id as string | null | undefined,
    roles: userRoles as EmployeeFull['roles'],
    attendance: (employeeData.attendance ?? {
      leave_records: [],
      overtime_records: [],
    }) as unknown as EmployeeFull['attendance'],
    contracts: (employeeData.contracts ?? []) as unknown as EmployeeFull['contracts'],
    status: employeeData.status as EmployeeFull['status'],
    workspace_id: employeeData.workspace_id ?? undefined,
    workspace_code: workspaceInfo.code,
    workspace_name: workspaceInfo.name,
    avatar: employeeData.avatar_url ?? undefined,
    must_change_password: options?.mustChangePassword,
    created_at: employeeData.created_at ?? new Date().toISOString(),
    updated_at: employeeData.updated_at ?? new Date().toISOString(),
  }
}

interface AuthState {
  user: EmployeeFull | null
  isAuthenticated: boolean
  sidebarCollapsed: boolean
  _hasHydrated: boolean
  // Persist 進 localStorage、解 hydration race（_hasHydrated 同時 capabilities 已就位）
  // sidebar 不用等第二次 API 也能秒出完整選單
  capabilities: string[]
  features: string[]
  // 加 premium_enabled、跟著 capabilities 一起 persist、解 sidebar 看不到 premium feature
  premium_enabled: boolean

  // Methods
  setUser: (user: EmployeeFull | null) => void
  setAuthContext: (ctx: { capabilities: string[]; features: string[]; premium_enabled: boolean }) => void
  logout: () => void
  validateLogin: (
    email: string,
    password: string,
    code?: string
  ) => Promise<{ success: boolean; message?: string; needsSetup?: boolean; mustChangePassword?: boolean }>
  refreshUserData: () => Promise<void>
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      sidebarCollapsed: true,
      _hasHydrated: false,
      capabilities: [],
      features: [],
      premium_enabled: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user })
      },

      setAuthContext: ({ capabilities, features, premium_enabled }) => {
        set({ capabilities, features, premium_enabled })
      },

      logout: async () => {
        try {
          const { supabase } = await import('@/lib/supabase/client')
          await supabase.auth.signOut()
          logger.log('✅ Supabase Auth session logged out')
        } catch (error) {
          logger.warn('⚠️ Supabase Auth logout failed:', error)
        }

        // 呼叫 server API 清除 httpOnly cookie
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
          logger.log('✅ Server-side auth cookie cleared')
        } catch (error) {
          logger.warn('⚠️ Server logout failed:', error)
        }

        // 重置 Auth 同步狀態
        resetAuthSyncState()

        set({
          user: null,
          isAuthenticated: false,
          capabilities: [],
          features: [],
          premium_enabled: false,
        })
      },

      validateLogin: async (email, password, code) => {
        try {
          if (!code) {
            return { success: false, message: '請輸入辦公室或廠商代號' }
          }

          logger.log(`🔐 登入中: ${email}@${code}`)

          const { supabase } = await import('@/lib/supabase/client')

          // 1. 呼叫 validate-login 驗證密碼、取回 employee + workspace + permissions + auth email
          const validateResponse = await fetch('/api/auth/validate-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, code }),
          })
          const validateResult = await validateResponse.json()

          if (!validateResult.success) {
            const errMsg = validateResult.error || validateResult.message
            logger.warn(`⚠️ 登入驗證失敗: ${errMsg}`)
            return { success: false, message: errMsg || 'Email 或密碼錯誤' }
          }

          const {
            employee,
            workspace,
            authEmail,
            mustChangePassword,
            capabilities,
            features,
            premium_enabled,
          } = validateResult.data as {
            employee: EmployeeRow
            workspace: {
              id: string
              code: string
              name: string | null
              type: string | null
              premium_enabled?: boolean
            }
            authEmail: string
            mustChangePassword: boolean
            capabilities: string[]
            features: string[]
            premium_enabled: boolean
          }

          // 2. 用 auth email 在 client 建立 Supabase session
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          })

          if (authError || !authData) {
            logger.warn(`⚠️ Supabase Auth 登入失敗: ${authError?.message}`)
            return { success: false, message: '帳號或密碼錯誤' }
          }

          // 3. 寫 capabilities/features/premium_enabled 進 zustand（自動 persist localStorage、跨 refresh 保留）
          // 解 hydration race：sidebar 第一個 render 就能透過 useLayoutContext 從 zustand 拿 fallback
          set({
            capabilities: capabilities ?? [],
            features: features ?? [],
            premium_enabled: premium_enabled ?? false,
          })

          // 同時預寫 SWR cache、讓 useLayoutContext 不用再打 /api/auth/layout-context
          await globalMutate(
            LAYOUT_CONTEXT_SWR_KEY,
            {
              ok: true,
              user: { id: employee.user_id ?? '', email: authEmail },
              employee: {
                id: employee.id,
                employee_number: employee.employee_number,
                display_name: employee.display_name,
                english_name: employee.english_name,
                role_id: employee.role_id ?? null,
                workspace_id: employee.workspace_id ?? null,
                status: employee.status,
              },
              workspace: {
                id: workspace.id,
                code: workspace.code,
                name: workspace.name ?? '',
                is_active: true,
                premium_enabled: premium_enabled ?? false,
                default_billing_day_of_week: null,
              },
              role_id: employee.role_id ?? null,
              workspace_id: employee.workspace_id ?? null,
              capabilities: capabilities ?? [],
              features: features ?? [],
              premium_enabled: premium_enabled ?? false,
            },
            false,
          )

          // 4. 確保 Auth 同步（處理 RLS 所需的 user_id）
          await ensureAuthSync({
            employeeId: employee.id,
            workspaceId: employee.workspace_id ?? undefined,
          })

          // 4. 構建 EmployeeFull
          const user = buildUserFromEmployee(
            employee,
            {
              code: workspace.code,
              name: workspace.name ?? undefined,
            }
          )

          get().setUser(user)
          logger.log(`✅ 登入成功: ${employee.display_name}`)
          return { success: true, mustChangePassword: mustChangePassword === true }
        } catch (error) {
          logger.error('💥 Login validation error:', error)
          return { success: false, message: '系統錯誤，請稍後再試' }
        }
      },

      refreshUserData: async () => {
        const currentUser = get().user
        if (!currentUser?.id) return

        try {
          const { supabase } = await import('@/lib/supabase/client')

          // 使用 maybeSingle() 而不是 single()，避免 RLS 返回 0 筆時拋錯
          // 這可能發生在 user_id 還沒同步時
          const { data, error } = await supabase
            .from('employees')
            .select(
              'id, employee_number, display_name, english_name, email, avatar_url, status, workspace_id, job_info, created_at, updated_at'
            )
            .eq('id', currentUser.id)
            .maybeSingle()

          if (error || !data) {
            // RLS 查詢失敗或無資料，靜默使用 localStorage 快取
            return
          }

          const employeeData = data as EmployeeRow

          // 如果帳號已停用，自動登出
          if (employeeData.status === 'terminated') {
            get().logout()
            return
          }

          // 保留現有 workspace 資訊（workspace 本身極少變、登入時已寫入）
          const updatedUser = buildUserFromEmployee(
            employeeData,
            {
              code: currentUser.workspace_code,
              name: currentUser.workspace_name,
            }
          )
          get().setUser(updatedUser)
        } catch (error) {
          logger.error('💥 Error refreshing user data:', error)
        }
      },

      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      setHasHydrated: hasHydrated => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: 'auth-storage',
      skipHydration: true,
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sidebarCollapsed: state.sidebarCollapsed,
        capabilities: state.capabilities,
        features: state.features,
        premium_enabled: state.premium_enabled,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state._hasHydrated = true
          // Session 恢復時，確保 Auth 同步
          if (state.isAuthenticated && state.user) {
            ensureAuthSync().catch(err => {
              logger.warn('⚠️ Auth sync on rehydrate failed:', err)
            })
          }
        }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  // Zustand persist 的 rehydrate 方法類型定義缺失，使用 type assertion
  type StoreWithPersist = typeof useAuthStore & {
    persist: { rehydrate: () => void }
  }
  ;(useAuthStore as StoreWithPersist).persist.rehydrate()
}
