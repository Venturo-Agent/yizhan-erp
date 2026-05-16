/**
 * Admin 登入 + 權限守門測試
 *
 * 2026-05-01 重寫：
 *   - 舊版測 validate-login 回傳的 isAdmin / permissions（已從 API 移除）
 *   - 新版改測 role_capabilities 表本身：admin role 應該有 platform.is_admin
 *     + 全部 MODULES × tabs 的 read/write capability codes。
 *   - validate-login 端只剩 success / employee 驗證、權限決策不再經由它。
 */

import { test, expect } from './fixtures/auth.fixture'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const REQUIRED_CAPABILITY_CODES = [
  'platform.is_admin',
  'tours.overview.read',
  'tours.orders.read',
  'tours.itinerary.read',
  'finance.payments.read',
  'finance.requests.read',
  'hr.employees.read',
  'hr.roles.read',
  'hr.roles.write',
  'database.customers.read',
  'settings.company.read',
]

async function loginAsAdmin() {
  // 登入欄位 2026-05-11 改 Email、validateLoginSchema 只認 email
  const email = process.env.TEST_EMAIL || ''
  const password = process.env.TEST_PASSWORD || 'testux1234'
  const res = await fetch('http://localhost:3000/api/auth/validate-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, code: 'TESTUX' }),
  })
  return res.json() as Promise<{
    success: boolean
    data?: { employee?: { employee_number?: string } }
  }>
}

test.describe('Admin 登入 + 權限守門', () => {
  test('TESTUX admin 登入成功', async () => {
    test.skip(!process.env.TEST_EMAIL, '需 TEST_EMAIL（TESTUX admin email）、跳過')
    const body = await loginAsAdmin()
    expect(body.success).toBe(true)
    expect(body.data?.employee?.employee_number).toBe('E001')
  })

  test('admin role 在 role_capabilities 有完整資格', async () => {
    test.skip(!SERVICE_KEY, '未設 SUPABASE_SERVICE_ROLE_KEY、跳過 DB 直查')

    // 找 TESTUX workspace 的 admin role
    const wsRes = await fetch(`${SUPABASE_URL}/rest/v1/workspaces?code=eq.TESTUX&select=id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const wsList = (await wsRes.json()) as { id: string }[]
    expect(wsList.length).toBeGreaterThan(0)
    const workspaceId = wsList[0].id

    const roleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/workspace_roles?workspace_id=eq.${workspaceId}&is_admin=eq.true&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const roleList = (await roleRes.json()) as { id: string }[]
    expect(roleList.length).toBeGreaterThan(0)
    const adminRoleId = roleList[0].id

    const capRes = await fetch(
      `${SUPABASE_URL}/rest/v1/role_capabilities?role_id=eq.${adminRoleId}&enabled=eq.true&select=capability_code`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const caps = (await capRes.json()) as { capability_code: string }[]
    const codes = new Set(caps.map(c => c.capability_code))

    // 必須有 platform.is_admin + 抽樣的關鍵 capabilities
    for (const code of REQUIRED_CAPABILITY_CODES) {
      expect(
        codes.has(code),
        `admin role 缺 capability "${code}"。檢查：
        (a) seed migration 20260501110000 跑了嗎？
        (b) backfill migration 20260501100000 跑了嗎？
        (c) 該 capability 是否定義在 module-tabs.ts？`
      ).toBe(true)
    }

    // admin 應該至少有 ~140 個 capability（read+write × 各 module/tab）
    expect(codes.size).toBeGreaterThan(40)
  })
})
