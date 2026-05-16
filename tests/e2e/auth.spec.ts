/**
 * 登入功能測試
 */

import { test, expect, chromium } from '@playwright/test'
import { TEST_CREDENTIALS, login } from './fixtures/auth.fixture'

// 上線前必驗的 4 個 case：
//   A. 正常登入 → 看到 dashboard         （由 '成功登入跳轉到首頁' 覆蓋）
//   B. 密碼錯多次 → 帳號鎖定               （新增、API 層測、5 次失敗鎖 15 分）
//   C. token 過期 → 自動 redirect /login   （新增、middleware 守門驗證）
//   D. 同帳號多裝置 → 兩邊都能登入          （新增、目前設計沒有單裝置強制踢人）
//
// 鎖定測試需要真實員工 + 服務金鑰 cleanup、env 不齊就 skip：
//   TEST_LOCKOUT_EMAIL：要打鎖定的真實員工 email（建議 TESTUX 內 throwaway 帳號）
//   TEST_LOCKOUT_CODE ：對應 workspace code
//   SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL：cleanup 用

test.describe('登入功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('顯示登入頁面', async ({ page }) => {
    // 檢查頁面標題
    await expect(page.locator('h1')).toContainText('Venturo')

    // 檢查表單元素
    await expect(page.locator('input[placeholder="公司代號"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible()
    await expect(page.locator('input[placeholder="密碼"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('空白表單送出會被阻止', async ({ page }) => {
    // 直接點擊登入按鈕（不填任何欄位）
    await page.click('button[type="submit"]')

    // 應該還在登入頁面（因為驗證失敗）
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/login')
  })

  test('錯誤的帳號密碼顯示錯誤', async ({ page }) => {
    await page.fill('input[placeholder="公司代號"]', TEST_CREDENTIALS.companyCode)
    await page.fill('input[placeholder="Email"]', 'wrong@example.com')
    await page.fill('input[placeholder="密碼"]', 'WRONG')
    await page.click('button[type="submit"]')

    // 等待錯誤訊息出現（可能是 toast 或頁面上的文字）
    await page.waitForTimeout(3000)

    // 確認還在登入頁面
    expect(page.url()).toContain('/login')
  })

  test('成功登入跳轉到首頁', async ({ page }) => {
    await login(page)

    // 確認已離開登入頁面
    expect(page.url()).not.toContain('/login')
  })

  test('記住我功能', async ({ page }) => {
    // 確認記住我 checkbox 預設勾選
    const checkbox = page.locator('#rememberMe')
    await expect(checkbox).toBeChecked()
  })

  test('密碼欄位預設為隱藏', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="密碼"]')

    // 預設是隱藏（type=password）
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

// ============================================================
// 上線前 Case B：密碼錯多次 → 帳號鎖定（5 次失敗鎖 15 分鐘）
// ============================================================
// 直接打 /api/auth/validate-login、不走 UI、避免 UI 重試 timing 不穩。
// 鎖定邏輯實作：src/app/api/auth/validate-login/route.ts:96-117
// 訊息格式：「帳號已鎖定，請 N 分鐘後再試」
//
// 為避免污染真實員工 login_failed_count、跑完用 service_role 直連 REST API
// 把計數器歸零（mirror admin-login-permissions.spec.ts 的 cleanup pattern）。

const LOCKOUT_EMAIL = process.env.TEST_LOCKOUT_EMAIL || ''
const LOCKOUT_CODE = process.env.TEST_LOCKOUT_CODE || 'TESTUX'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function callValidateLogin(payload: Record<string, string>) {
  const res = await fetch('http://localhost:3000/api/auth/validate-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<{
    success: boolean
    error?: string
    code?: string
  }>
}

async function resetLoginFailCount(email: string, workspaceCode: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return
  // 找 workspace
  const wsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/workspaces?code=eq.${workspaceCode}&select=id`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const wsList = (await wsRes.json()) as { id: string }[]
  if (!wsList.length) return
  const workspaceId = wsList[0].id

  // PATCH 員工 login_failed_count = 0、login_locked_until = null
  await fetch(
    `${SUPABASE_URL}/rest/v1/employees?workspace_id=eq.${workspaceId}&email=ilike.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ login_failed_count: 0, login_locked_until: null }),
    }
  )
}

test.describe.serial('Case B：密碼錯多次帳號鎖定', () => {
  test.beforeAll(async () => {
    test.skip(
      !LOCKOUT_EMAIL || !SERVICE_KEY,
      '需 TEST_LOCKOUT_EMAIL + SUPABASE_SERVICE_ROLE_KEY、跳過鎖定測試'
    )
    // 預先清乾淨、避免上次跑沒清完
    await resetLoginFailCount(LOCKOUT_EMAIL, LOCKOUT_CODE)
  })

  test.afterAll(async () => {
    // 不論 pass/fail 一律 cleanup、不要把員工卡在鎖定狀態
    await resetLoginFailCount(LOCKOUT_EMAIL, LOCKOUT_CODE)
  })

  test('連續 5 次錯誤密碼後第 6 次回鎖定訊息', async () => {
    // 連發 5 次錯誤密碼
    for (let i = 1; i <= 5; i++) {
      const body = await callValidateLogin({
        email: LOCKOUT_EMAIL,
        password: `wrong-password-attempt-${i}`,
        code: LOCKOUT_CODE,
      })
      expect(body.success, `第 ${i} 次應為 401`).toBe(false)
    }

    // 第 6 次（員工已鎖定）應回鎖定訊息
    const lockedBody = await callValidateLogin({
      email: LOCKOUT_EMAIL,
      password: 'whatever-now-locked',
      code: LOCKOUT_CODE,
    })
    expect(lockedBody.success).toBe(false)
    expect(
      lockedBody.error,
      '鎖定後應回「帳號已鎖定，請 N 分鐘後再試」、實作見 validate-login/route.ts:67-71'
    ).toContain('帳號已鎖定')
  })
})

// ============================================================
// 上線前 Case C：token 過期 / cookie 失效 → middleware redirect 到 /login
// ============================================================
// middleware.ts:81-108：未通過 isAuthenticated 一律 redirect 到 /login?redirect=<原路徑>
// 模擬 token 過期 = 清掉所有 sb-* auth cookie 後再進受保護頁

test.describe('Case C：token 過期 redirect 登入頁', () => {
  test('清掉 auth cookie 後進 /dashboard 會被 redirect 回 /login', async ({ browser }) => {
    // 開新 context、帶現成 storageState
    const context = await browser.newContext({
      storageState: './tests/e2e/.auth/user.json',
    })
    const page = await context.newPage()

    // 先驗 storageState 是有效登入
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(page.url(), '前置條件：storageState 應為有效登入').not.toContain('/login')

    // 模擬 token 過期：清掉所有 cookie（含 sb-*-auth-token / venturo-workspace-id）
    await context.clearCookies()

    // 再進 /dashboard、middleware 應該 redirect 到 /login
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10000 })
    expect(page.url(), 'token 失效後應 redirect 到 /login').toContain('/login')

    await context.close()
  })

  test('清掉 cookie 後 API call 會 401（middleware 守門）', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: './tests/e2e/.auth/user.json',
    })
    await context.clearCookies()
    const page = await context.newPage()

    // layout-context 是受保護 API、token 失效時 middleware redirect 到 /login（HTML）
    // 直接 fetch 取 status；redirect 到 /login 表示 middleware 守門有效
    const response = await page.request.get('http://localhost:3000/api/auth/layout-context', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    // middleware redirect = 307/308、或受保護 API 自己回 401
    expect(
      [307, 308, 401, 403].includes(response.status()),
      `失效 cookie 應觸發 redirect 或 401、實際 ${response.status()}`
    ).toBe(true)

    await context.close()
  })
})

// ============================================================
// 上線前 Case D：同帳號多裝置 → 兩邊都能用
// ============================================================
// 目前設計：Supabase Auth 預設不踢舊 session、兩個 context 各自登入皆可同時用。
// 若未來改成「後者擠掉前者」、這個測試會 fail、提醒同步更新測試 + 業務面文件。

test.describe('Case D：同帳號多裝置同時登入', () => {
  test('兩個獨立 context 同時登入同帳號、皆能進 /dashboard', async () => {
    // 不用全域 storageState、各自從 /login 走完整登入流程
    const browserInstance = await chromium.launch()
    try {
      const ctxA = await browserInstance.newContext()
      const ctxB = await browserInstance.newContext()
      const pageA = await ctxA.newPage()
      const pageB = await ctxB.newPage()

      // 兩邊各自登入（fixture login() 會等到離開 /login）
      await login(pageA, TEST_CREDENTIALS)
      await login(pageB, TEST_CREDENTIALS)

      // 各自進 /dashboard、不應被踢回 /login
      await pageA.goto('/dashboard')
      await pageA.waitForLoadState('networkidle', { timeout: 15000 })
      expect(pageA.url(), 'context A 應仍登入').not.toContain('/login')

      await pageB.goto('/dashboard')
      await pageB.waitForLoadState('networkidle', { timeout: 15000 })
      expect(pageB.url(), 'context B 應仍登入').not.toContain('/login')

      // 後者登入後、前者 reload 也應仍有效（驗證沒有單 session 強制踢人）
      await pageA.reload()
      await pageA.waitForLoadState('networkidle', { timeout: 15000 })
      expect(
        pageA.url(),
        'B 登入後 A reload 應仍有效（目前設計：不踢舊 session）'
      ).not.toContain('/login')

      await ctxA.close()
      await ctxB.close()
    } finally {
      await browserInstance.close()
    }
  })
})
