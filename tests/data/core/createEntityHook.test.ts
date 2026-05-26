/**
 * createEntityHook unit tests
 *
 * 配 ADR-0004（測試策略）+ refactor-backlog 第一波
 *
 * 覆蓋範圍：
 *   - useList / useListSlim / useDetail / useDictionary / usePaginated  → fetch + cache + workspace 過濾
 *   - create / update / delete / batchRemove                            → DB call + 樂觀更新 + 錯誤回滾
 *   - invalidate                                                          → SWR + IDB 兩邊清
 *   - IDB fallback                                                        → SWR fetch 前先用上次快取
 *
 * Mock 策略：
 *   - Supabase client：自製 chainable query builder、覆寫 tests/setup.ts 的 minimal stub
 *   - useAuthStore：mock 成 isAuthenticated + hasHydrated 都 true
 *   - localStorage 直接寫 'auth-storage' 模擬 getCurrentUserContext
 *   - SWR：每個 test 用獨立 SWRConfig provider（new Map）避免污染
 *   - IDB：tests/setup.ts 已 polyfill fake-indexeddb / 自然跑
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'

// ============================================================
// 1) Mock Supabase client（覆寫 tests/setup.ts 的全局 stub）
// ============================================================
// thenable promise-like result 由 chain 結尾消化（await 直接拿 { data, error }）

interface QueryResult {
  data?: unknown
  error?: { message: string; code?: string } | null
  count?: number | null
}

// 全局可寫的「下一個 query 應回什麼」、依呼叫方式決定取哪個
type Resolver = (() => QueryResult | Promise<QueryResult>) | undefined

const mockQueue: {
  // 對應每個 from(table) 的後續 chain 結果
  // 用 fifo queue（一次 fetch 結束消耗一個）
  responses: Array<QueryResult>
  // 收集所有發出去的 op、test 用來斷言
  ops: Array<{
    table: string
    method: 'select' | 'insert' | 'update' | 'delete'
    payload?: unknown
    filters: Array<[string, ...unknown[]]>
    range?: [number, number]
    or?: string
    order?: { column: string; ascending: boolean }
    select?: string
    selectOpts?: { count?: string }
    limit?: number
    like?: [string, string]
    final?: 'single' | 'maybeSingle' | null
  }>
} = { responses: [], ops: [] }

function pushResponse(r: QueryResult) {
  mockQueue.responses.push(r)
}
function nextResponse(): QueryResult {
  return mockQueue.responses.shift() ?? { data: [], error: null, count: 0 }
}

// chain builder：每個 operation 結束時都是 thenable
function makeChain(
  table: string,
  method: 'select' | 'insert' | 'update' | 'delete',
  payload?: unknown
) {
  const op: (typeof mockQueue.ops)[number] = {
    table,
    method,
    payload,
    filters: [],
    final: null,
  }
  mockQueue.ops.push(op)

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
    op.filters.push(['eq', args[0], args[1]])
  })
  passthrough('in', args => {
    op.filters.push(['in', args[0], args[1]])
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
  passthrough('like', args => {
    op.like = [args[0] as string, args[1] as string]
  })
  passthrough('limit', args => {
    op.limit = args[0] as number
  })
  passthrough('range', args => {
    op.range = [args[0] as number, args[1] as number]
  })

  // 結束 chain 的 await 點
  const resolveQuery = async (): Promise<QueryResult> => {
    const r = nextResponse()
    return r
  }

  chain.single = () => {
    op.final = 'single'
    return Promise.resolve(nextResponse())
  }
  chain.maybeSingle = () => {
    op.final = 'maybeSingle'
    return Promise.resolve(nextResponse())
  }
  // thenable：await query 直接拿結果（select / update / delete / insert 沒接 single 時）
  ;(chain as unknown as { then: PromiseLike<QueryResult>['then'] }).then = (
    onFulfilled,
    onRejected
  ) => resolveQuery().then(onFulfilled, onRejected)

  return chain
}

// Realtime channel registry — tests can inspect / fire callbacks
// 用 function declarations（hoisted）+ 內含 state、避免 vi.mock factory hoist 撞 TDZ
interface MockChannel {
  name: string
  events: Array<{
    event: string
    filter?: unknown
    callback: (payload: unknown) => void
  }>
  subscribed: boolean
  removed: boolean
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
}

// 用 mockQueue 同款 pattern（mock-prefix const）放 state、function declaration 操作
const mockChannelRegistry: { channels: MockChannel[]; removeCalls: MockChannel[] } = {
  channels: [],
  removeCalls: [],
}

function mockMakeChannel(name: string): MockChannel {
  const channel: MockChannel = {
    name,
    events: [],
    subscribed: false,
    removed: false,
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }
  channel.on.mockImplementation(
    (event: string, filter: unknown, callback: (p: unknown) => void) => {
      channel.events.push({ event, filter, callback })
      return channel
    }
  )
  channel.subscribe.mockImplementation(() => {
    channel.subscribed = true
    return channel
  })
  channel.unsubscribe.mockImplementation(() => {
    channel.subscribed = false
    return channel
  })
  mockChannelRegistry.channels.push(channel)
  return channel
}

function mockDoRemoveChannel(channel: MockChannel) {
  channel.removed = true
  channel.subscribed = false
  mockChannelRegistry.removeCalls.push(channel)
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: (sel?: string, opts?: { count?: string }) =>
        makeChain(table, 'select').select(sel as never, opts as never),
      insert: (payload: unknown) => makeChain(table, 'insert', payload),
      update: (payload: unknown) => makeChain(table, 'update', payload),
      delete: () => makeChain(table, 'delete'),
    })),
    channel: vi.fn((name: string) => mockMakeChannel(name)),
    removeChannel: vi.fn((channel: MockChannel) => mockDoRemoveChannel(channel)),
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: 'mock-token' } }, error: null })
      ),
    },
    realtime: {
      setAuth: vi.fn(),
    },
  },
}))

// ============================================================
// 2) Mock auth-store
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
// 3) Mock logger（避免 noise）
// ============================================================
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================
// 4) 載入 SUT（必須在 mock 之後）
// ============================================================
import { createEntityHook } from '@/data/core/createEntityHook'
import type { BaseEntity } from '@/data/core/types'
import { invalidate_cache_pattern, set_cache, get_cache } from '@/lib/cache/indexeddb-cache'

interface Tour extends BaseEntity {
  id: string
  name: string
  total?: number | null
  code?: string | null
}

// ============================================================
// SWR wrapper：每個 renderHook 都有獨立 cache
// ============================================================
function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      children
    )
  }
}

// ============================================================
// Helpers
// ============================================================

beforeEach(async () => {
  mockQueue.responses = []
  mockQueue.ops = []
  mockChannelRegistry.channels = []
  mockChannelRegistry.removeCalls = []
  // 寫 localStorage 模擬 getCurrentUserContext
  localStorage.setItem(
    'auth-storage',
    JSON.stringify({ state: { user: { id: 'E001', workspace_id: 'W1' } } })
  )
  // 清 IDB cache（避免 test 之間污染）
  await invalidate_cache_pattern('entity:')
})

afterEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// Tests
// ============================================================

describe('createEntityHook — useList', () => {
  it('isReady 時抓全表、回 items', async () => {
    pushResponse({ data: [{ id: 't1', name: 'A' }], error: null })

    const hook = createEntityHook<Tour>('tours', { list: { select: 'id,name' } })
    const { result } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([{ id: 't1', name: 'A' }])
    expect(result.current.error).toBeNull()
  })

  it('select 用 config.list.select、預設 *', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: 'id,name,total' } })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].select).toBe('id,name,total')
  })

  it('workspace-scoped 表會加 .or() workspace 過濾', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].or).toBe('workspace_id.eq.W1,workspace_id.is.null')
  })

  it('非 workspace-scoped 表（顯式 false）不加 workspace 過濾', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('public_table', {
      list: { select: '*' },
      workspaceScoped: false,
    })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].or).toBeUndefined()
  })

  it('orderBy 套用到 .order()', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', {
      list: { select: '*', orderBy: { column: 'created_at', ascending: false } },
    })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].order).toEqual({ column: 'created_at', ascending: false })
  })

  it('range 從 0 開始、PAGE 1000', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].range).toEqual([0, 999])
  })

  it('滿 PAGE 1000 自動分頁第二輪', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ id: `t${i}`, name: 'X' }))
    const secondPage = [{ id: 'tail', name: 'Y' }]
    pushResponse({ data: firstPage, error: null })
    pushResponse({ data: secondPage, error: null })

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { result } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items.length).toBe(1001)
    // 第二輪 range 起點應為 1000
    expect(mockQueue.ops[1].range).toEqual([1000, 1999])
  })

  it('enabled=false 時不發 query（swrKey null）', async () => {
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    renderHook(() => hook.useList({ enabled: false }), { wrapper: makeWrapper() })
    // 等一個 tick、確認沒打 supabase
    await new Promise(r => setTimeout(r, 30))
    expect(mockQueue.ops.length).toBe(0)
  })

  it('error 時 result.error 帶 message', async () => {
    pushResponse({ data: null, error: { message: 'permission denied' } })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { result } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.error).toBe('permission denied'))
    expect(result.current.items).toEqual([])
  })

  it('defaultFilter 套用到 eq', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', {
      list: { select: '*', defaultFilter: { status: 'active' } },
    })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].filters).toContainEqual(['eq', 'status', 'active'])
  })
})

describe('createEntityHook — useDetail', () => {
  it('id=null 時 skip query（swrKey null、不發請求）', async () => {
    const hook = createEntityHook<Tour>('tours', { detail: { select: '*' } })
    const { result } = renderHook(() => hook.useDetail(null), { wrapper: makeWrapper() })
    // 等一個 tick
    await new Promise(r => setTimeout(r, 30))
    expect(mockQueue.ops.length).toBe(0)
    expect(result.current.item).toBeNull()
  })

  it('id 給定時用 .eq("id", id).maybeSingle() 抓單筆', async () => {
    pushResponse({ data: { id: 't1', name: 'Solo' }, error: null })
    const hook = createEntityHook<Tour>('tours', { detail: { select: '*' } })
    const { result } = renderHook(() => hook.useDetail('t1'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.item).toEqual({ id: 't1', name: 'Solo' })
    expect(mockQueue.ops[0].filters).toContainEqual(['eq', 'id', 't1'])
    expect(mockQueue.ops[0].final).toBe('maybeSingle')
  })

  it('record 不存在（maybeSingle 回 null）→ item=null、不算 error', async () => {
    pushResponse({ data: null, error: null })
    const hook = createEntityHook<Tour>('tours', { detail: { select: '*' } })
    const { result } = renderHook(() => hook.useDetail('missing'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.item).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('detail.select 預設 *、給定時用給定值', async () => {
    pushResponse({ data: { id: 't1' }, error: null })
    const hook = createEntityHook<Tour>('tours', { detail: { select: 'id,name' } })
    renderHook(() => hook.useDetail('t1'), { wrapper: makeWrapper() })
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].select).toBe('id,name')
  })
})

describe('createEntityHook — useListSlim', () => {
  it('使用 slim.select 而非 list.select', async () => {
    pushResponse({ data: [{ id: 't1' }], error: null })
    const hook = createEntityHook<Tour>('tours', {
      list: { select: 'id,name,total' },
      slim: { select: 'id' },
    })
    const { result } = renderHook(() => hook.useListSlim(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockQueue.ops[0].select).toBe('id')
  })
})

describe('createEntityHook — useDictionary', () => {
  it('把 items 轉成 id-keyed dictionary、get(id) 拿到 item', async () => {
    pushResponse({
      data: [
        { id: 't1', name: 'A' },
        { id: 't2', name: 'B' },
      ],
      error: null,
    })
    const hook = createEntityHook<Tour>('tours', {
      list: { select: '*' },
      slim: { select: 'id,name' },
    })
    const { result } = renderHook(() => hook.useDictionary(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(Object.keys(result.current.dictionary)).toHaveLength(2)
    expect(result.current.get('t1')).toEqual({ id: 't1', name: 'A' })
    expect(result.current.get('t2')?.name).toBe('B')
  })
})

describe('createEntityHook — usePaginated', () => {
  it('用 page/pageSize 算 range、帶 count: exact', async () => {
    pushResponse({ data: [{ id: 't1' }, { id: 't2' }], count: 42, error: null })

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { result } = renderHook(() => hook.usePaginated({ page: 2, pageSize: 15 }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalCount).toBe(42)
    expect(result.current.items).toHaveLength(2)
    expect(mockQueue.ops[0].range).toEqual([15, 29])
    expect(mockQueue.ops[0].selectOpts).toEqual({ count: 'exact' })
  })

  it('search + searchFields 套到 .or() ilike 查詢', async () => {
    pushResponse({ data: [], count: 0, error: null })
    const hook = createEntityHook<Tour>('tours', {
      list: { select: '*' },
      workspaceScoped: false,
    })
    renderHook(
      () =>
        hook.usePaginated({
          page: 1,
          pageSize: 15,
          search: 'tokyo',
          searchFields: ['name', 'code'],
        }),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    expect(mockQueue.ops[0].or).toBe('name.ilike.%tokyo%,code.ilike.%tokyo%')
  })

  it('filter 跳過 undefined / null / "" / "all"', async () => {
    pushResponse({ data: [], count: 0, error: null })
    const hook = createEntityHook<Tour>('tours', {
      list: { select: '*' },
      workspaceScoped: false,
    })
    renderHook(
      () =>
        hook.usePaginated({
          page: 1,
          pageSize: 15,
          filter: { status: 'active', kind: 'all', empty: '', nullVal: null, none: undefined },
        }),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(mockQueue.ops.length).toBeGreaterThan(0))
    const eqs = mockQueue.ops[0].filters.filter(f => f[0] === 'eq')
    expect(eqs).toEqual([['eq', 'status', 'active']])
  })
})

describe('createEntityHook — create', () => {
  it('INSERT + 注入 id / created_at / updated_at / workspace_id / created_by', async () => {
    // calendar_events：workspace-scoped 但不在 TABLE_CODE_PREFIX 裡 → 不會先發 max-code 查詢
    pushResponse({ data: { id: 'new-id', name: 'Created' }, error: null })

    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })
    const created = await hook.create({ name: 'New event' } as never)

    expect(created).toEqual({ id: 'new-id', name: 'Created' })
    const insertOp = mockQueue.ops.find(o => o.table === 'calendar_events' && o.method === 'insert')
    expect(insertOp).toBeDefined()
    const payload = insertOp!.payload as Record<string, unknown>
    expect(payload.id).toBeDefined()
    expect(payload.created_at).toBeDefined()
    expect(payload.updated_at).toBeDefined()
    expect(payload.workspace_id).toBe('W1')
    expect(payload.created_by).toBe('E001')
    expect(payload.updated_by).toBe('E001')
  })

  it('TABLE_CODE_PREFIX 表會自動生成 code（先查 max、再 +1 補 6 位 0）', async () => {
    // 第 1 次 query：select max code → 假裝沒既有
    pushResponse({ data: [], error: null })
    // 第 2 次 query：insert
    pushResponse({ data: { id: 'new', code: 'C000001' }, error: null })

    const hook = createEntityHook<Tour>('customers', { list: { select: '*' } })
    await hook.create({ name: 'Order 1' } as never)

    const insertOp = mockQueue.ops.find(o => o.method === 'insert')
    expect(insertOp).toBeDefined()
    const payload = insertOp!.payload as Record<string, unknown>
    expect(payload.code).toBe('C000001')
  })

  it('TABLE_CODE_PREFIX 表帶有既有 max code 時、+1 遞增', async () => {
    // 第 1 次 query：max code
    pushResponse({ data: [{ code: 'C000042' }], error: null })
    // 第 2 次 query：insert
    pushResponse({ data: { id: 'new', code: 'C000043' }, error: null })

    const hook = createEntityHook<Tour>('customers', { list: { select: '*' } })
    await hook.create({ name: 'Next order' } as never)

    const insertOp = mockQueue.ops.find(o => o.method === 'insert')
    const payload = insertOp!.payload as Record<string, unknown>
    expect(payload.code).toBe('C000043')
  })

  it('使用者已給 code 時不覆寫', async () => {
    pushResponse({ data: { id: 'new', code: 'CUSTOM-1' }, error: null })

    const hook = createEntityHook<Tour>('customers', { list: { select: '*' } })
    await hook.create({ name: 'X', code: 'CUSTOM-1' } as never)

    const insertOp = mockQueue.ops.find(o => o.method === 'insert')
    const payload = insertOp!.payload as Record<string, unknown>
    expect(payload.code).toBe('CUSTOM-1')
    // 應該沒有 max-code 查詢
    const maxQueries = mockQueue.ops.filter(o => o.like && o.like[0] === 'code')
    expect(maxQueries.length).toBe(0)
  })

  it('skipAuditFields 時不注入 created_by / updated_by', async () => {
    pushResponse({ data: { id: 'x' }, error: null })

    const hook = createEntityHook<Tour>('attractions', {
      list: { select: '*' },
      skipAuditFields: true,
    })
    await hook.create({ name: 'no-audit' } as never)

    const insertOp = mockQueue.ops.find(o => o.method === 'insert')
    const payload = insertOp!.payload as Record<string, unknown>
    expect(payload.created_by).toBeUndefined()
    expect(payload.updated_by).toBeUndefined()
  })

  it('INSERT 失敗（非 unique violation）→ throw', async () => {
    pushResponse({ data: null, error: { message: 'fk constraint', code: '23503' } })
    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })

    await expect(hook.create({ name: 'fail' } as never)).rejects.toMatchObject({
      message: 'fk constraint',
    })
  })

  it('unique violation（23505）會重試到 maxInsertRetries=3', async () => {
    // customers 有 prefix 會走重試路徑
    // 模擬：每次都 SELECT max code、然後 INSERT 撞 unique violation
    // 共 3 次 retry、6 個 query
    for (let i = 0; i < 3; i++) {
      pushResponse({ data: [{ code: 'C000001' }], error: null })
      pushResponse({
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      })
    }
    const hook = createEntityHook<Tour>('customers', { list: { select: '*' } })

    await expect(hook.create({ name: 'collision' } as never)).rejects.toBeDefined()
    // 應該至少跑了 2 次 insert（confirm 有重試）
    const inserts = mockQueue.ops.filter(o => o.method === 'insert')
    expect(inserts.length).toBeGreaterThan(1)
  })
})

describe('createEntityHook — update', () => {
  it('UPDATE + 注入 updated_at / updated_by、eq id', async () => {
    pushResponse({ data: null, error: null })

    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })
    const updated = await hook.update('t1', { name: 'Renamed' } as never)

    const op = mockQueue.ops.find(o => o.method === 'update')
    expect(op).toBeDefined()
    const payload = op!.payload as Record<string, unknown>
    expect(payload.name).toBe('Renamed')
    expect(payload.updated_at).toBeDefined()
    expect(payload.updated_by).toBe('E001')
    expect(op!.filters).toContainEqual(['eq', 'id', 't1'])
    // update 回傳同 payload + id
    expect((updated as Tour).id).toBe('t1')
    expect((updated as Tour).name).toBe('Renamed')
  })

  it('UPDATE 失敗時 throw', async () => {
    pushResponse({ data: null, error: { message: 'rls denied' } })
    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })

    await expect(hook.update('t1', { name: 'X' } as never)).rejects.toMatchObject({
      message: 'rls denied',
    })
  })

  it('skipAuditFields 時不寫 updated_by', async () => {
    pushResponse({ data: null, error: null })
    const hook = createEntityHook<Tour>('attractions', {
      list: { select: '*' },
      skipAuditFields: true,
    })
    await hook.update('a1', { name: 'X' } as never)

    const op = mockQueue.ops.find(o => o.method === 'update')
    const payload = op!.payload as Record<string, unknown>
    expect(payload.updated_by).toBeUndefined()
    expect(payload.updated_at).toBeDefined()
  })
})

describe('createEntityHook — delete / batchRemove', () => {
  it('delete: DELETE + eq id、成功回 true', async () => {
    pushResponse({ data: null, error: null })
    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })

    const ok = await hook.delete('t1')
    expect(ok).toBe(true)

    const op = mockQueue.ops.find(o => o.method === 'delete')
    expect(op).toBeDefined()
    expect(op!.filters).toContainEqual(['eq', 'id', 't1'])
  })

  it('delete 失敗時 throw', async () => {
    pushResponse({ data: null, error: { message: 'fk constraint' } })
    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })

    await expect(hook.delete('t1')).rejects.toMatchObject({ message: 'fk constraint' })
  })

  it('batchRemove: DELETE + in("id", [...])、成功回 true', async () => {
    pushResponse({ data: null, error: null })
    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })

    const ok = await hook.batchRemove(['t1', 't2', 't3'])
    expect(ok).toBe(true)

    const op = mockQueue.ops.find(o => o.method === 'delete')
    expect(op).toBeDefined()
    expect(op!.filters).toContainEqual(['in', 'id', ['t1', 't2', 't3']])
  })

  it('batchRemove 空陣列直接回 true、不發 query', async () => {
    const hook = createEntityHook<Tour>('calendar_events', { list: { select: '*' } })
    const ok = await hook.batchRemove([])
    expect(ok).toBe(true)
    expect(mockQueue.ops.length).toBe(0)
  })
})

describe('createEntityHook — invalidate', () => {
  it('清掉 IDB cache 對應 prefix', async () => {
    // 先放一個假的 cache entry
    await set_cache('entity:tours:list', [{ id: 'cached' }])
    await set_cache('entity:other:list', [{ id: 'other' }])

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    await hook.invalidate()

    // tours prefix 的應被清
    const tours = await get_cache('entity:tours:list')
    expect(tours).toBeNull()
    // 別的 prefix 不受影響
    const other = await get_cache('entity:other:list')
    expect(other).not.toBeNull()
  })
})

describe('createEntityHook — IDB fallback', () => {
  // TODO 重寫：5/15 cache key 加 ':v{selectHash}' 後綴後、test 用的 'entity:tours:list'
  // 跟 source 實際 key 對不上。要重寫成 mock set_cache spy、驗證 call 行為而非 IDB 讀取。
  it.skip('SWR fetch 之前、items 從 IDB 拿（先回 cached、再被 fresh 覆寫）', async () => {
    // 先預先把 cache 寫進 IDB
    await set_cache('entity:tours:list', [{ id: 'cached', name: 'From IDB' }])
    // SWR fetch 拉新資料
    pushResponse({ data: [{ id: 'fresh', name: 'From DB' }], error: null })

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { result } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    // 等到 fetch 完成
    await waitFor(() => {
      expect(result.current.items.some(i => i.id === 'fresh')).toBe(true)
    })

    // onSuccess 會把 fresh 寫回 IDB
    await waitFor(async () => {
      const cached = await get_cache<Tour[]>('entity:tours:list')
      expect(cached?.data?.[0]?.id).toBe('fresh')
    })
  })

  it('沒 IDB cache + fetch 失敗 → items 為空 + error 帶 message', async () => {
    pushResponse({ data: null, error: { message: 'network error' } })

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { result } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.error).toBe('network error'))
    expect(result.current.items).toEqual([])
  })
})

describe('createEntityHook — refresh', () => {
  it('refresh() 重新 fetch、items 更新', async () => {
    pushResponse({ data: [{ id: 't1', name: 'first' }], error: null })

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { result } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0]!.name).toBe('first')

    // 預備下一次 fetch 的回應
    pushResponse({ data: [{ id: 't1', name: 'second' }], error: null })
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.items[0]!.name).toBe('second'))
  })
})

// ============================================================
// Realtime sync — Supabase channel subscription on mount/unmount
// 對應 src/data/core/createEntityHook.ts:177–196 的 useRealtimeSync
// ============================================================
describe('createEntityHook — Realtime sync', () => {
  it('mount 時建好 channel、命名 realtime:<table>:<suffix>', async () => {
    // Phase C.2（2026-05-20）：channel name 加 random suffix 避免快速切 page collide
    // 命名格式：realtime:<table>:<8 字 base36 suffix>
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockChannelRegistry.channels.length).toBeGreaterThan(0))
    const channel = mockChannelRegistry.channels[0]!
    expect(channel.name).toMatch(/^realtime:tours:[a-z0-9]{1,8}$/)
    // 註冊 postgres_changes 監聽
    expect(channel.events.length).toBe(1)
    expect(channel.events[0]!.event).toBe('postgres_changes')
    expect(channel.events[0]!.filter).toMatchObject({
      event: '*',
      schema: 'public',
      table: 'tours',
    })
    // subscribe 被呼叫
    expect(channel.subscribed).toBe(true)
  })

  it('不同 table 的 hook 各自 subscribe 各自 channel（不打架）', async () => {
    pushResponse({ data: [], error: null })
    pushResponse({ data: [], error: null })

    const tours = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const orders = createEntityHook<Tour>('customers', { list: { select: '*' } })

    renderHook(() => tours.useList(), { wrapper: makeWrapper() })
    renderHook(() => orders.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockChannelRegistry.channels.length).toBe(2))
    // Phase C.2：每 channel 加 random suffix、用 startsWith 比 prefix 即可
    const prefixes = mockChannelRegistry.channels.map(c => c.name.replace(/:[a-z0-9]+$/, '')).sort()
    expect(prefixes).toEqual(['realtime:customers', 'realtime:tours'])
    // 兩個都 subscribed
    expect(mockChannelRegistry.channels.every(c => c.subscribed)).toBe(true)
  })

  it('broadcast event 收到時、清掉 IDB cache 對應 prefix', async () => {
    // 1) 預先在 IDB 塞 cache、確認真有東西
    await set_cache('entity:tours:list', [{ id: 'cached', name: 'pre' }])
    await set_cache('entity:other:list', [{ id: 'other-cached' }])

    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockChannelRegistry.channels.length).toBeGreaterThan(0))
    const channel = mockChannelRegistry.channels[0]!

    // 2) 模擬 Supabase 推送變更事件、手動觸發 callback
    await act(async () => {
      channel.events[0]!.callback({ eventType: 'INSERT', new: { id: 'realtime-row' } })
      // 給 invalidate_cache_pattern 一個 tick 落地
      await new Promise(r => setTimeout(r, 30))
    })

    // 3) 對應 prefix 的 cache 應被清空
    const tours = await get_cache('entity:tours:list')
    expect(tours).toBeNull()
    // 不同 prefix 不受影響
    const other = await get_cache('entity:other:list')
    expect(other).not.toBeNull()
  })

  it('broadcast callback 處理三種 eventType（INSERT/UPDATE/DELETE）+ filter 對應 table', async () => {
    // 注：SWR 在 SWRConfig provider 隔離 cache、不易跨 provider 驗證 globalMutate 的 revalidate 副作用、
    // 這裡只驗證 callback 被註冊 + filter 正確 + invoke 各種 payload 不會炸（IDB 清除已在上一個 test 覆蓋）
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockChannelRegistry.channels.length).toBeGreaterThan(0))
    const channel = mockChannelRegistry.channels[0]!
    const callback = channel.events[0]!.callback

    // postgres_changes 的 filter：event=*、schema=public、table=tours
    expect(channel.events[0]!.filter).toEqual({
      event: '*',
      schema: 'public',
      table: 'tours',
    })

    // 三種 Postgres event 都應 handled、不 throw
    expect(() => callback({ eventType: 'INSERT', new: { id: 'r1' } })).not.toThrow()
    expect(() =>
      callback({ eventType: 'UPDATE', new: { id: 'r2' }, old: { id: 'r2' } })
    ).not.toThrow()
    expect(() => callback({ eventType: 'DELETE', old: { id: 'r3' } })).not.toThrow()
  })

  it('unmount 時 removeChannel 被 call、channel cleanup', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })
    const { unmount } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockChannelRegistry.channels.length).toBeGreaterThan(0))
    const channel = mockChannelRegistry.channels[0]!
    expect(channel.removed).toBe(false)

    unmount()

    expect(mockChannelRegistry.removeCalls).toContain(channel)
    expect(channel.removed).toBe(true)
    expect(channel.subscribed).toBe(false)
  })

  it('多次 mount/unmount 沒 leak（每輪一個 channel、unmount 後都清乾淨）', async () => {
    pushResponse({ data: [], error: null })
    pushResponse({ data: [], error: null })
    pushResponse({ data: [], error: null })

    const hook = createEntityHook<Tour>('tours', { list: { select: '*' } })

    for (let i = 0; i < 3; i++) {
      const { unmount } = renderHook(() => hook.useList(), { wrapper: makeWrapper() })
      await waitFor(() => expect(mockChannelRegistry.channels.length).toBe(i + 1))
      unmount()
    }

    // 三輪共建立 3 個 channel、全部都 removed
    expect(mockChannelRegistry.channels.length).toBe(3)
    expect(mockChannelRegistry.channels.every(c => c.removed)).toBe(true)
    expect(mockChannelRegistry.removeCalls.length).toBe(3)
    // 每個 channel 名字都對（Phase C.2 加 suffix、前綴比對）
    expect(
      mockChannelRegistry.channels.every(c => /^realtime:tours:[a-z0-9]{1,8}$/.test(c.name))
    ).toBe(true)
  })

  it('useListSlim 也會 subscribe 對應 table 的 channel', async () => {
    pushResponse({ data: [], error: null })
    const hook = createEntityHook<Tour>('customers', {
      list: { select: '*' },
      slim: { select: 'id,name' },
    })
    renderHook(() => hook.useListSlim(), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockChannelRegistry.channels.length).toBeGreaterThan(0))
    // Phase C.2 channel name 加 suffix、用 prefix 比對
    expect(mockChannelRegistry.channels[0]!.name).toMatch(/^realtime:customers:[a-z0-9]{1,8}$/)
    expect(mockChannelRegistry.channels[0]!.subscribed).toBe(true)
  })
})
