import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { User } from '@/stores/types'

// Mock dependencies
vi.mock('@/stores/user-store', () => ({
  useUserStore: {
    getState: () => ({
      items: [],
    }),
  },
}))

vi.mock('@/lib/auth', () => ({
  generateToken: vi.fn(payload => 'mock-token'),
}))

vi.mock('@/lib/auth/local-auth-manager', () => ({
  useLocalAuthStore: {
    getState: () => ({
      profiles: [],
    }),
  },
}))

vi.mock('@/services/offline-auth.service', () => ({
  OfflineAuthService: {
    validateLogin: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('AuthStore', () => {
  beforeEach(async () => {
    // Reset store state before each test
    const store = useAuthStore.getState()
    await store.logout()
    // Ensure user is cleared
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.sidebarCollapsed).toBe(true)
    })
  })

  describe('Login', () => {
    it('should set user and authenticated state', () => {
      const mockUser: User = {
        id: '1',
        employee_number: 'EMP001',
        display_name: 'Test User',
        chinese_name: 'Test User',
        english_name: 'Test User',
        personal_info: {},
        job_info: {},
        salary_info: {},
        permissions: ['view_orders', 'edit_orders'],
        roles: ['employee'],
        attendance: { leave_records: [], overtime_records: [] },
        contracts: [],
        status: 'active',
        workspace_id: 'workspace-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const store = useAuthStore.getState()
      store.setUser(mockUser)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('Logout', () => {
    it('should clear user data and set unauthenticated', async () => {
      const mockUser: User = {
        id: '1',
        employee_number: 'EMP001',
        display_name: 'Test User',
        chinese_name: 'Test User',
        english_name: 'Test User',
        personal_info: {},
        job_info: {},
        salary_info: {},
        permissions: ['view_orders'],
        roles: ['employee'],
        attendance: { leave_records: [], overtime_records: [] },
        contracts: [],
        status: 'active',
        workspace_id: 'workspace-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const store = useAuthStore.getState()
      store.setUser(mockUser)
      await store.logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  // TODO: checkPermission API 已從 auth-store 移除（改走 useCapabilities / capabilities cap-list）
  // 整 block 過時、需要重寫對應新 capability system。
  describe.skip('Permissions', () => {
    it('should check user permissions correctly', () => {
      const mockUser: User = {
        id: '1',
        employee_number: 'EMP001',
        display_name: 'Test User',
        chinese_name: 'Test User',
        english_name: 'Test User',
        personal_info: {},
        job_info: {},
        salary_info: {},
        permissions: ['view_orders', 'edit_orders', 'delete_orders'],
        roles: ['employee'],
        attendance: { leave_records: [], overtime_records: [] },
        contracts: [],
        status: 'active',
        workspace_id: 'workspace-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const store = useAuthStore.getState()
      store.setUser(mockUser)

      expect(store.checkPermission('view_orders')).toBe(true)
      expect(store.checkPermission('edit_orders')).toBe(true)
      expect(store.checkPermission('non_existent_permission')).toBe(false)
    })

    it('should return false when user is not logged in', () => {
      const store = useAuthStore.getState()
      expect(store.checkPermission('view_orders')).toBe(false)
    })
  })

  describe('Sidebar', () => {
    it('should toggle sidebar collapsed state', () => {
      const store = useAuthStore.getState()
      const initialState = store.sidebarCollapsed

      store.toggleSidebar()
      expect(useAuthStore.getState().sidebarCollapsed).toBe(!initialState)

      store.toggleSidebar()
      expect(useAuthStore.getState().sidebarCollapsed).toBe(initialState)
    })

    it('should set sidebar collapsed state directly', () => {
      const store = useAuthStore.getState()

      store.setSidebarCollapsed(false)
      expect(useAuthStore.getState().sidebarCollapsed).toBe(false)

      store.setSidebarCollapsed(true)
      expect(useAuthStore.getState().sidebarCollapsed).toBe(true)
    })
  })
})
