import { describe, it, expect, vi } from 'vitest'
import { recordAudit } from '@/lib/audit/record-audit'

/**
 * 配 ADR-0003 / refactor-backlog #16
 *
 * 應用層 helper、INSERT 到 audit_logs。schema 跟 DB trigger 等搬完伺服器才上、
 * 這個 helper 介面先定型、test 走 mock supabase、實際接通在搬完後。
 *
 * 雙軌策略：
 *   - 應用層 helper（這個）：主動寫、含 reason / request_id metadata
 *   - DB trigger（002_audit_logs_table.sql）：兜底、避免漏寫
 */

function createMockSupabase(insertResult: { error: null | { message: string } } = { error: null }) {
  const insertMock = vi.fn().mockResolvedValue(insertResult)
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
  return {
    supabase: { from: fromMock } as never,
    insertMock,
    fromMock,
  }
}

const validCtx = { workspaceId: 'W1', actorId: 'E001' }
const validPayload = {
  action: 'create' as const,
  entityType: 'orders',
  entityId: 'O123',
}

describe('recordAudit', () => {
  describe('正常路徑', () => {
    it('回 { ok: true }', async () => {
      const { supabase } = createMockSupabase()
      const result = await recordAudit(supabase, validCtx, validPayload)
      expect(result.ok).toBe(true)
    })

    it('insert 到 audit_logs table', async () => {
      const { supabase, fromMock } = createMockSupabase()
      await recordAudit(supabase, validCtx, validPayload)
      expect(fromMock).toHaveBeenCalledWith('audit_logs')
    })

    it('payload 包含 workspace_id / actor_id / action / entity', async () => {
      const { supabase, insertMock } = createMockSupabase()
      await recordAudit(supabase, validCtx, validPayload)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'W1',
          actor_id: 'E001',
          action: 'create',
          entity_type: 'orders',
          entity_id: 'O123',
        })
      )
    })

    it('before / after 透傳', async () => {
      const { supabase, insertMock } = createMockSupabase()
      const before = { total: 100 }
      const after = { total: 200 }
      await recordAudit(supabase, validCtx, {
        ...validPayload,
        action: 'update',
        before,
        after,
      })
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ before, after }))
    })

    it('reason 透傳', async () => {
      const { supabase, insertMock } = createMockSupabase()
      await recordAudit(supabase, validCtx, { ...validPayload, reason: '客戶要求取消' })
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ reason: '客戶要求取消' }))
    })

    it('requestId 透傳（從 ctx 拿）', async () => {
      const { supabase, insertMock } = createMockSupabase()
      await recordAudit(
        supabase,
        { ...validCtx, requestId: 'req-abc' },
        validPayload
      )
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ request_id: 'req-abc' }))
    })

    it('沒 before / after / reason 時、預設 null', async () => {
      const { supabase, insertMock } = createMockSupabase()
      await recordAudit(supabase, validCtx, validPayload)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          before: null,
          after: null,
          reason: null,
          request_id: null,
        })
      )
    })

    it('支援所有 audit action', async () => {
      const { supabase } = createMockSupabase()
      const actions = [
        'create',
        'update',
        'soft_delete',
        'force_delete',
        'restore',
        'login',
        'capability_change',
      ] as const

      for (const action of actions) {
        const r = await recordAudit(supabase, validCtx, { ...validPayload, action })
        expect(r.ok).toBe(true)
      }
    })
  })

  describe('輸入驗證（不能信外部、必擋）', () => {
    it('workspaceId 為空時拒絕', async () => {
      const { supabase, insertMock } = createMockSupabase()
      const r = await recordAudit(supabase, { ...validCtx, workspaceId: '' }, validPayload)
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/workspaceId/i)
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('actorId 為空時拒絕（避免匿名稽核紀錄）', async () => {
      const { supabase, insertMock } = createMockSupabase()
      const r = await recordAudit(supabase, { ...validCtx, actorId: '' }, validPayload)
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/actorId/i)
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('沒 entityType 拒絕', async () => {
      const { supabase, insertMock } = createMockSupabase()
      const r = await recordAudit(supabase, validCtx, { ...validPayload, entityType: '' })
      expect(r.ok).toBe(false)
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('沒 entityId 拒絕', async () => {
      const { supabase, insertMock } = createMockSupabase()
      const r = await recordAudit(supabase, validCtx, { ...validPayload, entityId: '' })
      expect(r.ok).toBe(false)
      expect(insertMock).not.toHaveBeenCalled()
    })
  })

  describe('DB error 處理', () => {
    it('supabase 回 error 時、helper 回 ok=false 帶錯誤訊息', async () => {
      const { supabase } = createMockSupabase({ error: { message: 'permission denied' } })
      const r = await recordAudit(supabase, validCtx, validPayload)
      expect(r.ok).toBe(false)
      expect(r.error).toBe('permission denied')
    })
  })
})
