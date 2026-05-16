/**
 * API Route 專用 session context（仿 venturo-app `get_api_context`）
 *
 * React.cache 對 API route 不適用（每個 request 都是獨立執行 context）、
 * 所以這裡每次 call 都會重打 DB。但合併「workspace + capability + feature」
 * 三道 check 為單一 helper、避免 caller 各自重複寫。
 *
 * 用法：
 *   const ctx = await getApiContext('workspaces.write')
 *   if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
 *   const { workspace_id, employee_id, capabilities } = ctx
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type ApiContextResult =
  | {
      ok: true
      status: 200
      user_id: string
      employee_id: string
      workspace_id: string
      role_id: string | null
      capabilities: Set<string>
    }
  | {
      ok: false
      status: 401 | 403
      error: string
      // 失敗時也提供已查到的部分資料（可能為 null）以利除錯 / 後續邏輯
      user_id?: string
      employee_id?: string
      workspace_id?: string
      capabilities?: Set<string>
    }

interface GetApiContextOptions {
  /**
   * 必要 capability code（如 'tours.read'、'finance.payments.write'）
   * 若提供、context 內會檢查；缺則回 403
   */
  capabilityCode?: string

  /**
   * 必要 feature code（如 'fleet'、'esims'）
   * 若提供、會檢查 workspace_features；功能未開啟回 403
   */
  featureCode?: string
}

/**
 * 取得 API route 用的 session context
 *
 * 一次完成：
 *   1. auth.getUser() — 401 if not logged in
 *   2. employees + role_capabilities + workspace_features — 1 個 user round-trip + 1 parallel
 *   3. capability / feature gate（可選）
 */
export async function getApiContext(
  options: GetApiContextOptions = {},
): Promise<ApiContextResult> {
  const { capabilityCode, featureCode } = options

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, error: '請先登入' }
  }

  const admin = getSupabaseAdminClient()

  // 一次抓 employee（含 role_id、workspace_id）
  const { data: employees } = await admin
    .from('employees')
    .select('id, role_id, workspace_id, status')
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .limit(1)

  const employee = employees?.[0]

  if (!employee || !employee.workspace_id) {
    return {
      ok: false,
      status: 403,
      error: '找不到員工或工作空間',
      user_id: user.id,
    }
  }

  if (employee.status === 'terminated') {
    return {
      ok: false,
      status: 403,
      error: '帳號已停用',
      user_id: user.id,
      employee_id: employee.id,
      workspace_id: employee.workspace_id,
    }
  }

  // 同時抓 capabilities 跟 feature flag（如果有要 check）
  const [capsRes, featRes] = await Promise.all([
    employee.role_id
      ? admin
          .from('role_capabilities')
          .select('capability_code')
          .eq('role_id', employee.role_id)
          .eq('enabled', true)
      : Promise.resolve({ data: [] as { capability_code: string }[] | null }),
    featureCode
      ? admin
          .from('workspace_features')
          .select('enabled')
          .eq('workspace_id', employee.workspace_id)
          .eq('feature_code', featureCode)
          .maybeSingle()
      : Promise.resolve({ data: null as { enabled: boolean | null } | null }),
  ])

  const capabilities = new Set((capsRes.data ?? []).map((c) => c.capability_code))

  // Feature gate
  if (featureCode && !featRes.data?.enabled) {
    return {
      ok: false,
      status: 403,
      error: `功能未啟用：${featureCode}`,
      user_id: user.id,
      employee_id: employee.id,
      workspace_id: employee.workspace_id,
      capabilities,
    }
  }

  // Capability gate
  if (capabilityCode && !capabilities.has(capabilityCode)) {
    return {
      ok: false,
      status: 403,
      error: `無權限：${capabilityCode}`,
      user_id: user.id,
      employee_id: employee.id,
      workspace_id: employee.workspace_id,
      capabilities,
    }
  }

  return {
    ok: true,
    status: 200,
    user_id: user.id,
    employee_id: employee.id,
    workspace_id: employee.workspace_id,
    role_id: employee.role_id ?? null,
    capabilities,
  }
}
