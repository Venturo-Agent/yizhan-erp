/**
 * Server-side session context loader (仿 venturo-app `get_layout_context`)
 *
 * 一次抓 user / employee / workspace / capabilities / features，整個 RSC render
 * 共用同一份結果（透過 React.cache）。
 *
 * 設計原則：
 *   - 1 次 auth.getUser()
 *   - 1 次 employee + workspace（parallel 在同一 Promise.all）
 *   - 1 次 role_capabilities + workspace_features（parallel）
 *   = 3 次 round-trip 上限（符合 VENTURO_STANDARDS Section 3）
 *
 * Cache 範圍：單一 RSC request。React.cache 對 client / API route 不適用、
 *   client 走 useLayoutContext、API route 走 getApiContext。
 */

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type EmployeeRow = Database['public']['Tables']['employees']['Row']
type WorkspaceRow = Database['public']['Tables']['workspaces']['Row']

export interface LayoutContext {
  user: User | null
  employee: Pick<
    EmployeeRow,
    'id' | 'employee_number' | 'display_name' | 'english_name' | 'role_id' | 'workspace_id' | 'status'
  > | null
  workspace: Pick<
    WorkspaceRow,
    | 'id'
    | 'code'
    | 'name'
    | 'is_active'
    | 'premium_enabled'
    | 'default_billing_day_of_week'
  > | null
  workspace_id: string | null
  role_id: string | null
  capabilities: Set<string>
  features: Set<string>
  premium_enabled: boolean
}

const EMPTY_CONTEXT: LayoutContext = {
  user: null,
  employee: null,
  workspace: null,
  workspace_id: null,
  role_id: null,
  capabilities: new Set(),
  features: new Set(),
  premium_enabled: false,
}

/**
 * 主 cached function — 一個 RSC request 內多次呼叫只會跑一次 DB
 *
 * 失敗（未登入 / 找不到員工 / 找不到 workspace）一律回 EMPTY_CONTEXT、不 throw
 */
export const getLayoutContext = cache(async (): Promise<LayoutContext> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return EMPTY_CONTEXT

  const admin = getSupabaseAdminClient()

  // 讀 cookie 標的「當前 workspace」（validate-login 登入時寫的）
  // user 在多 workspace 都有 employee（如 William 在 Corner 跟 VENTURO 各一筆）、要靠 cookie 區分
  const cookieStore = await cookies()
  const currentWorkspaceId = cookieStore.get('venturo-workspace-id')?.value

  // Round-trip 2: employee（用 user_id 對 auth.uid() 篩、E1 後 user_id 已對齊）
  // 兼容 Pattern A 舊資料：employee.id = auth.uid()
  let employeeQuery = admin
    .from('employees')
    .select('id, employee_number, display_name, english_name, role_id, workspace_id, status')
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)

  // 有 cookie 的 workspace_id 就嚴格篩、避免抓到別的 workspace 的 employee
  if (currentWorkspaceId) {
    employeeQuery = employeeQuery.eq('workspace_id', currentWorkspaceId)
  }

  const { data: employees } = await employeeQuery.limit(1)

  const employee = employees?.[0]

  if (!employee || !employee.workspace_id) {
    return { ...EMPTY_CONTEXT, user }
  }

  // Round-trip 3: workspace + features + capabilities (parallel)
  const [wsRes, featuresRes, capsRes] = await Promise.all([
    admin
      .from('workspaces')
      .select('id, code, name, is_active, premium_enabled, default_billing_day_of_week')
      .eq('id', employee.workspace_id)
      .maybeSingle(),
    admin
      .from('workspace_features')
      .select('feature_code, enabled')
      .eq('workspace_id', employee.workspace_id),
    employee.role_id
      ? admin
          .from('role_capabilities')
          .select('capability_code, enabled')
          .eq('role_id', employee.role_id)
          .eq('enabled', true)
      : Promise.resolve({ data: [] as { capability_code: string; enabled: boolean }[] | null }),
  ])

  const workspace = wsRes.data ?? null

  const features = new Set(
    (featuresRes.data ?? [])
      .filter((f): f is { feature_code: string; enabled: boolean } => !!f.enabled)
      .map((f) => f.feature_code),
  )

  const capabilities = new Set(
    (capsRes.data ?? []).filter((c) => c.enabled).map((c) => c.capability_code),
  )

  return {
    user,
    employee,
    workspace,
    workspace_id: employee.workspace_id,
    role_id: employee.role_id ?? null,
    capabilities,
    features,
    premium_enabled: workspace?.premium_enabled ?? false,
  }
})

/**
 * Page-level auth context（薄包裝、零額外 query）
 */
export const getAuthContext = cache(
  async (): Promise<{ user_id: string; workspace_id: string; employee_id: string } | null> => {
    const ctx = await getLayoutContext()
    if (!ctx.user || !ctx.workspace_id || !ctx.employee) return null
    return {
      user_id: ctx.user.id,
      workspace_id: ctx.workspace_id,
      employee_id: ctx.employee.id,
    }
  },
)

/**
 * Page-level capability check（從 cache 讀、零額外 query）
 */
export const getPageCapabilities = cache(
  async (codes: readonly string[]): Promise<Record<string, boolean>> => {
    const result: Record<string, boolean> = Object.fromEntries(codes.map((c) => [c, false]))
    if (codes.length === 0) return result

    const ctx = await getLayoutContext()
    for (const code of codes) {
      result[code] = ctx.capabilities.has(code)
    }
    return result
  },
)
