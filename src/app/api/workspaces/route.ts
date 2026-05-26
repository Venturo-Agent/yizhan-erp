import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * GET /api/workspaces
 * 取得所有租戶
 *
 * 守門邏輯（William 2026-05-10 拍板「沒有平台方」鐵律）：
 *   - 系統內沒有 platform_owner / agency 之分、所有 workspace 平等
 *   - 跨 workspace 能力靠 workspace_features 控制：caller workspace 開了 tenants feature → 能列
 *   - 漫途 workspace 開 tenants feature → 漫途能管所有租戶；別的 workspace 沒開 → 403
 *   - 不准用 workspaces.type 當守門條件
 *   - DB 重建後加第二道 role_capabilities gate（workspaces.read）
 */
export const GET = apiHandler(async () => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()

  // 守門：caller workspace 是否開了 tenants feature
  const { data: feature, error: featureError } = await supabase
    .from('workspace_features')
    .select('enabled')
    .eq('workspace_id', auth.data.workspaceId)
    .eq('feature_code', 'workspaces')
    .eq('enabled', true)
    .maybeSingle()

  if (featureError) {
    logger.error('[/api/workspaces GET] feature lookup error:', featureError)
    const t = translateDbError(featureError)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
  if (!feature) {
    return NextResponse.json({ error: '無權限（此 workspace 未啟用租戶管理）' }, { status: 403 })
  }

  // 守門通過 → 用 admin client 查全部 workspaces（跨 workspace 列表）
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  // 取得所有擁有管理員資格的職務 id
  // 跨租戶查所有 admin role IDs、跟下方所有員工比對
  // 上方已驗證 caller workspace 開了 tenants feature
  const { data: adminRoles } = await supabase
    .from('workspace_roles')
    .select('id')
    .eq('is_admin', true)
  const adminRoleIds = new Set((adminRoles || []).map(r => r.id))

  // 批次查詢所有員工 — 用來計算每個 workspace 的員工數 + 找代表
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, workspace_id, chinese_name, display_name, english_name, role_id')

  // 建立 workspace_id → 員工清單的 map
  const byWorkspace = new Map<
    string,
    {
      count: number
      admin: { name: string; id: string } | null
    }
  >()
  for (const emp of (allEmployees || []) as Array<{
    id: string
    workspace_id: string
    chinese_name: string | null
    display_name: string | null
    english_name: string | null
    role_id: string | null
  }>) {
    const wsId = emp.workspace_id
    if (!wsId) continue
    const entry = byWorkspace.get(wsId) || { count: 0, admin: null }
    entry.count += 1
    // 找第一個擁有管理員資格的員工當代表（SSOT：workspace_roles.is_admin）
    if (!entry.admin && emp.role_id && adminRoleIds.has(emp.role_id)) {
      entry.admin = {
        id: emp.id,
        name: emp.display_name || emp.chinese_name || emp.english_name || '',
      }
    }
    byWorkspace.set(wsId, entry)
  }

  // 附加到每個 workspace
  const enriched = (workspaces || []).map(ws => {
    const entry = byWorkspace.get(ws.id)
    return {
      ...ws,
      employee_count: entry?.count ?? 0,
      admin_name: entry?.admin?.name ?? null,
      admin_id: entry?.admin?.id ?? null,
    }
  })

  return NextResponse.json(enriched)
})
