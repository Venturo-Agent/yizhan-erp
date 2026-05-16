import { describe, it, expect, vi } from 'vitest'
import { setAuditContext } from '@/lib/audit/set-audit-context'

/**
 * 配 ADR-0003 / supabase/migrations-pending/003_set_audit_context_function.sql
 *
 * 應用層 helper、call PG RPC `set_audit_context`、設 session 變數給 trigger 抓
 *
 * Schema 沒 apply 之前 test 走 mock supabase。
 */

function createMockSupabase(rpcResult: { error: null | { message: string } } = { error: null }) {
  const rpcMock = vi.fn().mockResolvedValue(rpcResult)
  return {
    supabase: { rpc: rpcMock } as never,
    rpcMock,
  }
}

const validCtx = { actorId: 'E001-uuid' }

describe('setAuditContext', () => {
  describe('正常路徑', () => {
    it('回 { ok: true }', async () => {
      const { supabase } = createMockSupabase()
      const r = await setAuditContext(supabase, validCtx)
      expect(r.ok).toBe(true)
    })

    it('call rpc("set_audit_context")', async () => {
      const { supabase, rpcMock } = createMockSupabase()
      await setAuditContext(supabase, validCtx)
      expect(rpcMock).toHaveBeenCalledWith(
        'set_audit_context',
        expect.any(Object)
      )
    })

    it('帶 p_actor_id 參數', async () => {
      const { supabase, rpcMock } = createMockSupabase()
      await setAuditContext(supabase, validCtx)
      const callArgs = rpcMock.mock.calls[0][1]
      expect(callArgs).toMatchObject({ p_actor_id: 'E001-uuid' })
    })

    it('reason / requestId optional 透傳', async () => {
      const { supabase, rpcMock } = createMockSupabase()
      await setAuditContext(supabase, {
        actorId: 'E001-uuid',
        reason: '客戶取消',
        requestId: 'req-abc',
      })
      const callArgs = rpcMock.mock.calls[0][1]
      expect(callArgs).toMatchObject({
        p_actor_id: 'E001-uuid',
        p_reason: '客戶取消',
        p_request_id: 'req-abc',
      })
    })

    it('沒 reason / requestId 時、預設 null（不送 undefined）', async () => {
      const { supabase, rpcMock } = createMockSupabase()
      await setAuditContext(supabase, validCtx)
      const callArgs = rpcMock.mock.calls[0][1]
      expect(callArgs.p_reason).toBeNull()
      expect(callArgs.p_request_id).toBeNull()
    })
  })

  describe('輸入驗證', () => {
    it('沒 actorId 拒絕（避免污染 PG session）', async () => {
      const { supabase, rpcMock } = createMockSupabase()
      const r = await setAuditContext(supabase, { actorId: '' })
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/actorId/i)
      expect(rpcMock).not.toHaveBeenCalled()
    })
  })

  describe('RPC error', () => {
    it('rpc 失敗時回 ok=false 帶錯誤訊息', async () => {
      const { supabase } = createMockSupabase({
        error: { message: 'function set_audit_context does not exist' },
      })
      const r = await setAuditContext(supabase, validCtx)
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/does not exist/)
    })
  })
})
