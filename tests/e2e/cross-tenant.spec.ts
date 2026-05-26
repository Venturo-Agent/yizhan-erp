/**
 * 跨租戶滲透測試（B12）
 *
 * 目的：驗證紅線 A — 多租戶資料隔離
 *   workspace A 員工不能讀 / 寫 / 改 / 刪 workspace B 的資料。
 *
 * 雙重保險：
 *   - RLS（DB 層）：policies 用 `has_capability_for_workspace()` + workspace_id 比對
 *   - 應用層守門：API route 用 `require-capability` + workspace scope
 *
 * 漏一個 = 客戶資料外洩 = 商業終結（CLAUDE.md 優先順位 #1）
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 跑法（要兩個真實 workspace 各一個員工帳號 + email/password）：
 *
 *   export NEXT_PUBLIC_SUPABASE_URL=...
 *   export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *
 *   # workspace A（例：TESTUX）
 *   export TEST_WS_A_CODE=TESTUX
 *   export TEST_WS_A_ID=...
 *   export TEST_WS_A_EMAIL=e001@testux.local
 *   export TEST_WS_A_PASSWORD=00000000
 *
 *   # workspace B（例：御風旅行社 / DEMO）
 *   export TEST_WS_B_CODE=DEMO
 *   export TEST_WS_B_ID=d710436e-535e-4618-99a4-71bdd26ddc9f
 *   export TEST_WS_B_EMAIL=demo@gmail.com
 *   export TEST_WS_B_PASSWORD=00000000
 *
 *   npx playwright test cross-tenant
 *
 * 未設環境變數時整套 skip（不擋 CI）。
 *
 * 詳細 setup 步驟：見 tests/cross-tenant.README.md
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const WS_A = {
  code: process.env.TEST_WS_A_CODE || '',
  id: process.env.TEST_WS_A_ID || '',
  email: process.env.TEST_WS_A_EMAIL || '',
  password: process.env.TEST_WS_A_PASSWORD || '',
}
const WS_B = {
  code: process.env.TEST_WS_B_CODE || '',
  id: process.env.TEST_WS_B_ID || '',
  email: process.env.TEST_WS_B_EMAIL || '',
  password: process.env.TEST_WS_B_PASSWORD || '',
}

const HAS_ENV =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  Boolean(SERVICE_ROLE_KEY) &&
  Boolean(WS_A.email) &&
  Boolean(WS_A.password) &&
  Boolean(WS_A.id) &&
  Boolean(WS_B.email) &&
  Boolean(WS_B.password) &&
  Boolean(WS_B.id)

// 涵蓋的多租戶 entity 表
const ENTITY_TABLES = [
  'customers',
  'suppliers',
  'contracts',
  'tours',
  'orders',
  'payment_requests',
  'receipts',
  'disbursement_orders',
] as const

type EntityTable = (typeof ENTITY_TABLES)[number]

/**
 * 用 user email + password 登入、回 user session client
 *
 * 不走 next API（validate-login）、直接打 Supabase Auth。
 * 因為這層測試是「測 RLS」、不是「測 next API 流程」。
 */
async function loginAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`signIn failed for ${email}: ${error.message}`)
  }
  if (!data.session) {
    throw new Error(`signIn returned no session for ${email}`)
  }
  return client
}

/**
 * Service-role admin（給 setup / teardown 用、不走 RLS）
 */
function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

test.describe('Cross-tenant 資料隔離（RLS + 應用層雙重 enforcement）', () => {
  test.skip(!HAS_ENV, '需 cross-tenant 兩組 workspace 帳號、見 tests/cross-tenant.README.md')

  let clientA: SupabaseClient
  let clientB: SupabaseClient

  test.beforeAll(async () => {
    if (!HAS_ENV) return
    clientA = await loginAs(WS_A.email, WS_A.password)
    clientB = await loginAs(WS_B.email, WS_B.password)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SELECT：A 員工 SELECT B workspace_id 的資料 → 應該回 0 筆（RLS 擋）
  // ─────────────────────────────────────────────────────────────────────────
  for (const table of ENTITY_TABLES) {
    test(`SELECT /${table} as A user where workspace_id = B → 0 筆`, async () => {
      const { data, error } = await clientA
        .from(table)
        .select('id, workspace_id')
        .eq('workspace_id', WS_B.id)
        .limit(5)

      // 兩種正確結果：
      //   (a) RLS 過濾後 data 為空陣列、無 error
      //   (b) RLS 拋 permission denied、有 error
      // 不能有「拿到 B 的 row」這種情況
      if (error) {
        expect(error.message).toMatch(/permission|policy|denied|forbidden/i)
      } else {
        expect(data).toEqual([])
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST：A 員工 SELECT 全部、不能 leak B 的 row
  // ─────────────────────────────────────────────────────────────────────────
  for (const table of ENTITY_TABLES) {
    test(`LIST /${table} as A user → 不含 B workspace 的 row`, async () => {
      const { data, error } = await clientA.from(table).select('id, workspace_id').limit(100)

      if (error) {
        // table 不存在 / 權限被擋、都算 pass（沒 leak）
        expect(error.message).toMatch(/permission|policy|denied|forbidden|relation/i)
        return
      }

      const leaked = (data || []).filter(
        row => (row as { workspace_id?: string }).workspace_id === WS_B.id
      )
      expect(
        leaked.length,
        `A 員工 list ${table} 拿到 ${leaked.length} 筆 B 的資料、RLS 漏了`
      ).toBe(0)
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INSERT：A 員工帶 workspace_id = B → 應該被擋
  //
  // 兩種正確結果：
  //   (a) WITH CHECK policy 擋 → error
  //   (b) trigger 改寫 workspace_id 成 A → row 進去但 workspace_id != B
  //
  // 不能：帶 workspace_id = B 的 row 真的進 B 那邊
  // ─────────────────────────────────────────────────────────────────────────
  test('INSERT customers as A user with workspace_id = B → 擋或重寫', async () => {
    const { data, error } = await clientA
      .from('customers')
      .insert({
        workspace_id: WS_B.id,
        name: `Cross-tenant test ${Date.now()}`,
        // 其他欄位用 default
      })
      .select('id, workspace_id')
      .single()

    if (error) {
      // RLS / trigger / FK 擋下、合格
      expect(error.message).toMatch(/permission|policy|denied|workspace|forbidden/i)
      return
    }

    // 若 row 真的進去、確認 workspace_id 不是 B
    // （某些 trigger 設計會把 workspace_id 強制改成 user 自己的 workspace）
    const row = data as { id: string; workspace_id: string } | null
    expect(row?.workspace_id, '不能讓 A 員工 INSERT row 進 B workspace').not.toBe(WS_B.id)

    // 清掉測試殘留
    if (row?.id) {
      await adminClient().from('customers').delete().eq('id', row.id)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE：A 員工 update B 的 row id → 應該 0 row affected
  // ─────────────────────────────────────────────────────────────────────────
  test('UPDATE B 的 customers row as A user → 0 row affected', async () => {
    // 用 admin 先抓 B 的一筆 customer id
    const { data: bRows } = await adminClient()
      .from('customers')
      .select('id, name')
      .eq('workspace_id', WS_B.id)
      .limit(1)

    if (!bRows || bRows.length === 0) {
      test.skip(true, `workspace B 沒有 customer 可測 UPDATE 攻擊`)
      return
    }

    const targetId = (bRows[0] as { id: string }).id
    const originalName = (bRows[0] as { name: string }).name

    const { data, error } = await clientA
      .from('customers')
      .update({ name: `HACKED_BY_A_${Date.now()}` })
      .eq('id', targetId)
      .select('id, name')

    if (error) {
      // RLS 直接擋 update、合格
      expect(error.message).toMatch(/permission|policy|denied|forbidden/i)
    } else {
      // 沒 error 但 update count 應該是 0（RLS 過濾後 no rows match）
      expect(data?.length, 'A 員工不該能 update B 的 row').toBe(0)
    }

    // 二次驗證：用 admin re-read、name 應該還是 original
    const { data: postCheck } = await adminClient()
      .from('customers')
      .select('name')
      .eq('id', targetId)
      .single()
    expect((postCheck as { name: string } | null)?.name).toBe(originalName)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE：A 員工 delete B 的 row id → 應該 0 row affected
  // ─────────────────────────────────────────────────────────────────────────
  test('DELETE B 的 customers row as A user → 0 row affected', async () => {
    const { data: bRows } = await adminClient()
      .from('customers')
      .select('id')
      .eq('workspace_id', WS_B.id)
      .limit(1)

    if (!bRows || bRows.length === 0) {
      test.skip(true, `workspace B 沒有 customer 可測 DELETE 攻擊`)
      return
    }

    const targetId = (bRows[0] as { id: string }).id

    const { data, error } = await clientA.from('customers').delete().eq('id', targetId).select('id')

    if (error) {
      expect(error.message).toMatch(/permission|policy|denied|forbidden/i)
    } else {
      expect(data?.length, 'A 員工不該能 delete B 的 row').toBe(0)
    }

    // 二次驗證：row 還在
    const { data: postCheck } = await adminClient()
      .from('customers')
      .select('id')
      .eq('id', targetId)
      .single()
    expect((postCheck as { id: string } | null)?.id).toBe(targetId)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 應用層守門：next API route 用 A 的 session 帶 workspace_id = B 的 query
  // ─────────────────────────────────────────────────────────────────────────
  test('GET /api/customers?workspace_id=B as A user → 應用層擋（不能 leak B）', async () => {
    // 從 A session 拿 access_token
    const {
      data: { session },
    } = await clientA.auth.getSession()
    const token = session?.access_token
    expect(token, 'A user session missing access_token').toBeTruthy()

    const res = await fetch(`http://localhost:3000/api/customers?workspace_id=${WS_B.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // 預期結果：
    //   (a) 403 / 401 / 400（應用層守門擋）
    //   (b) 200 + data 是空 / 是 A 的（API 強制改 workspace 為 self）
    // 不能：200 + 拿到 B 的 row
    if (res.status >= 400) {
      expect(res.status).toBeGreaterThanOrEqual(400)
      return
    }

    const json = (await res.json()) as {
      data?: Array<{ workspace_id: string }>
      customers?: Array<{ workspace_id: string }>
    }
    const rows = json.data || json.customers || []
    const leaked = rows.filter(r => r.workspace_id === WS_B.id)
    expect(leaked.length, '應用層守門漏了、B 的 row 跑進回應').toBe(0)
  })
})
