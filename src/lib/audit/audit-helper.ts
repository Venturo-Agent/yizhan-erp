/**
 * audit-helper — API route 呼叫端薄包裝
 *
 * setAuditContext 的 SupabaseLike 介面比實際 SupabaseClient 窄
 * （rpc 回傳型別不同）。此包裝讓 API route 可以直接傳 SupabaseClient
 * 而不需要在每個呼叫點做 cast。
 *
 * ⚠️ 不要修改 set-audit-context.ts 本身（security-fixer 配好的）。
 */

import { setAuditContext } from '@/lib/audit/set-audit-context'

interface AuditPayload {
  actorId: string
  reason?: string
  requestId?: string
}

/**
 * 為 API route 設定 audit context。
 * 靜默失敗（不阻斷業務流程）。
 *
 * 傳入任何 Supabase client instance（server / api-client 均可）。
 */
export async function recordApiAuditContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payload: AuditPayload
): Promise<void> {
  if (!payload.actorId) return
  // setAuditContext 內部已有 error handling；這裡只是確保不拋例外
  try {
    await setAuditContext(supabase, payload)
  } catch {
    // 靜默失敗：audit context 失敗不阻斷業務
  }
}
