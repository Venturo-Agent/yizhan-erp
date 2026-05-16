import { describe, it, expect, vi } from 'vitest'
import { enforceWorkspaceScope } from '@/lib/auth/enforce-workspace-scope'

/**
 * 配 ADR-0001 多租戶隔離雙重 enforcement / refactor-backlog #15
 *
 * 階段 1 (這版)：只加 workspace_id filter
 * 階段 2 (搬完伺服器後)：加 deleted_at IS NULL filter
 *
 * helper signature 階段 2 不變、行為自動疊加。
 */

// 模擬 supabase query builder 的 chainable interface
function createMockQuery() {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const builder = {
    eq: vi.fn((col: string, val: unknown) => {
      calls.push({ method: 'eq', args: [col, val] })
      return builder
    }),
    is: vi.fn((col: string, val: unknown) => {
      calls.push({ method: 'is', args: [col, val] })
      return builder
    }),
    _calls: () => calls,
  }
  return builder
}

describe('enforceWorkspaceScope', () => {
  describe('預設行為（最重要的資安保證）', () => {
    it('加上 .eq("workspace_id", ctx.workspaceId)', () => {
      const q = createMockQuery()
      enforceWorkspaceScope(q, { workspaceId: 'W42' })
      expect(q.eq).toHaveBeenCalledWith('workspace_id', 'W42')
    })

    it('回傳同一個 query builder（chainable）', () => {
      const q = createMockQuery()
      const result = enforceWorkspaceScope(q, { workspaceId: 'W1' })
      expect(result).toBe(q)
    })

    it('不同 workspaceId 會帶不同的值（不會撞）', () => {
      const q1 = createMockQuery()
      const q2 = createMockQuery()
      enforceWorkspaceScope(q1, { workspaceId: 'W1' })
      enforceWorkspaceScope(q2, { workspaceId: 'W2' })
      expect(q1.eq).toHaveBeenCalledWith('workspace_id', 'W1')
      expect(q2.eq).toHaveBeenCalledWith('workspace_id', 'W2')
    })
  })

  describe('allowCrossWorkspace（admin 工具明確 opt-out）', () => {
    it('=true 時不加任何 filter', () => {
      const q = createMockQuery()
      enforceWorkspaceScope(q, { workspaceId: 'W1' }, { allowCrossWorkspace: true })
      expect(q.eq).not.toHaveBeenCalled()
    })

    it('=false 時加 filter（明確 false 跟未傳一樣）', () => {
      const q = createMockQuery()
      enforceWorkspaceScope(q, { workspaceId: 'W1' }, { allowCrossWorkspace: false })
      expect(q.eq).toHaveBeenCalledWith('workspace_id', 'W1')
    })
  })

  describe('輸入驗證', () => {
    it('workspaceId 為空字串時拋錯（避免漏寫變成查全部）', () => {
      const q = createMockQuery()
      expect(() => enforceWorkspaceScope(q, { workspaceId: '' })).toThrow()
    })

    it('workspaceId 為 undefined 時拋錯', () => {
      const q = createMockQuery()
      expect(() =>
        enforceWorkspaceScope(q, { workspaceId: undefined as unknown as string })
      ).toThrow()
    })

    it('allowCrossWorkspace=true 時、workspaceId 可以是空字串（admin 場景）', () => {
      const q = createMockQuery()
      expect(() =>
        enforceWorkspaceScope(q, { workspaceId: '' }, { allowCrossWorkspace: true })
      ).not.toThrow()
    })
  })

  describe('未來擴展位置（佔位、現在不該執行）', () => {
    it('預設不加 deleted_at filter（schema 還沒這欄位）', () => {
      const q = createMockQuery()
      enforceWorkspaceScope(q, { workspaceId: 'W1' })
      expect(q.is).not.toHaveBeenCalled()
    })

    // TODO: 搬完伺服器、deleted_at column 上線後、加：
    // it('預設加 .is("deleted_at", null)', () => { ... })
    // it('includeDeleted=true 時不加 deleted_at filter', () => { ... })
  })
})
