import { describe, it, expect, vi } from 'vitest'
import { softDelete, restoreSoftDeleted } from '@/lib/data/soft-delete'

/**
 * 配 ADR-0002 / refactor-backlog #23
 *
 * Helper 行為：
 *   - softDelete: UPDATE 加 deleted_at + deleted_by + deleted_reason、過濾 workspace_id
 *   - restoreSoftDeleted: UPDATE deleted_at = NULL、過濾 workspace_id
 *   - 兩者都會 call recordAudit 寫 audit log（雙軌）
 *
 * Schema 沒上之前 test 走 mock supabase。
 */

// Mock chain factory
function createMockChain(updateResult: { error: null | { message: string } } = { error: null }) {
  const eqMock = vi.fn().mockReturnThis()
  const updateMock = vi.fn().mockReturnValue({
    eq: eqMock,
    then: (resolve: (value: { error: null | { message: string } }) => void) =>
      resolve(updateResult),
  })
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'audit_logs') {
      return { insert: insertMock }
    }
    return { update: updateMock }
  })
  return {
    supabase: { from: fromMock } as never,
    fromMock,
    updateMock,
    eqMock,
    insertMock,
  }
}

const validCtx = { workspaceId: 'W1', actorId: 'E001' }

describe('softDelete', () => {
  describe('正常路徑', () => {
    it('回 { ok: true }', async () => {
      const { supabase } = createMockChain()
      const r = await softDelete(supabase, validCtx, { table: 'orders', id: 'O1' })
      expect(r.ok).toBe(true)
    })

    it('UPDATE 目標 table', async () => {
      const { supabase, fromMock } = createMockChain()
      await softDelete(supabase, validCtx, { table: 'orders', id: 'O1' })
      expect(fromMock).toHaveBeenCalledWith('orders')
    })

    it('UPDATE 帶 deleted_at / deleted_by / deleted_reason', async () => {
      const { supabase, updateMock } = createMockChain()
      await softDelete(supabase, validCtx, {
        table: 'orders',
        id: 'O1',
        reason: '客戶取消',
      })

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_by: 'E001',
          deleted_reason: '客戶取消',
        })
      )
      // deleted_at 是 NOW()、檢查是 ISO 字串
      const arg = updateMock.mock.calls[0][0]
      expect(arg.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('eq filter 帶 id + workspace_id（雙重 enforcement）', async () => {
      const { supabase, eqMock } = createMockChain()
      await softDelete(supabase, validCtx, { table: 'orders', id: 'O1' })

      expect(eqMock).toHaveBeenCalledWith('id', 'O1')
      expect(eqMock).toHaveBeenCalledWith('workspace_id', 'W1')
    })

    it('沒 reason 時、deleted_reason 為 null', async () => {
      const { supabase, updateMock } = createMockChain()
      await softDelete(supabase, validCtx, { table: 'orders', id: 'O1' })
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ deleted_reason: null }))
    })

    it('成功後 call recordAudit（雙軌）', async () => {
      const { supabase, fromMock, insertMock } = createMockChain()
      await softDelete(supabase, validCtx, {
        table: 'orders',
        id: 'O1',
        reason: '客戶取消',
        before: { id: 'O1', total: 100 },
      })

      // audit_logs 應被 INSERT
      expect(fromMock).toHaveBeenCalledWith('audit_logs')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'soft_delete',
          entity_type: 'orders',
          entity_id: 'O1',
          reason: '客戶取消',
          before: { id: 'O1', total: 100 },
        })
      )
    })
  })

  describe('輸入驗證', () => {
    it('沒 workspaceId 拒絕', async () => {
      const { supabase, updateMock } = createMockChain()
      const r = await softDelete(
        supabase,
        { ...validCtx, workspaceId: '' },
        { table: 'orders', id: 'O1' }
      )
      expect(r.ok).toBe(false)
      expect(updateMock).not.toHaveBeenCalled()
    })

    it('沒 actorId 拒絕（避免匿名刪除）', async () => {
      const { supabase, updateMock } = createMockChain()
      const r = await softDelete(
        supabase,
        { ...validCtx, actorId: '' },
        { table: 'orders', id: 'O1' }
      )
      expect(r.ok).toBe(false)
      expect(updateMock).not.toHaveBeenCalled()
    })

    it('沒 table 拒絕', async () => {
      const { supabase } = createMockChain()
      const r = await softDelete(supabase, validCtx, { table: '', id: 'O1' })
      expect(r.ok).toBe(false)
    })

    it('沒 id 拒絕', async () => {
      const { supabase } = createMockChain()
      const r = await softDelete(supabase, validCtx, { table: 'orders', id: '' })
      expect(r.ok).toBe(false)
    })
  })

  describe('DB error', () => {
    it('UPDATE 失敗時回 ok=false、不寫 audit', async () => {
      const { supabase, fromMock } = createMockChain({ error: { message: 'permission denied' } })
      const r = await softDelete(supabase, validCtx, { table: 'orders', id: 'O1' })

      expect(r.ok).toBe(false)
      expect(r.error).toBe('permission denied')
      // audit_logs 不該被 call
      const auditCalls = fromMock.mock.calls.filter((c) => c[0] === 'audit_logs')
      expect(auditCalls.length).toBe(0)
    })
  })
})

describe('restoreSoftDeleted', () => {
  describe('正常路徑', () => {
    it('UPDATE 把 deleted_* 都設 NULL', async () => {
      const { supabase, updateMock } = createMockChain()
      await restoreSoftDeleted(supabase, validCtx, { table: 'orders', id: 'O1' })

      expect(updateMock).toHaveBeenCalledWith({
        deleted_at: null,
        deleted_by: null,
        deleted_reason: null,
      })
    })

    it('eq 帶 id + workspace_id', async () => {
      const { supabase, eqMock } = createMockChain()
      await restoreSoftDeleted(supabase, validCtx, { table: 'orders', id: 'O1' })

      expect(eqMock).toHaveBeenCalledWith('id', 'O1')
      expect(eqMock).toHaveBeenCalledWith('workspace_id', 'W1')
    })

    it('成功後 call recordAudit action=restore', async () => {
      const { supabase, insertMock } = createMockChain()
      await restoreSoftDeleted(supabase, validCtx, { table: 'orders', id: 'O1' })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'restore',
          entity_type: 'orders',
          entity_id: 'O1',
        })
      )
    })
  })

  describe('輸入驗證', () => {
    it('沒 workspaceId 拒絕', async () => {
      const { supabase, updateMock } = createMockChain()
      const r = await restoreSoftDeleted(
        supabase,
        { ...validCtx, workspaceId: '' },
        { table: 'orders', id: 'O1' }
      )
      expect(r.ok).toBe(false)
      expect(updateMock).not.toHaveBeenCalled()
    })
  })
})
