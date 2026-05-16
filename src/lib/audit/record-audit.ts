/**
 * recordAudit — 應用層 audit log helper
 *
 * 配 ADR-0003 / refactor-backlog #16 / supabase/migrations-pending/002_audit_logs_table.sql
 *
 * 雙軌策略：
 *   - 應用層 helper（這個）：主動 INSERT、含 reason / request_id metadata
 *   - DB trigger（002_audit_logs_table.sql）：兜底、避免漏寫
 *
 * 用法：
 *   await recordAudit(supabase, { workspaceId, actorId, requestId }, {
 *     action: 'soft_delete',
 *     entityType: 'orders',
 *     entityId: orderId,
 *     before: oldOrder,
 *     reason: '客戶要求取消',
 *   })
 *
 * 注意：DB schema 未 apply（table 不存在）時呼叫會 fail — 屬預期
 */

export interface AuditContext {
  workspaceId: string
  actorId: string
  requestId?: string
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'soft_delete'
  | 'force_delete'
  | 'restore'
  | 'login'
  | 'capability_change'
  | 'cross_workspace_read' // 2026-05-14：漫途 admin 跨 workspace 查客戶資料

export interface AuditPayload {
  action: AuditAction
  entityType: string
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  reason?: string
}

interface AuditResult {
  ok: boolean
  error?: string
}

interface SupabaseLike {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: null | { message: string } }>
  }
}

export async function recordAudit(
  supabase: SupabaseLike,
  ctx: AuditContext,
  payload: AuditPayload
): Promise<AuditResult> {
  // 輸入驗證 — 不能信外部、避免污染稽核紀錄
  if (!ctx.workspaceId) {
    return { ok: false, error: 'missing workspaceId' }
  }
  if (!ctx.actorId) {
    return { ok: false, error: 'missing actorId' }
  }
  if (!payload.entityType) {
    return { ok: false, error: 'missing entityType' }
  }
  if (!payload.entityId) {
    return { ok: false, error: 'missing entityId' }
  }

  const { error } = await supabase.from('audit_logs').insert({
    workspace_id: ctx.workspaceId,
    actor_id: ctx.actorId,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    before: payload.before ?? null,
    after: payload.after ?? null,
    reason: payload.reason ?? null,
    request_id: ctx.requestId ?? null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
