/**
 * enforceWorkspaceScope — 多租戶 workspace 隔離雙重 enforcement helper
 *
 * 配 ADR-0001 / refactor-backlog #15
 * 跟 RLS 一起雙保險、應用層擋一道、漏 RLS 也不外洩
 *
 * 用法：
 *   const query = enforceWorkspaceScope(
 *     supabase.from('tours').select('*'),
 *     { workspaceId: ctx.workspaceId }
 *   )
 *   // 自動加 .eq('workspace_id', ctx.workspaceId)
 *
 * Admin 跨 workspace 場景明確 opt-out：
 *   enforceWorkspaceScope(query, ctx, { allowCrossWorkspace: true })
 *
 * 未來擴展（搬完伺服器、deleted_at 欄位上線後）：
 *   - 預設加 .is('deleted_at', null)
 *   - includeDeleted=true opt-out
 */

interface WorkspaceContext {
  workspaceId: string
}

interface ScopeOptions {
  /** Admin / 跨 workspace 查詢明確 opt-out */
  allowCrossWorkspace?: boolean
  /**
   * 寬鬆模式：同時 match `workspace_id = X` OR `workspace_id IS NULL`
   * 用於 workspace_id 可能為 NULL 的表（遷移中或允許 NULL 的設計）。
   * 走 PostgREST `.or(...)`、需要 query 支援 .or()。
   * 預設 false（純 .eq、最安全）。
   */
  includeNullWorkspace?: boolean
}

interface ChainableQuery {
  eq: (column: string, value: unknown) => unknown
}

interface OrCapableQuery extends ChainableQuery {
  or: (filter: string) => unknown
}

export function enforceWorkspaceScope<Q extends ChainableQuery>(
  query: Q,
  ctx: WorkspaceContext,
  options: ScopeOptions = {}
): Q {
  if (options.allowCrossWorkspace) {
    return query
  }

  if (!ctx.workspaceId) {
    throw new Error(
      '[enforceWorkspaceScope] workspaceId 為空、無法進行多租戶隔離。' +
        '若是 admin 跨 workspace 查詢、明確設 { allowCrossWorkspace: true }。'
    )
  }

  if (options.includeNullWorkspace) {
    // Type guard: 確認 query 支援 .or()（PostgREST query builder 都支援）
    const orQuery = query as unknown as OrCapableQuery
    if (typeof orQuery.or !== 'function') {
      throw new Error(
        '[enforceWorkspaceScope] includeNullWorkspace 需要 query 支援 .or()、傳入物件不符。'
      )
    }
    return orQuery.or(
      `workspace_id.eq.${ctx.workspaceId},workspace_id.is.null`
    ) as Q
  }

  return query.eq('workspace_id', ctx.workspaceId) as Q
}
