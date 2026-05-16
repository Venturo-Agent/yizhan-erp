/**
 * Login API 守門測試
 *
 * 防止「找不到此代號」反覆發生（2026-04-20 歷史教訓）：
 *   FORCE RLS + admin singleton 組合讓 service_role 看不到某些 workspace
 *
 * 這個 test 保證 4 個真實 workspace 都能被 login API 找到
 */

import { test, expect } from './fixtures/auth.fixture'

const WORKSPACES = ['CORNER', 'JINGYAO', 'YUFEN', 'TESTUX']

async function callLogin(data: Record<string, string>) {
  const res = await fetch('http://localhost:3000/api/auth/validate-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json() as Promise<{
    success: boolean
    error?: string
    code?: string
    data?: {
      workspaceCode?: string
      employee?: { employee_number?: string }
    }
  }>
}

test.describe('Login API 守門測試', () => {
  for (const code of WORKSPACES) {
    test(`workspace ${code} 能被 validate-login 找到`, async () => {
      const body = await callLogin({
        email: 'nonexistent-user-for-test@example.com',
        password: 'wrong-password',
        code,
      })

      expect(
        body.error,
        `${code} 應該被 admin client 找到。如果回「找不到此代號」、代表：
        (a) workspaces 表 FORCE RLS 又被打開
        (b) Admin client 變回 singleton 且 stale state
        (c) SUPABASE_SERVICE_ROLE_KEY env 錯
        參考修法：supabase/migrations/_applied/2026-04-20/20260420d_fix_workspaces_force_rls.sql`
      ).not.toBe('找不到此代號')

      // 正常應該回認證失敗
      expect(body.success).toBe(false)
      expect(body.code).toBe('UNAUTHORIZED')
    })
  }

  test('不存在的 workspace code 應回「找不到此代號」', async () => {
    const body = await callLogin({
      email: 'anyone@example.com',
      password: 'anything',
      code: 'NONEXISTENT_WS_XYZ',
    })
    expect(body.error).toBe('找不到此代號')
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  test('TESTUX 用正確密碼能完整登入', async () => {
    // 登入欄位 2026-05-11 改 Email、需提供 TEST_EMAIL（TESTUX admin email）+ TEST_PASSWORD
    const email = process.env.TEST_EMAIL || ''
    const password = process.env.TEST_PASSWORD || ''
    test.skip(!email || !password, '需 TEST_EMAIL + TEST_PASSWORD、跳過 TESTUX 完整登入測試')

    const body = await callLogin({
      email,
      password,
      code: 'TESTUX',
    })
    expect(body.success).toBe(true)
    expect(body.data?.workspaceCode).toBe('TESTUX')
    expect(body.data?.employee?.employee_number).toBe('E001')
  })
})
