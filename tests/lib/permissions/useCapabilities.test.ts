/**
 * useCapabilities + useMyCapabilities unit tests
 *
 * 權限 hook wrapper、所有頁面 / 元件做 capability 判斷的入口。
 * 對應 CLAUDE.md「路由連結」第 1 大方向 → HR 顆粒度層
 *
 * 涵蓋：
 *   - has() / can() 對單一 capability code
 *   - hasAny / hasAll 多 capability 邏輯
 *   - canRead / canWrite 模組級 + tab 級 helper
 *   - canReadAnyInModule：模組層任一 read 資格（sidebar guard 用）
 *   - canWriteAnyInModule：模組層任一 write 資格
 *   - hasCapabilitySync：non-React 同步 cache 介面
 *   - loading 從 useLayoutContext 透傳
 *
 * Mock 策略：
 *   - mock useLayoutContext 直接回 fake { capabilitiesSet, loading }
 *     （不重新測 SWR / fetch；那些已在 useLayoutContext.test.ts 覆蓋）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ============================================================
// Mock useLayoutContext（capabilitiesSet 是這個 hook 唯一資料來源）
// ============================================================

const layoutContextState: {
  capabilitiesSet: Set<string>
  featuresSet: Set<string>
  loading: boolean
} = {
  capabilitiesSet: new Set(),
  featuresSet: new Set(),
  loading: false,
}

vi.mock('@/lib/auth/useLayoutContext', () => ({
  useLayoutContext: () => ({
    capabilitiesSet: layoutContextState.capabilitiesSet,
    featuresSet: layoutContextState.featuresSet,
    loading: layoutContextState.loading,
    payload: {
      ok: true,
      user: null,
      employee: null,
      workspace: null,
      role_id: null,
      workspace_id: null,
      capabilities: Array.from(layoutContextState.capabilitiesSet),
      features: Array.from(layoutContextState.featuresSet),
      premium_enabled: false,
    },
    refresh: vi.fn(),
  }),
  invalidateLayoutContext: vi.fn(),
}))

// ============================================================
// Load SUT
// ============================================================

import { useCapabilities } from '@/lib/permissions/useCapabilities'
import {
  useMyCapabilities,
  hasCapabilitySync,
  invalidateCapabilityCache,
} from '@/lib/permissions/useMyCapabilities'

// ============================================================
// Helpers
// ============================================================

function setCaps(...codes: string[]) {
  layoutContextState.capabilitiesSet = new Set(codes)
}

beforeEach(() => {
  layoutContextState.capabilitiesSet = new Set()
  layoutContextState.featuresSet = new Set()
  layoutContextState.loading = false
  invalidateCapabilityCache()
})

// ============================================================
// useMyCapabilities
// ============================================================

describe('useMyCapabilities — has()', () => {
  it('擁有 code 回 true、未擁有回 false', () => {
    setCaps('tours.read', 'orders.write')
    const { result } = renderHook(() => useMyCapabilities())

    expect(result.current.has('tours.read')).toBe(true)
    expect(result.current.has('orders.write')).toBe(true)
    expect(result.current.has('finance.payments.write')).toBe(false)
  })

  it('capabilitiesSet 空時所有 has() 都回 false（不會炸）', () => {
    setCaps()
    const { result } = renderHook(() => useMyCapabilities())

    expect(result.current.has('anything')).toBe(false)
    expect(result.current.codes.size).toBe(0)
  })

  it('loading 從 useLayoutContext 透傳', () => {
    layoutContextState.loading = true
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.loading).toBe(true)

    layoutContextState.loading = false
    const { result: result2 } = renderHook(() => useMyCapabilities())
    expect(result2.current.loading).toBe(false)
  })
})

describe('useMyCapabilities — canReadAnyInModule', () => {
  it('module 級 read（`tours.read`）視為 any', () => {
    setCaps('tours.read')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canReadAnyInModule('tours')).toBe(true)
  })

  it('tab 級 read（`tours.overview.read`）也算 module 有 read 資格', () => {
    setCaps('tours.overview.read')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canReadAnyInModule('tours')).toBe(true)
  })

  it('只有 write 沒有 read → 回 false（read/write 不互通）', () => {
    setCaps('tours.overview.write')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canReadAnyInModule('tours')).toBe(false)
  })

  it('別模組的 read 不算（精確 prefix）', () => {
    setCaps('orders.list.read')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canReadAnyInModule('tours')).toBe(false)
    expect(result.current.canReadAnyInModule('orders')).toBe(true)
  })

  it('沒有任何 capability → 全 false', () => {
    setCaps()
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canReadAnyInModule('tours')).toBe(false)
    expect(result.current.canReadAnyInModule('finance')).toBe(false)
  })
})

describe('useMyCapabilities — canWriteAnyInModule', () => {
  it('module 級 write 視為 any', () => {
    setCaps('finance.write')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canWriteAnyInModule('finance')).toBe(true)
  })

  it('tab 級 write 也算', () => {
    setCaps('finance.payments.write')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canWriteAnyInModule('finance')).toBe(true)
  })

  it('只有 read 沒 write → false', () => {
    setCaps('finance.payments.read')
    const { result } = renderHook(() => useMyCapabilities())
    expect(result.current.canWriteAnyInModule('finance')).toBe(false)
  })
})

// ============================================================
// hasCapabilitySync — non-React 同步 cache（給 zustand helpers 用）
// ============================================================

describe('hasCapabilitySync', () => {
  it('useMyCapabilities 載入後、hasCapabilitySync 同步可用', () => {
    setCaps('tours.read', 'orders.write')

    // mount 後 useEffect 會把 capabilitiesSet 寫進模組級 syncCache
    renderHook(() => useMyCapabilities())

    expect(hasCapabilitySync('tours.read')).toBe(true)
    expect(hasCapabilitySync('orders.write')).toBe(true)
    expect(hasCapabilitySync('finance.write')).toBe(false)
  })

  it('invalidateCapabilityCache() 清空 sync cache', () => {
    setCaps('tours.read')
    renderHook(() => useMyCapabilities())
    expect(hasCapabilitySync('tours.read')).toBe(true)

    act(() => {
      invalidateCapabilityCache()
    })

    expect(hasCapabilitySync('tours.read')).toBe(false)
  })

  it('hook 還沒 mount → 回 false（cache 未載入）', () => {
    invalidateCapabilityCache()
    expect(hasCapabilitySync('tours.read')).toBe(false)
  })
})

// ============================================================
// useCapabilities — wrapper（can / hasAny / hasAll / canRead / canWrite）
// ============================================================

describe('useCapabilities — can()', () => {
  it('can() 等同於 has()', () => {
    setCaps('tours.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.can('tours.read')).toBe(true)
    expect(result.current.can('tours.write')).toBe(false)
  })
})

describe('useCapabilities — hasAny / hasAll', () => {
  it('hasAny：陣列中任一存在 → true', () => {
    setCaps('tours.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.hasAny(['tours.read', 'tours.write'])).toBe(true)
    expect(result.current.hasAny(['orders.read', 'finance.read'])).toBe(false)
  })

  it('hasAll：全部存在才 true', () => {
    setCaps('tours.read', 'orders.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.hasAll(['tours.read', 'orders.read'])).toBe(true)
    expect(result.current.hasAll(['tours.read', 'finance.read'])).toBe(false)
  })

  it('hasAny / hasAll 對空陣列：hasAny=false、hasAll=true（vacuous truth）', () => {
    setCaps('tours.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.hasAny([])).toBe(false)
    expect(result.current.hasAll([])).toBe(true)
  })
})

describe('useCapabilities — canRead / canWrite', () => {
  it('canRead 不帶 tab → 查 `${module}.read`', () => {
    setCaps('tours.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.canRead('tours')).toBe(true)
    expect(result.current.canRead('orders')).toBe(false)
  })

  it('canRead 帶 tab → 查 `${module}.${tab}.read`', () => {
    setCaps('finance.payments.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.canRead('finance', 'payments')).toBe(true)
    expect(result.current.canRead('finance', 'requests')).toBe(false)
    // module 級 read 不存在 → canRead('finance') 仍是 false
    expect(result.current.canRead('finance')).toBe(false)
  })

  it('canWrite 不帶 tab → 查 `${module}.write`', () => {
    setCaps('hr.write')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.canWrite('hr')).toBe(true)
  })

  it('canWrite 帶 tab → 查 `${module}.${tab}.write`', () => {
    setCaps('hr.employees.write')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.canWrite('hr', 'employees')).toBe(true)
    expect(result.current.canWrite('hr', 'roles')).toBe(false)
  })
})

describe('useCapabilities — canReadAny / canWriteAny', () => {
  it('canReadAny 直通到 canReadAnyInModule', () => {
    setCaps('tours.overview.read')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.canReadAny('tours')).toBe(true)
    expect(result.current.canReadAny('finance')).toBe(false)
  })

  it('canWriteAny 直通到 canWriteAnyInModule', () => {
    setCaps('finance.payments.write')
    const { result } = renderHook(() => useCapabilities())

    expect(result.current.canWriteAny('finance')).toBe(true)
    expect(result.current.canWriteAny('hr')).toBe(false)
  })
})

describe('useCapabilities — loading', () => {
  it('loading 從 layout context 透傳', () => {
    layoutContextState.loading = true
    const { result } = renderHook(() => useCapabilities())
    expect(result.current.loading).toBe(true)
  })
})
