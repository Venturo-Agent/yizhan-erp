/**
 * useEditingPresence unit tests
 *
 * 涵蓋：
 *   - mount 時 channel.subscribe / track 被呼叫
 *   - unmount 時 untrack + removeChannel 都呼到
 *   - presence 'sync' 事件觸發時 state 更新（自己 / 別人）
 *   - 多次 mount/unmount 沒漏 cleanup
 *   - enabled=false / 空 resourceId / 沒登入 → 不訂閱
 *
 * Mock 策略：
 *   - 自製 mockChannel，記錄所有 on / subscribe / track / untrack 呼叫
 *   - presence 'sync' callback 用 captureSyncCallback() 抓出來、test 主動觸發
 *   - useAuthStore 用 selector 形式 mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================================
// Mock Supabase channel
// ============================================================

interface MockChannel {
  presenceCallbacks: Array<(payload?: unknown) => void>
  state: Record<string, Array<{ name?: string; email?: string; joinedAt?: string }>>
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  track: ReturnType<typeof vi.fn>
  untrack: ReturnType<typeof vi.fn>
  presenceState: () => Record<string, unknown>
}

const channels: MockChannel[] = []

function createMockChannel(): MockChannel {
  const ch: MockChannel = {
    presenceCallbacks: [],
    state: {},
    on: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    presenceState: () => ch.state,
  }

  ch.on.mockImplementation((event: string, opts: { event: string }, cb: () => void) => {
    if (event === 'presence' && opts?.event === 'sync') {
      ch.presenceCallbacks.push(cb)
    }
    return ch
  })

  // subscribe(callback) — 立即呼叫 callback('SUBSCRIBED')、模擬訂閱成功
  ch.subscribe.mockImplementation(async (cb?: (status: string) => Promise<void> | void) => {
    if (cb) {
      await cb('SUBSCRIBED')
    }
    return ch
  })

  ch.track.mockResolvedValue('ok')
  ch.untrack.mockResolvedValue('ok')

  return ch
}

const removeChannelMock = vi.fn()
const channelFactoryMock = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: (...args: unknown[]) => channelFactoryMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  },
}))

// ============================================================
// Mock auth-store
// ============================================================

const authState: {
  user: { id: string; name?: string; email?: string } | null
} = {
  user: { id: 'E001', name: 'Alice', email: 'alice@x.com' },
}

vi.mock('@/stores', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}))

// ============================================================
// Mock logger（避免 noise）
// ============================================================

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ============================================================
// 載入 SUT（必須在 mock 之後）
// ============================================================

import { useEditingPresence } from '@/hooks/useEditingPresence'

beforeEach(() => {
  channels.length = 0
  channelFactoryMock.mockReset()
  channelFactoryMock.mockImplementation(() => {
    const ch = createMockChannel()
    channels.push(ch)
    return ch
  })
  removeChannelMock.mockReset()
  authState.user = { id: 'E001', name: 'Alice', email: 'alice@x.com' }
})

afterEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// Tests
// ============================================================

describe('useEditingPresence — subscribe / track', () => {
  it('mount 時：建立 channel、註冊 presence sync、subscribe + track 自己', async () => {
    renderHook(() =>
      useEditingPresence({ resourceType: 'itinerary', resourceId: 'I001' }),
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const ch = channels[0]!

    // channel name 應帶 resourceType + resourceId
    expect(channelFactoryMock).toHaveBeenCalledWith(
      'editing:itinerary:I001',
      expect.objectContaining({
        config: expect.objectContaining({
          presence: expect.objectContaining({ key: 'E001' }),
        }),
      }),
    )

    // 註冊了 'presence' 'sync' 事件
    expect(ch.on).toHaveBeenCalledWith(
      'presence',
      expect.objectContaining({ event: 'sync' }),
      expect.any(Function),
    )
    expect(ch.presenceCallbacks.length).toBe(1)

    // SUBSCRIBED 後會 track 自己（帶 name / email / joinedAt）
    await waitFor(() => expect(ch.track).toHaveBeenCalled())
    const trackArg = ch.track.mock.calls[0]![0] as Record<string, unknown>
    expect(trackArg.name).toBe('Alice')
    expect(trackArg.email).toBe('alice@x.com')
    expect(typeof trackArg.joinedAt).toBe('string')
  })

  it('enabled=false 時不建 channel', async () => {
    renderHook(() =>
      useEditingPresence({ resourceType: 'itinerary', resourceId: 'I001', enabled: false }),
    )
    // 等一個 tick、確保沒非同步 setup
    await new Promise(r => setTimeout(r, 30))
    expect(channelFactoryMock).not.toHaveBeenCalled()
  })

  it('resourceId 空字串時不建 channel', async () => {
    renderHook(() => useEditingPresence({ resourceType: 'itinerary', resourceId: '' }))
    await new Promise(r => setTimeout(r, 30))
    expect(channelFactoryMock).not.toHaveBeenCalled()
  })

  it('user 不存在時不建 channel', async () => {
    authState.user = null
    renderHook(() => useEditingPresence({ resourceType: 'order', resourceId: 'O1' }))
    await new Promise(r => setTimeout(r, 30))
    expect(channelFactoryMock).not.toHaveBeenCalled()
  })
})

describe('useEditingPresence — presence sync state 更新', () => {
  it('收到 sync 時、把 presenceState 轉成 currentEditors / otherEditors', async () => {
    const { result } = renderHook(() =>
      useEditingPresence({ resourceType: 'itinerary', resourceId: 'I001' }),
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const ch = channels[0]!

    // 模擬 supabase 內部寫好的 presence state（兩人在編輯）
    ch.state = {
      E001: [{ name: 'Alice', email: 'alice@x.com', joinedAt: '2026-05-08T10:00:00Z' }],
      E002: [{ name: 'Bob', email: 'bob@x.com', joinedAt: '2026-05-08T10:01:00Z' }],
    }

    // 觸發 'sync' callback
    act(() => {
      ch.presenceCallbacks[0]!()
    })

    await waitFor(() => expect(result.current.currentEditors.length).toBe(2))

    expect(result.current.currentEditors).toHaveLength(2)
    expect(result.current.otherEditors).toHaveLength(1)
    expect(result.current.otherEditors[0]!.id).toBe('E002')
    expect(result.current.otherEditors[0]!.name).toBe('Bob')
    expect(result.current.isOtherEditing).toBe(true)
  })

  it('只有自己在編輯時、otherEditors 為空、isOtherEditing=false', async () => {
    const { result } = renderHook(() =>
      useEditingPresence({ resourceType: 'order', resourceId: 'O1' }),
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const ch = channels[0]!

    ch.state = {
      E001: [{ name: 'Alice', joinedAt: '2026-05-08T10:00:00Z' }],
    }
    act(() => {
      ch.presenceCallbacks[0]!()
    })

    await waitFor(() => expect(result.current.currentEditors.length).toBe(1))
    expect(result.current.otherEditors).toHaveLength(0)
    expect(result.current.isOtherEditing).toBe(false)
  })

  it('presence entry 沒 name 時用「未知用戶」', async () => {
    const { result } = renderHook(() =>
      useEditingPresence({ resourceType: 'order', resourceId: 'O1' }),
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const ch = channels[0]!

    ch.state = {
      E999: [{ joinedAt: '2026-05-08T10:00:00Z' }],
    }
    act(() => {
      ch.presenceCallbacks[0]!()
    })

    await waitFor(() => expect(result.current.currentEditors.length).toBe(1))
    expect(result.current.currentEditors[0]!.name).toBe('未知用戶')
  })

  it('空 presence array 會被忽略（不算編輯者）', async () => {
    const { result } = renderHook(() =>
      useEditingPresence({ resourceType: 'order', resourceId: 'O1' }),
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const ch = channels[0]!

    ch.state = {
      E001: [{ name: 'Alice', joinedAt: 'now' }],
      EMPTY: [],
    }
    act(() => {
      ch.presenceCallbacks[0]!()
    })

    await waitFor(() => expect(result.current.currentEditors.length).toBe(1))
    expect(result.current.currentEditors[0]!.id).toBe('E001')
  })
})

describe('useEditingPresence — cleanup', () => {
  it('unmount 時呼 untrack + removeChannel', async () => {
    const { unmount } = renderHook(() =>
      useEditingPresence({ resourceType: 'order', resourceId: 'O1' }),
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const ch = channels[0]!

    // 等 setup 完
    await waitFor(() => expect(ch.track).toHaveBeenCalled())

    unmount()

    expect(ch.untrack).toHaveBeenCalled()
    expect(removeChannelMock).toHaveBeenCalledWith(ch)
  })

  it('多次 mount/unmount 不漏 cleanup（沒 leak channel）', async () => {
    for (let i = 0; i < 3; i++) {
      const { unmount } = renderHook(() =>
        useEditingPresence({ resourceType: 'order', resourceId: `O${i}` }),
      )
      // 等 channel 建好
      await waitFor(() => expect(channels.length).toBe(i + 1))
      unmount()
    }

    // 三次 unmount 應該對應三次 removeChannel
    expect(removeChannelMock).toHaveBeenCalledTimes(3)
    // 每個 channel 都 untrack 過
    channels.forEach(ch => {
      expect(ch.untrack).toHaveBeenCalled()
    })
  })

  it('resourceId 變更時：舊 channel 清掉、新 channel 建起', async () => {
    const { rerender } = renderHook(
      ({ id }: { id: string }) =>
        useEditingPresence({ resourceType: 'order', resourceId: id }),
      { initialProps: { id: 'O1' } },
    )

    await waitFor(() => expect(channels.length).toBe(1))
    const first = channels[0]!

    rerender({ id: 'O2' })

    await waitFor(() => expect(channels.length).toBe(2))

    // 第一個 channel 應被清
    expect(first.untrack).toHaveBeenCalled()
    expect(removeChannelMock).toHaveBeenCalledWith(first)

    // 第二個 channel name 應帶新 resourceId
    expect(channelFactoryMock).toHaveBeenLastCalledWith(
      'editing:order:O2',
      expect.any(Object),
    )
  })
})
