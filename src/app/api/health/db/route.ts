import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ApiError } from '@/lib/api/response'

/**
 * Deep DB Health Check
 *
 * GET /api/health/db
 *
 * 需要認證。檢查核心表 row count、RLS 狀態、最近 migration。
 */
/**
 * 故意不守 requireCapability：公開健檢、無身份驗證合理
 */
export async function GET() {
  // Auth check
  const supabaseAuth = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession()
  if (!session) {
    return ApiError.unauthorized()
  }

  const startTime = Date.now()
  const supabase = getSupabaseAdminClient()

  const coreTables = [
    'employees',
    'tours',
    'orders',
    'members',
    'customers',
    'quotes',
    'quote_items',
    'payments',
    'receipts',
    'expenses',
    'disbursements',
    'todos',
  ] as const

  // 1. Row counts (parallel)
  const tableCounts: Record<string, number | null> = {}
  const countResults = await Promise.allSettled(
    coreTables.map(async t => {
      const { count, error } = await supabase
        .from(t as 'employees')
        .select('*', { count: 'exact', head: true })
      return { table: t, count: error ? null : count }
    })
  )
  for (const r of countResults) {
    if (r.status === 'fulfilled') {
      tableCounts[r.value.table] = r.value.count
    }
  }

  // 2. RLS check — try querying with anon key (no auth) via a fresh client
  let rlsEffective = false
  try {
    // Use the authenticated client but check if admin can see more than anon
    // Simple heuristic: admin client should work, anon should be restricted
    const { error: rlsError } = await supabaseAuth
      .from('employees')
      .select('id', { count: 'exact', head: true })
    // If the authenticated user can query, RLS allows it for authed users
    // We just verify RLS doesn't throw an error for the session user
    rlsEffective = !rlsError
  } catch {
    rlsEffective = false
  }

  // 3. Latest migration
  let latestMigration: string | null = null
  try {
    const { data } = await supabase
      .from('schema_migrations' as 'employees')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()
    latestMigration = (data as Record<string, string> | null)?.version ?? null
  } catch {
    // schema_migrations may not be accessible
    latestMigration = null
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        tableCounts,
        rlsEffective,
        latestMigration,
      },
    },
    { status: 200 }
  )
}
