import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * getSupabaseAdminClient
 *
 * 取得 service_role 權限的 Supabase client、用於繞過 RLS 做系統級查詢
 * (e.g. 登入驗證、跨 workspace 管理)
 *
 * **設計決策：每次呼叫建新 client、不使用 singleton**
 *
 * 為什麼不用 singleton？
 *   - Dev 環境 DB schema 改動（RLS policy、FORCE RLS 等）時、
 *     singleton 會拿到過期連線狀態、出現 admin 查不到資料的詭異 bug
 *   - `createClient` 本身很輕、不做實際連線（HTTP fetcher 而已）、
 *     每次建 overhead 可忽略
 *
 * 如果你發現這裡變 bottleneck、請**先量化**再討論加 pool
 * （而不是偷偷加 singleton 回來）。
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
