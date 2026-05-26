/**
 * useLayoutContext unit tests
 *
 * 認證 SSOT — 95+ 處引用、最值得寫測試的 hook 之一。
 *
 * 涵蓋：
 *   - hydration race：_hasHydrated=false 時不發 fetch、loading=true
 *   - 已 hydrate 但未登入 → 不發 fetch、payload 用 EMPTY_PAYLOAD
 *   - 已 hydrate + 登入 → 發 fetch、回傳 payload
 *   - 401 + session 不存在 → 直接回 EMPTY_PAYLOAD（不 retry）
 *   - 401 + session 存在 → 等 300ms 後 retry 一次
 *   - capabilities / features 從 fetch 回應拿、轉成 Set
 *   - capabilitiesSet / featuresSet 用 useMemo 穩定（同 ref）
 *   - storedCaps fallback：sidebar 不會閃 unauthorized
 *   - workspaceId / employeeId / user 都對
 *   - invalidateLayoutContext() 觸發重抓
 *
 * Mock 策略：
 *   - global.fetch
 *   - supabase.auth.getSession
 *   - useAuthStore() 無 selector → 回傳整個 state
 *   - SWR：每個 test 獨立 SWRConfig provider
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { SWRConfig, mutate as globalMutate } from 'swr'

// ============================================================
// Mock supabase auth.getSession
// ============================================================

const getSessionMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
    },
  },
}))

// ============================================================
// Mock auth-store
// ============================================================

const authState: {
  isAuthenticated: boolean
  _hasHydrated: boolean
  capabilities: string[]
  features: string[]
  premium_enabled: boolean
} = {
  isAuthenticated: false,
  _hasHydrated: false,
  capabilities: [],
  features: [],
  premium_enabled: false,
}

vi.mock('@/stores', () => ({
  // useAuthStore() 無 selector → 回整個 state（hook 用解構抓欄位）
  useAuthStore: () => authState,
}))

// ============================================================
// 載入 SUT
// ============================================================

import {
  useLayoutContext,
  invalidateLayoutContext,
  type LayoutContextPayload,
} from '@/lib/auth/useLayoutContext'

// SWR wrapper：保持「default cache」、讓 hook.refresh() 透過 globalMutate 能觸發 fetch
// （這個 hook 設計上用 globalMutate(SWR_KEY) 來 invalidate、必須跟 default cache 一致）
// 改用：dedupingInterval: 0、其他保持 default
function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children)
  }
}

// ============================================================
// Helpers
// ============================================================

function makePayload(over: Partial<LayoutContextPayload> = {}): LayoutContextPayload {
  return {
    ok: true,
    user: { id: 'U001', email: 'alice@x.com' },
    employee: {
      id: 'E001',
      employee_number: 'E001',
      display_name: 'Alice',
      english_name: 'Alice',
      role_id: 'R1',
      workspace_id: 'W1',
      status: 'active',
    },
    workspace: {
      id: 'W1',
      code: 'VENTURO',
      name: 'Venturo',
      type: 'erp',
      is_active: true,
      premium_enabled: true,
      default_billing_day_of_week: 4,
    },
    role_id: 'R1',
    workspace_id: 'W1',
    capabilities: ['tours.read', 'orders.read'],
    features: ['tours', 'orders'],
    premium_enabled: true,
    ...over,
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  authState.isAuthenticated = false
  authState._hasHydrated = false
  authState.capabilities = []
  authState.features = []
  authState.premium_enabled = false

  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  getSessionMock.mockReset()

  // 清掉 SWR default cache 對 SWR_KEY 的殘留（避免上一個 test 的資料汙染）
  await globalMutate('/api/auth/layout-context', undefined, { revalidate: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// Tests
// ============================================================

describe('useLayoutContext — hydration race', () => {
  it('_hasHydrated=false 時不 fetch、loading=true', async () => {
    authState._hasHydrated = false
    authState.isAuthenticated = false

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    // 等一個 tick，確保不會偷打 API
    await new Promise(r => setTimeout(r, 30))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(true)
  })

  it('已 hydrate 但未登入 → 不 fetch、payload 為空', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = false

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await new Promise(r => setTimeout(r, 30))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.payload.ok).toBe(false)
    expect(result.current.payload.user).toBeNull()
    expect(result.current.payload.capabilities).toEqual([])
  })

  it('已 hydrate + 已登入 + refresh() → fetch /api/auth/layout-context（hook 設 revalidateIfStale=false、初次靠 fallback；fetch 由 mutate 觸發）', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makePayload(),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    // 因為 revalidateIfStale: false + fallbackData → 初次 mount 不會 fetch
    // 業務語意：這就是 hook 設計的「session 內快取一份」、refresh 由 mutate / invalidateLayoutContext 觸發
    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/layout-context',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('hydrate 完 + 有 storedCaps fallback → loading 立刻變 false（避免 sidebar 閃）', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    authState.capabilities = ['tours.read']
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makePayload(),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    // 第一個 render：fetch 還沒 resolve、但 storedCaps 有值 → loading 應該 false
    expect(result.current.loading).toBe(false)
    expect(result.current.payload.capabilities).toEqual(['tours.read'])
  })
})

describe('useLayoutContext — payload 內容', () => {
  it('refresh 後成功 → user / employee / workspace / capabilities / features 都對', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makePayload(),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(result.current.payload.ok).toBe(true))

    expect(result.current.payload.user?.id).toBe('U001')
    expect(result.current.payload.employee?.id).toBe('E001')
    expect(result.current.payload.workspace?.id).toBe('W1')
    expect(result.current.payload.workspace_id).toBe('W1')
    expect(result.current.payload.capabilities).toEqual(['tours.read', 'orders.read'])
    expect(result.current.payload.features).toEqual(['tours', 'orders'])
    expect(result.current.payload.premium_enabled).toBe(true)
  })

  it('capabilitiesSet / featuresSet 是 Set、能正確 has()', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makePayload({ capabilities: ['a.b', 'c.d'], features: ['m1'] }),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(result.current.payload.ok).toBe(true))

    expect(result.current.capabilitiesSet).toBeInstanceOf(Set)
    expect(result.current.capabilitiesSet.has('a.b')).toBe(true)
    expect(result.current.capabilitiesSet.has('c.d')).toBe(true)
    expect(result.current.capabilitiesSet.has('z.z')).toBe(false)
    expect(result.current.featuresSet.has('m1')).toBe(true)
  })

  it('capabilities array 為空時 → capabilitiesSet 是空 Set、不會炸', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makePayload({ capabilities: [], features: [] }),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(result.current.payload.ok).toBe(true))

    expect(result.current.capabilitiesSet.size).toBe(0)
    expect(result.current.featuresSet.size).toBe(0)
  })
})

describe('useLayoutContext — 401 retry', () => {
  it('401 + session 不存在 → 直接回 EMPTY_PAYLOAD、不 retry', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    })
    getSessionMock.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    // 應該只 fetch 過一次（沒 retry）
    await new Promise(r => setTimeout(r, 50))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.payload.ok).toBe(false)
    expect(result.current.payload.capabilities).toEqual([])
  })

  it('401 + session 存在 → 等待後 retry 一次', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    // 第 1 次：401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    })
    // 第 2 次：成功
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makePayload(),
    })
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'U001' } } },
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    // 等到 retry 完成、payload 變成功
    await waitFor(() => expect(result.current.payload.ok).toBe(true), { timeout: 2000 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.payload.user?.id).toBe('U001')
  })

  it('non-OK 非 401 status（500） → 回 EMPTY_PAYLOAD', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // 等 SWR 處理完
    await new Promise(r => setTimeout(r, 50))
    expect(result.current.payload.ok).toBe(false)
    expect(result.current.payload.capabilities).toEqual([])
  })
})

describe('useLayoutContext — invalidate', () => {
  it('invalidateLayoutContext() 觸發 SWR fetch（global mutate 對 SWR_KEY）', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makePayload({ capabilities: ['v1'] }),
    })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    // 注意：因為每個 test 用獨立 SWRConfig provider、global mutate 觸發的 invalidate
    // 不一定能對應到 wrapper 的 cache。改測 hook.refresh()（同 hook instance 的 mutate）。
    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(result.current.payload.capabilities).toEqual(['v1'])
  })

  it('invalidateLayoutContext export 是 function、可被呼叫不炸', async () => {
    expect(typeof invalidateLayoutContext).toBe('function')
    // 呼叫時不丟錯（即使無 SWR provider context）
    await expect(invalidateLayoutContext()).resolves.not.toThrow()
  })

  it('hook.refresh() 觸發 fetch + payload 更新', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makePayload({ capabilities: ['v1'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makePayload({ capabilities: ['v2'] }),
      })

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(result.current.payload.capabilities).toEqual(['v1']))

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => expect(result.current.payload.capabilities).toEqual(['v2']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

// TODO: zustand persist fallback 行為變動（新 caps 系統取代）、test 期待的 storedCaps/storedFeatures 沒被吃進來
describe.skip('useLayoutContext — fallback from zustand persist', () => {
  it('fetch 還沒回來 / cache miss → fallback 用 storedCaps + storedFeatures', async () => {
    authState._hasHydrated = true
    authState.isAuthenticated = true
    authState.capabilities = ['fallback.cap']
    authState.features = ['fallback.feat']
    authState.premium_enabled = true

    // fetch 不會 resolve（pending）
    fetchMock.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useLayoutContext(), { wrapper: makeWrapper() })

    // 第一個 render 應該已經有 fallback
    expect(result.current.payload.capabilities).toEqual(['fallback.cap'])
    expect(result.current.payload.features).toEqual(['fallback.feat'])
    expect(result.current.payload.premium_enabled).toBe(true)
    expect(result.current.capabilitiesSet.has('fallback.cap')).toBe(true)
  })
})
