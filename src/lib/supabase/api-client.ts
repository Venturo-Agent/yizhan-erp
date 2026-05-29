import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * API Route 專用的 Supabase Client
 *
 * 使用方式：
 * const supabase = await createApiClient()
 * const { data } = await supabase.from('tours').select('id, code, name, ...')
 * // 不需要加 .eq('workspace_id', ...) ！
 * // RLS 會自動過濾
 *
 * 如果需要繞過 RLS（例如平台管理操作）：
 * import { getSupabaseAdminClient } from '@/lib/supabase/admin'
 * const supabase = getSupabaseAdminClient()
 */

/**
 * 帶 Session 的 Client（推薦）
 * - RLS 自動生效
 * - 不需要手動加 workspace_id
 */
export async function createApiClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 在 Server Component 中無法設定 cookie，忽略錯誤
          }
        },
      },
    }
  )
}

/**
 * 取得當前用戶的 workspace_id（**server side、API route 專用**）
 *
 * - 從 session cookie 解出 user、再查 employees 反推 workspace_id
 * - **絕對不信任 client 傳的 workspace_id**（紅線 H）
 *
 * client 端取 workspace_id 走 `@/lib/workspace-context` 的 `getCurrentWorkspaceId`（同名但不同實作）。
 * B10 將 server 版改名 `getCurrentWorkspaceIdServer` 避免混淆。
 */
export async function getCurrentWorkspaceIdServer(): Promise<string | null> {
  const supabase = await createApiClient()

  // 本地 JWKS 驗簽（ES256）、省去打外部 GoTrue 的跨國 RTT
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) return null

  // 從 employees 表取得 workspace_id
  const { data: employee } = await supabase
    .from('employees')
    .select('workspace_id')
    .or(`user_id.eq.${claims.sub},id.eq.${claims.sub}`)
    .single()

  if (employee?.workspace_id) {
    return employee.workspace_id
  }

  // 備用：從 user metadata 取得
  return (claims.user_metadata?.workspace_id as string | undefined) || null
}

/**
 * @deprecated B10 收斂：請改用 `getCurrentWorkspaceIdServer`
 * 與 client 版（`@/lib/workspace-context`）同名易混淆、過渡期保留。
 */
export const getCurrentWorkspaceId = getCurrentWorkspaceIdServer
