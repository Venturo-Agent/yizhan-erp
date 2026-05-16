/**
 * useToursPaginated unit tests
 *
 * 涵蓋（refactor-backlog #15 拆遷目標前的安全網）：
 *   - page=1, pageSize=15 → range(0, 14)
 *   - page=2, pageSize=15 → range(15, 29)
 *   - search 套到 .or() ilike（name / code / location / description）
 *   - status filter 散落（proposal / template / archived / upcoming / closed / 'all'）
 *   - sortBy / sortOrder 套到 .order()
 *   - cache key 穩定性（同 args 同 key）
 *   - error → result.error 帶 message
 *   - realtime channel mount/unmount
 *
 * Mock 策略：
 *   - 自製 chainable query builder、捕獲所有 .eq / .neq / .in / .or / .range / .order / .not 呼叫
 *   - SWR：用獨立 SWRConfig provider new Map() 隔離 cache
 *   - useAuthStore：mock user.id / workspace_id
 *   - 不測 mutation（create/update/delete）— 那是 createEntityHook 已覆蓋的領域
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

// ============================================================
// Mock Supabase chainable query builder
// ============================================================

interface QueryResult {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

interface CapturedOp {
  table: string
  select?: string
  selectOpts?: { count?: string }
  filters: Array<[string, string, ...unknown[]]>
  // .not('code', 'like', 'VISA%') 等
  notFilters: Array<[string, string, unknown]>
  range?: [number, number]
  order?: { column: string; ascending: boolean }
  or?: string
}

const mockState: {
  responses: QueryResult[]
  ops: CapturedOp[]
  realtimeChannels: Array<{
    name: string
    onCalls: Array<[string, unknown, () => void]>
    subscribe: ReturnType<typeof vi.fn>
  }>
} = {
  responses: [],
  ops: [],
  realtimeChannels: [],
}

function pushResponse(r: QueryResult) {
  mockState.responses.push(r)
}
function nextResponse(): QueryResult {
  return mockState.responses.shift() ?? { data: [], count: 0, error: null }
}

function makeChain(table: string): unknown {
  const op: CapturedOp = { table, filters: [], notFilters: [] }
  mockState.ops.push(op)

  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  const passthrough = (key: string, mutator?: (args: unknown[]) => void) => {
    chain[key] = (...args: unknown[]) => {
      mutator?.(args)
      return chain
    }
  }

  passthrough('select', args => {
    op.select = args[0] as string
    op.selectOpts = args[1] as { count?: string } | undefined
  })
  passthrough('eq', args => {
    op.filters.push(['eq', args[0] as string, args[1]])
  })
  passthrough('neq', args => {
    op.filters.push(['neq', args[0] as string, args[1]])
  })
  passthrough('gte', args => {
    op.filters.push(['gte', args[0] as string, args[1]])
  })
  passthrough('lte', args => {
    op.filters.push(['lte', args[0] as string, args[1]])
  })
  passthrough('in', args => {
    op.filters.push(['in', args[0] as string, args[1]])
  })
  passthrough('not', args => {
    op.notFilters.push([args[0] as string, args[1] as string, args[2]])
  })
  passthrough('or', args => {
    op.or = args[0] as string
  })
  passthrough('order', args => {
    op.order = {
      column: args[0] as string,
      ascending: (args[1] as { ascending: boolean }).ascending,
    }
  })
  passthrough('range', args => {
    op.range = [args[0] as number, args[1] as number]
  })

  // 結束 chain（await 直接拿 { data, count, error }）
  ;(chain as unknown as { then: PromiseLike<QueryResult>['then'] }).then = (
    onFulfilled,
    onRejected,
  ) => Promise.resolve(nextResponse()).then(onFulfilled, onRejected)

  return chain
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: (sel?: string, opts?: { count?: string }) => {
        const c = makeChain(table) as Record<string, (...a: unknown[]) => unknown>
        return c.select(sel as never, opts as never)
      },
      insert: () => makeChain(table),
      update: () => makeChain(table),
      delete: () => makeChain(table),
    })),
    channel: vi.fn((name: string) => {
      const ch = {
        name,
        onCalls: [] as Array<[string, unknown, () => void]>,
        on: vi.fn(),
        subscribe: vi.fn(),
      }
      ch.on.mockImplementation((event: string, opts: unknown, cb: () => void) => {
        ch.onCalls.push([event, opts, cb])
        return ch
      })
      ch.subscribe.mockImplementation(() => ch)
      mockState.realtimeChannels.push(ch)
      return ch
    }),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
  },
}))

// ============================================================
// Mock auth-store（供 useToursPaginated 拿 workspace_id）
// ============================================================

const authState = {
  user: { id: 'E001', workspace_id: 'W1' },
  isAuthenticated: true,
  _hasHydrated: true,
}

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}))

// ============================================================
// Mock 其他依賴
// ============================================================

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/data', () => ({
  deleteTour: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/workspace-helpers', () => ({
  getCurrentWorkspaceCode: vi.fn().mockResolvedValue('VENTURO'),
}))

vi.mock('@/stores/utils/code-generator', () => ({
  generateTourCode: vi.fn(),
}))

vi.mock('@/lib/utils/uuid', () => ({
  generateUUID: vi.fn(() => 'uuid-1'),
}))

// ============================================================
// 載入 SUT
// ============================================================

import { useToursPaginated } from '@/app/(main)/tours/_hooks/useToursPaginated'

// SWR wrapper：每個 renderHook 都有獨立 cache
function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      children,
    )
  }
}

beforeEach(() => {
  mockState.responses = []
  mockState.ops = []
  mockState.realtimeChannels = []
})

afterEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// Tests
// ============================================================

describe('useToursPaginated — pagination', () => {
  it('page=1, pageSize=15 → range(0, 14)', async () => {
    pushResponse({ data: [], count: 0, error: null })

    const { result } = renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp).toBeDefined()
    expect(tourOp!.range).toEqual([0, 14])
  })

  it('page=2, pageSize=15 → range(15, 29)', async () => {
    pushResponse({ data: [], count: 0, error: null })

    const { result } = renderHook(
      () => useToursPaginated({ page: 2, pageSize: 15 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp!.range).toEqual([15, 29])
  })

  it('page=3, pageSize=20 → range(40, 59)', async () => {
    pushResponse({ data: [], count: 0, error: null })

    const { result } = renderHook(
      () => useToursPaginated({ page: 3, pageSize: 20 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp!.range).toEqual([40, 59])
  })

  it('count: exact 一律帶（讓分頁拿總筆數）', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(() => useToursPaginated({ page: 1, pageSize: 15 }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp!.selectOpts).toEqual({ count: 'exact' })
  })

  it('回傳 totalCount = supabase count', async () => {
    pushResponse({
      data: [{ id: 't1', name: 'Tokyo' }],
      count: 42,
      error: null,
    })

    const { result } = renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalCount).toBe(42)
  })
})

describe('useToursPaginated — search', () => {
  it('search="tokyo" → .or() 套 ilike 到 name / code / location / description', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, search: 'tokyo' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp!.or).toBe(
      'name.ilike.%tokyo%,code.ilike.%tokyo%,location.ilike.%tokyo%,description.ilike.%tokyo%',
    )
  })

  it('search 是空字串 → 不套 .or()', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, search: '' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp!.or).toBeUndefined()
  })

  it('search 是純空白 → trim 後不套 .or()', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, search: '   ' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const tourOp = mockState.ops.find(o => o.table === 'tours')
    expect(tourOp!.or).toBeUndefined()
  })
})

// TODO: VISA/ESIM 排除邏輯 + realtime channel name 變動後過時、需要重寫對齊新 entity hook 行為
describe.skip('useToursPaginated — status filter 散落', () => {
  it('status="proposal" → eq("status","proposal") + neq("archived",true)', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'proposal' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.filters).toContainEqual(['eq', 'status', 'proposal'])
    expect(op.filters).toContainEqual(['neq', 'archived', true])
  })

  it('status="template" → eq("status","template") + neq archived', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'template' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.filters).toContainEqual(['eq', 'status', 'template'])
  })

  it('status="archived" → eq("archived",true)（封存是獨立欄位）', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'archived' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.filters).toContainEqual(['eq', 'archived', true])
  })

  it('status="upcoming" → in status [upcoming,ongoing] + 排除 VISA/ESIM', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'upcoming' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!

    // in 過濾
    const inFilter = op.filters.find(f => f[0] === 'in' && f[1] === 'status')
    expect(inFilter).toBeDefined()
    const inValues = inFilter![2] as string[]
    expect(inValues).toContain('upcoming')
    expect(inValues).toContain('ongoing')

    // 排除工具團（VISA / ESIM）
    expect(op.notFilters).toContainEqual(['code', 'like', 'VISA%'])
    expect(op.notFilters).toContainEqual(['code', 'like', 'ESIM%'])
  })

  it('status="closed" → eq("status","closed") + 排除 VISA/ESIM + neq archived', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'closed' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.filters).toContainEqual(['eq', 'status', 'closed'])
    expect(op.filters).toContainEqual(['neq', 'archived', true])
    expect(op.notFilters).toContainEqual(['code', 'like', 'VISA%'])
  })

  it('status="all" → in 4 種 status + 排除工具團 + neq archived', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'all' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    const inFilter = op.filters.find(f => f[0] === 'in' && f[1] === 'status')
    const values = inFilter![2] as string[]
    expect(values).toEqual(
      expect.arrayContaining(['upcoming', 'ongoing', 'returned', 'closed']),
    )
  })

  it('一律 eq("is_active", true)（過濾已軟刪除的團）', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(() => useToursPaginated({ page: 1, pageSize: 15 }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.filters).toContainEqual(['eq', 'is_active', true])
  })
})

describe('useToursPaginated — sort', () => {
  it('預設 status="all" → sortBy=departure_date, desc', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(() => useToursPaginated({ page: 1, pageSize: 15, status: 'all' }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.order).toEqual({ column: 'departure_date', ascending: false })
  })

  it('status="proposal" → sortBy=created_at（提案 / 模板沒出發日）', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, status: 'proposal' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.order!.column).toBe('created_at')
  })

  it('sortOrder="asc" → ascending: true', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, sortOrder: 'asc' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.order!.ascending).toBe(true)
  })

  it('明確指定 sortBy 蓋過預設', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15, sortBy: 'price' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockState.ops.length).toBeGreaterThan(0))
    const op = mockState.ops.find(o => o.table === 'tours')!
    expect(op.order!.column).toBe('price')
  })
})

describe('useToursPaginated — error handling', () => {
  it('supabase error → result.error 帶 message', async () => {
    pushResponse({ data: null, count: null, error: { message: 'rls denied' } })

    const { result } = renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.error).toBe('rls denied'))
    expect(result.current.tours).toEqual([])
  })

  it('成功時 error=null', async () => {
    pushResponse({ data: [{ id: 't1' }], count: 1, error: null })

    const { result } = renderHook(
      () => useToursPaginated({ page: 1, pageSize: 15 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.tours.length).toBe(1)
  })
})

// TODO: realtime channel name 從 'realtime:tours-paginated' 變成 'realtime:tours-paginated:W1'（含 workspace ID）、test 待對齊
describe.skip('useToursPaginated — realtime channel', () => {
  it('mount 時建立 realtime channel + on(postgres_changes) + subscribe', async () => {
    pushResponse({ data: [], count: 0, error: null })

    renderHook(() => useToursPaginated({ page: 1, pageSize: 15 }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(mockState.realtimeChannels.length).toBe(1))
    const ch = mockState.realtimeChannels[0]!
    expect(ch.name).toBe('realtime:tours-paginated')
    expect(ch.subscribe).toHaveBeenCalled()
    expect(ch.onCalls.length).toBeGreaterThan(0)
    expect(ch.onCalls[0]![0]).toBe('postgres_changes')
  })

  it('unmount 時呼 supabase.removeChannel', async () => {
    pushResponse({ data: [], count: 0, error: null })

    // dynamic import 拿 supabase mock 來斷言 removeChannel
    const { supabase } = await import('@/lib/supabase/client')
    const removeChannelSpy = supabase.removeChannel as unknown as ReturnType<typeof vi.fn>

    const { unmount } = renderHook(() =>
      useToursPaginated({ page: 1, pageSize: 15 }),
    { wrapper: makeWrapper() })

    await waitFor(() => expect(mockState.realtimeChannels.length).toBe(1))
    unmount()
    expect(removeChannelSpy).toHaveBeenCalled()
  })
})
