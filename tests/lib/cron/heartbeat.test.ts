import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Cron Heartbeat 包裝測試
 *
 * 業務 risk:
 *   withCronHeartbeat 包所有 Vercel cron handler。bug 會：
 *     - 對外回錯誤 status code → Vercel 重試風暴 / 永遠 fail
 *     - heartbeat 寫錯狀態 → 監控以為 job 死掉、半夜叫人
 *     - retry 邏輯壞 → 暫時性錯誤直接放棄、本來能成功的 job 失敗
 *
 * 覆蓋:
 *   1. 成功路徑：第一次成功、回 200、heartbeat = success
 *   2. retry 路徑：前 N 次失敗、第 N+1 次成功、attempts 算對
 *   3. 全失敗：3 次都炸、回 500、heartbeat = failed + last_error
 *   4. heartbeat 寫失敗不能炸 handler（吞 error）
 *   5. duration_ms 量測正確
 *   6. 不同 jobName 隔離
 */

// Mock 必須在 import 受測模組之前
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { withCronHeartbeat } from '@/lib/cron/heartbeat'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

type HeartbeatPatch = {
  job_name: string
  status: 'running' | 'success' | 'failed'
  started_at?: string
  finished_at?: string
  duration_ms?: number
  attempts?: number
  last_error?: string | null
  updated_at?: string
}

function createMockSupabase(opts: { upsertResolves?: boolean; upsertThrows?: boolean } = {}) {
  const calls: HeartbeatPatch[] = []
  const upsertMock = vi.fn((row: HeartbeatPatch) => {
    calls.push(row)
    if (opts.upsertThrows) {
      return Promise.reject(new Error('heartbeat write failed'))
    }
    return Promise.resolve({ error: null })
  })
  const fromMock = vi.fn((_table: string) => ({ upsert: upsertMock }))
  const supabase = { from: fromMock } as never
  return { supabase, fromMock, upsertMock, calls }
}

beforeEach(() => {
  vi.clearAllMocks()
  // 把 setTimeout 砍掉 retry backoff、不真的等 1s/2s/4s
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('withCronHeartbeat', () => {
  describe('成功路徑（一次就過）', () => {
    it('回 NextResponse 200、success: true', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockResolvedValue({ processed: 5 })
      const promise = withCronHeartbeat('job-A', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.attempt).toBe(1)
      expect(body.data).toEqual({ processed: 5 })
    })

    it('handler 只跑一次', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockResolvedValue({ ok: true })
      const promise = withCronHeartbeat('job-B', handler)
      await vi.runAllTimersAsync()
      await promise

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('寫兩次 heartbeat：running → success', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const promise = withCronHeartbeat('job-C', async () => 'done')
      await vi.runAllTimersAsync()
      await promise

      expect(calls).toHaveLength(2)
      expect(calls[0].status).toBe('running')
      expect(calls[0].job_name).toBe('job-C')
      expect(calls[0].attempts).toBe(0)
      expect(calls[1].status).toBe('success')
      expect(calls[1].attempts).toBe(1)
      expect(calls[1].last_error).toBeNull()
    })

    it('upsert 寫到 cron_heartbeats table、用 job_name 當 conflict key', async () => {
      const { supabase, fromMock, upsertMock } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const promise = withCronHeartbeat('job-D', async () => 'ok')
      await vi.runAllTimersAsync()
      await promise

      expect(fromMock).toHaveBeenCalledWith('cron_heartbeats')
      expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ job_name: 'job-D' }), {
        onConflict: 'job_name',
      })
    })

    it('duration_ms 是 finished - started、≥ 0', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const promise = withCronHeartbeat('job-E', async () => 'ok')
      await vi.runAllTimersAsync()
      await promise

      const successCall = calls.find(c => c.status === 'success')
      expect(successCall).toBeDefined()
      expect(typeof successCall!.duration_ms).toBe('number')
      expect(successCall!.duration_ms).toBeGreaterThanOrEqual(0)
    })

    it('started_at / finished_at 是合法 ISO string', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const promise = withCronHeartbeat('job-F', async () => 'ok')
      await vi.runAllTimersAsync()
      await promise

      const runningCall = calls.find(c => c.status === 'running')!
      const successCall = calls.find(c => c.status === 'success')!
      expect(runningCall.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(successCall.finished_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(!isNaN(Date.parse(runningCall.started_at!))).toBe(true)
      expect(!isNaN(Date.parse(successCall.finished_at!))).toBe(true)
    })
  })

  describe('Retry 路徑', () => {
    it('第一次失敗、第二次成功 → 200 + attempt=2', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      let count = 0
      const handler = vi.fn().mockImplementation(async () => {
        count++
        if (count < 2) throw new Error('transient')
        return { processed: 1 }
      })

      const promise = withCronHeartbeat('job-retry-1', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      expect(handler).toHaveBeenCalledTimes(2)
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.attempt).toBe(2)
    })

    it('前兩次失敗、第三次成功（最後一次嘗試）', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      let count = 0
      const handler = vi.fn().mockImplementation(async () => {
        count++
        if (count < 3) throw new Error('transient')
        return 'done-on-3'
      })

      const promise = withCronHeartbeat('job-retry-2', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      expect(handler).toHaveBeenCalledTimes(3)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.attempt).toBe(3)

      const successCall = calls.find(c => c.status === 'success')!
      expect(successCall.attempts).toBe(3)
    })

    it('warn log 記每次失敗的 attempt', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      let count = 0
      const handler = vi.fn().mockImplementation(async () => {
        count++
        if (count < 2) throw new Error('boom')
        return 'ok'
      })

      const promise = withCronHeartbeat('job-warn', handler)
      await vi.runAllTimersAsync()
      await promise

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('attempt 1 failed'),
        expect.any(Error)
      )
    })
  })

  describe('全失敗（3 次都炸）', () => {
    it('回 NextResponse 500 + success: false', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockRejectedValue(new Error('永久失敗'))
      const promise = withCronHeartbeat('job-fail', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('永久失敗')
    })

    it('handler 跑滿 3 次（MAX_RETRIES）', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockRejectedValue(new Error('boom'))
      const promise = withCronHeartbeat('job-fail-2', handler)
      await vi.runAllTimersAsync()
      await promise

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('heartbeat 寫 failed + last_error + attempts=3', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockRejectedValue(new Error('database offline'))
      const promise = withCronHeartbeat('job-fail-3', handler)
      await vi.runAllTimersAsync()
      await promise

      const failedCall = calls.find(c => c.status === 'failed')
      expect(failedCall).toBeDefined()
      expect(failedCall!.attempts).toBe(3)
      expect(failedCall!.last_error).toBe('database offline')
      expect(failedCall!.duration_ms).toBeGreaterThanOrEqual(0)
    })

    it('non-Error throw（throw string / object）也能存 last_error', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockRejectedValue('plain-string-error')
      const promise = withCronHeartbeat('job-fail-string', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      const body = await res.json()
      expect(body.error).toBe('plain-string-error')
      const failedCall = calls.find(c => c.status === 'failed')!
      expect(failedCall.last_error).toBe('plain-string-error')
    })

    it('last_error 截斷到 2000 字元（避免噴爆 DB）', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const longMsg = 'x'.repeat(5000)
      const handler = vi.fn().mockRejectedValue(new Error(longMsg))
      const promise = withCronHeartbeat('job-long-err', handler)
      await vi.runAllTimersAsync()
      await promise

      const failedCall = calls.find(c => c.status === 'failed')!
      expect(failedCall.last_error!.length).toBe(2000)
    })

    it('error log 記最終失敗', async () => {
      const { supabase } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockRejectedValue(new Error('final'))
      const promise = withCronHeartbeat('job-final', handler)
      await vi.runAllTimersAsync()
      await promise

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('all 3 attempts failed'),
        expect.any(Error)
      )
    })
  })

  describe('Heartbeat 寫失敗時的彈性（不能炸到 handler）', () => {
    it('upsert 拋錯時、handler 仍繼續跑、最終不影響回傳', async () => {
      const { supabase } = createMockSupabase({ upsertThrows: true })
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const handler = vi.fn().mockResolvedValue({ ok: true })
      const promise = withCronHeartbeat('job-hb-broken', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      // handler 仍成功
      expect(handler).toHaveBeenCalledTimes(1)
      const body = await res.json()
      expect(body.success).toBe(true)
      // logger.error 應有「heartbeat write failed」紀錄
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('heartbeat write failed'),
        expect.any(Error)
      )
    })

    it('getSupabaseAdminClient 拋錯也吞、不炸 handler', async () => {
      vi.mocked(getSupabaseAdminClient).mockImplementation(() => {
        throw new Error('Missing env var')
      })

      const handler = vi.fn().mockResolvedValue('ok')
      const promise = withCronHeartbeat('job-no-env', handler)
      await vi.runAllTimersAsync()
      const res = await promise

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('jobName 隔離', () => {
    it('每次 call 都帶各自的 job_name', async () => {
      const { supabase, calls } = createMockSupabase()
      vi.mocked(getSupabaseAdminClient).mockReturnValue(supabase)

      const p1 = withCronHeartbeat('job-X', async () => 'a')
      await vi.runAllTimersAsync()
      await p1

      const p2 = withCronHeartbeat('job-Y', async () => 'b')
      await vi.runAllTimersAsync()
      await p2

      const xCalls = calls.filter(c => c.job_name === 'job-X')
      const yCalls = calls.filter(c => c.job_name === 'job-Y')
      expect(xCalls.length).toBe(2)
      expect(yCalls.length).toBe(2)
    })
  })
})
