/**
 * 並發測試共用 helper
 *
 * 用 service_role 直連、繞 RLS、純壓 RPC + DB constraints。
 * 目的：上線前驗證「10 個分頁同時按存 → 不會撞同編號」。
 *
 * Why service_role：
 *   並發測試是壓 RPC + advisory lock + DB unique constraint、跟 RLS 無關。
 *   走 service_role 省去登入流程、能在 sandbox workspace 隨意 INSERT / DELETE。
 *
 * Why dedicated test workspace：
 *   要塞 10 筆又清掉、不能污染 production / demo workspace。
 *   每個 test file 開始建 sandbox workspace、結束 truncate 相關 rows。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function hasServiceRoleKey(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)
}

export function makeAdminClient(): SupabaseClient {
  if (!hasServiceRoleKey()) {
    throw new Error(
      'concurrency 測試需 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY、' +
        '請 source ~/.config/venturo/secrets.env 後跑'
    )
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  })
}

/**
 * 建一個 sandbox workspace、回傳 id
 *
 * 命名用 `CONCURRENCY-{ts}-{rand}`、避免重複測試殘留撞 unique constraint。
 * 不開 features、不 seed 任何 capability — 並發測試只壓 RPC、不走應用層。
 */
export async function createSandboxWorkspace(
  admin: SupabaseClient,
  prefix = 'CONCURRENCY'
): Promise<{ id: string; code: string }> {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  const code = `${prefix}-${ts}-${rand}`.slice(0, 32)

  const { data, error } = await admin
    .from('workspaces')
    .insert({
      code,
      name: `Concurrency sandbox ${ts}`,
      // 補必要欄位：依現有 workspaces schema、code / name 通常足夠
      // 若 schema 之後變動、這裡可能要加欄
    })
    .select('id, code')
    .single()

  if (error) {
    throw new Error(`createSandboxWorkspace failed: ${error.message}`)
  }
  return { id: (data as { id: string }).id, code: (data as { code: string }).code }
}

/**
 * 清掉 sandbox workspace + 所有依賴 rows
 *
 * 順序：
 *   1. 砍依該 workspace 的 child entities（employees / suppliers / orders / chart_of_accounts）
 *   2. 砍 workspace 本體
 *
 * 失敗也不擋（測試結束都要清、寧可警告不要爆）。
 */
export async function teardownSandboxWorkspace(
  admin: SupabaseClient,
  workspaceId: string
): Promise<void> {
  const tablesToClean = [
    'employees',
    'suppliers',
    'orders',
    'chart_of_accounts',
    'tours',
    // workspace_features / workspace_roles 通常有 FK ON DELETE CASCADE、跳過
  ]
  for (const table of tablesToClean) {
    const { error } = await admin.from(table).delete().eq('workspace_id', workspaceId)
    if (error) {
      // 不擋、可能是某表沒這 column 或 cascade、log 一下
      console.warn(`teardown: clean ${table} failed (ignored): ${error.message}`)
    }
  }

  const { error: wsError } = await admin.from('workspaces').delete().eq('id', workspaceId)
  if (wsError) {
    console.warn(`teardown: delete workspace failed (ignored): ${wsError.message}`)
  }
}
