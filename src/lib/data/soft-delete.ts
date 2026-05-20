/**
 * 軟刪除應用層 helper
 *
 * 配 ADR-0002 / refactor-backlog #23 / supabase/migrations-pending/001_soft_delete_columns.sql
 *
 * 雙軌策略：
 *   - 應用層 helper（這個）：UPDATE deleted_* + 同步寫 audit log
 *   - DB trigger（002_audit_logs_table.sql）：兜底、避免漏寫
 *
 * 用法：
 *   await softDelete(supabase, { workspaceId, actorId }, {
 *     table: 'orders',
 *     id: orderId,
 *     reason: '客戶要求取消',
 *     before: oldOrder,
 *   })
 *
 * 注意：DB schema 未 apply（function 不存在）時呼叫會 fail — 屬預期
 */

import { recordAudit } from '@/lib/audit/record-audit'

export interface SoftDeleteContext {
  workspaceId: string
  actorId: string
  requestId?: string
}

export interface SoftDeletePayload {
  table: string
  id: string
  reason?: string
  /** 軟刪除前的資料快照、寫進 audit log 給對帳用 */
  before?: Record<string, unknown>
  /**
   * Workspace 比對的欄位名、預設 `workspace_id`。
   * Shared library 表（attractions / hotels / restaurants）用 `created_by_workspace_id`。
   */
  workspaceColumn?: string
  /**
   * 對 platform-shared row（workspaceColumn IS NULL）允許刪除、依賴 RLS 擋未授權。
   * Shared library（attractions/hotels/restaurants）99.9% 是 NULL、需設此 flag 才刪得到。
   */
  allowPlatformShared?: boolean
}

interface OperationResult {
  ok: boolean
  error?: string
}

interface UpdateBuilder {
  eq: (column: string, value: unknown) => UpdateBuilder | Promise<{ error: null | { message: string } }>
  or: (filter: string) => UpdateBuilder | Promise<{ error: null | { message: string } }>
  then?: (resolve: (value: { error: null | { message: string } }) => void) => void
}

interface InsertBuilder {
  insert: (row: Record<string, unknown>) => Promise<{ error: null | { message: string } }>
}

interface SupabaseLike {
  from: (table: string) => {
    update?: (row: Record<string, unknown>) => UpdateBuilder
    insert?: (row: Record<string, unknown>) => Promise<{ error: null | { message: string } }>
  } & Partial<InsertBuilder>
}

function validateContext(ctx: SoftDeleteContext): string | null {
  if (!ctx.workspaceId) return 'missing workspaceId'
  if (!ctx.actorId) return 'missing actorId'
  return null
}

function validatePayload(payload: { table: string; id: string }): string | null {
  if (!payload.table) return 'missing table'
  if (!payload.id) return 'missing id'
  return null
}

export async function softDelete(
  supabase: SupabaseLike,
  ctx: SoftDeleteContext,
  payload: SoftDeletePayload
): Promise<OperationResult> {
  const ctxErr = validateContext(ctx)
  if (ctxErr) return { ok: false, error: ctxErr }
  const payloadErr = validatePayload(payload)
  if (payloadErr) return { ok: false, error: payloadErr }

  const workspaceColumn = payload.workspaceColumn ?? 'workspace_id'

  // 1. UPDATE 加 is_active=false + audit timestamp + actor + reason
  // 地方法律 #3：軟刪除統一 is_active=false（業務狀態）、audit 欄位輔助、不准散刻
  const builder = supabase
    .from(payload.table)
    .update!({
      is_active: false,
      deleted_at: new Date().toISOString(),
      deleted_by: ctx.actorId,
      deleted_reason: payload.reason ?? null,
    })
    .eq('id', payload.id) as UpdateBuilder

  // 對 platform-shared row（workspaceColumn IS NULL）允許刪除、依賴 RLS 擋未授權
  // shared library 99.9% 是 NULL、enforce workspace eq 會 0 rows updated（假成功）
  const final = (
    payload.allowPlatformShared
      ? (builder as UpdateBuilder).or(`${workspaceColumn}.is.null,${workspaceColumn}.eq.${ctx.workspaceId}`)
      : (builder as UpdateBuilder).eq(workspaceColumn, ctx.workspaceId)
  ) as Promise<{
    error: null | { message: string }
  }>

  const { error: updateError } = await final

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  // 2. 雙軌：同步寫 audit log（不擋主流程）
  await recordAudit(supabase as never, ctx, {
    action: 'soft_delete',
    entityType: payload.table,
    entityId: payload.id,
    before: payload.before,
    reason: payload.reason,
  })

  return { ok: true }
}

export async function restoreSoftDeleted(
  supabase: SupabaseLike,
  ctx: SoftDeleteContext,
  payload: { table: string; id: string; workspaceColumn?: string }
): Promise<OperationResult> {
  const ctxErr = validateContext(ctx)
  if (ctxErr) return { ok: false, error: ctxErr }
  const payloadErr = validatePayload(payload)
  if (payloadErr) return { ok: false, error: payloadErr }

  const workspaceColumn = payload.workspaceColumn ?? 'workspace_id'

  // 1. UPDATE 把 deleted_* 都清掉
  const builder = supabase
    .from(payload.table)
    .update!({
      is_active: true,
      deleted_at: null,
      deleted_by: null,
      deleted_reason: null,
    })
    .eq('id', payload.id) as UpdateBuilder

  const final = (builder as UpdateBuilder).eq(workspaceColumn, ctx.workspaceId) as Promise<{
    error: null | { message: string }
  }>

  const { error: updateError } = await final

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  // 2. 雙軌：寫 restore audit
  await recordAudit(supabase as never, ctx, {
    action: 'restore',
    entityType: payload.table,
    entityId: payload.id,
  })

  return { ok: true }
}
