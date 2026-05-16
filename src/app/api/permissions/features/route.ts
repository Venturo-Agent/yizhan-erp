import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getApiContext } from '@/lib/auth/get-api-context'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

// 只有有 workspaces.write 的人才能動任何 workspace 的 features。
// 同 pattern 於 src/app/api/tenants/create/route.ts。
async function requireTenantAdmin(): Promise<
  { ok: true; workspaceId: string } | { ok: false; response: NextResponse }
> {
  const ctx = await getApiContext({ capabilityCode: 'workspaces.write' })
  if (!ctx.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: ctx.status === 401 ? '請先登入' : '無權限操作' },
        { status: ctx.status },
      ),
    }
  }
  return { ok: true, workspaceId: ctx.workspace_id }
}

/**
 * GET /api/permissions/features
 * 取得當前租戶的功能權限
 *
 * 特殊：可傳 workspace_id 查詢其他租戶（需「租戶管理」權限）
 */
export const GET = apiHandler(async (request: NextRequest) => {
  // 2026-05-15 fix: 改 WORKSPACES_READ。原本 HR_READ_ROLES 跟 module 領域不對齊、
  // 導致存 workspace_features 成功（PUT 用 workspaces.write）但 GET 401（缺 hr.read_roles）、
  // 使用者看到「存了重整就消失」。讀寫 capability 應對稱、同 module 領域內。
  const guard = await requireCapability(CAPABILITIES.WORKSPACES_READ)
  if (!guard.ok) return guard.response
  const queryWorkspaceId = request.nextUrl.searchParams.get('workspace_id')

  // 如果指定了 workspace_id：需要租戶管理權限才能跨租戶查
  if (queryWorkspaceId) {
    const gate = await requireTenantAdmin()
    if (!gate.ok) return gate.response

    const serviceSupabase = getSupabaseAdminClient()
    const { data, error } = await serviceSupabase
      .from('workspace_features')
      .select('feature_code, enabled')
      .eq('workspace_id', queryWorkspaceId)

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
    }
    return NextResponse.json(data)
  }

  // 否則取得當前租戶的功能（RLS 自動過濾）
  const supabase = await createApiClient()
  const { data, error } = await supabase.from('workspace_features').select('feature_code, enabled')

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json(data)
})

/**
 * PUT /api/permissions/features
 * 更新租戶的功能權限（覆蓋式）
 *
 * 僅限「租戶管理」權限持有者（Corner admin / 類似角色）。
 */
export const PUT = apiHandler(async (request: NextRequest) => {
  const gate = await requireTenantAdmin()
  if (!gate.ok) return gate.response

  const ctx = await getApiContext({ capabilityCode: 'workspaces.write' })
  const supabaseForAudit = await createApiClient()
  if (ctx.ok) {
    await recordApiAuditContext(supabaseForAudit, { actorId: ctx.employee_id, reason: '更新租戶功能開關' })
  }

  const body = await request.json()
  const { workspace_id, features, premium_enabled } = body

  const targetWorkspaceId: string | undefined = workspace_id ?? gate.workspaceId

  if (!targetWorkspaceId || !Array.isArray(features)) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const serviceSupabase = getSupabaseAdminClient()

  // 1. 更新付費大開關
  if (typeof premium_enabled === 'boolean') {
    const { error: wsError } = await serviceSupabase
      .from('workspaces')
      .update({ premium_enabled })
      .eq('id', targetWorkspaceId)

    if (wsError) {
      const t = translateDbError(wsError)
      return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
    }
  }

  // 2. Upsert 所有功能小開關
  // 2026-05-15 fix: dedupe by feature_code、防 client 端送重複 row（譬如 sub-feature 重複）
  // 害 PostgreSQL「ON CONFLICT DO UPDATE command cannot affect row a second time」500。
  const seen = new Set<string>()
  const dedupedFeatures: { feature_code: string; enabled: boolean }[] = []
  for (const f of features as { feature_code: string; enabled: boolean }[]) {
    if (seen.has(f.feature_code)) continue
    seen.add(f.feature_code)
    dedupedFeatures.push(f)
  }
  const upsertData = dedupedFeatures.map(f => ({
    workspace_id: targetWorkspaceId,
    feature_code: f.feature_code,
    enabled: f.enabled,
    enabled_at: f.enabled ? new Date().toISOString() : null,
  }))

  const { error } = await serviceSupabase
    .from('workspace_features')
    .upsert(upsertData, { onConflict: 'workspace_id,feature_code' })

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ success: true })
})
