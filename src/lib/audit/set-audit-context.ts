/**
 * setAuditContext — 設 PG session 變數、給 audit trigger 抓 actor_id / reason / request_id
 *
 * 配 ADR-0003 / supabase/migrations-pending/003_set_audit_context_function.sql
 *
 * 用法（在做業務 mutation 前 call）：
 *   await setAuditContext(supabase, {
 *     actorId: ctx.employeeId,
 *     reason: '客戶要求取消',
 *     requestId: req.id,
 *   })
 *   // 之後跑業務 query、trigger 自動抓這些 setting 寫進 audit_logs
 *
 * ⚠️ 限制（待 D+1 驗證）：
 *   - Supabase JS SDK 的 RPC 跟業務 query 各自獨立 HTTP request
 *   - PostgREST connection pool 可能分配到不同連線、setting 不繼承
 *   - 若 production 驗證失敗、改用：
 *     a. Edge Function 包 transaction（PG 端原子操作）
 *     b. Stored procedure 整合 audit set + 業務操作
 *     c. 應用層直接走 recordAudit helper（雙軌主軌）
 *
 * 注意：DB schema 未 apply（function does not exist）時呼叫會 fail — 屬預期
 */

interface SetAuditContextPayload {
  actorId: string
  reason?: string
  requestId?: string
}

interface OperationResult {
  ok: boolean
  error?: string
}

interface SupabaseLike {
  rpc: (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ error: null | { message: string } }>
}

export async function setAuditContext(
  supabase: SupabaseLike,
  payload: SetAuditContextPayload
): Promise<OperationResult> {
  if (!payload.actorId) {
    return { ok: false, error: 'missing actorId' }
  }

  const { error } = await supabase.rpc('set_audit_context', {
    p_actor_id: payload.actorId,
    p_reason: payload.reason ?? null,
    p_request_id: payload.requestId ?? null,
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
