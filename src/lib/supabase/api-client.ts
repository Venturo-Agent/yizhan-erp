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
 * 取得當前用戶的 workspace_id
 * 用於需要手動處理的情況
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createApiClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // 從 employees 表取得 workspace_id
  const { data: employee } = await supabase
    .from('employees')
    .select('workspace_id')
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .single()

  if (employee?.workspace_id) {
    return employee.workspace_id
  }

  // 備用：從 user metadata 取得
  return user.user_metadata?.workspace_id || null
}
