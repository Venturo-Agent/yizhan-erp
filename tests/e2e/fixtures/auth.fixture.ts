/**
 * Playwright Auth Fixture
 * 登入相關的測試輔助工具
 */

import { test as base, Page } from '@playwright/test'

// 測試帳號
// 2026-05-11：登入欄位從員工編號（E001）改為 Email、TEST_USERNAME 保留作向後相容、實際登入用 TEST_EMAIL
export const TEST_CREDENTIALS = {
  companyCode: process.env.TEST_COMPANY_CODE || 'CORNER',
  email: process.env.TEST_EMAIL || 'e001@testux.local',
  username: process.env.TEST_USERNAME || 'E001',
  password: process.env.TEST_PASSWORD || '00000000',
}

/**
 * 執行登入操作
 */
export async function login(page: Page, credentials = TEST_CREDENTIALS) {
  await page.goto('/login')

  // 等待頁面載入
  await page.waitForSelector('input[placeholder="公司代號"]')

  // 填寫表單
  await page.fill('input[placeholder="公司代號"]', credentials.companyCode)
  await page.fill('input[placeholder="Email"]', credentials.email)
  await page.fill('input[placeholder="密碼"]', credentials.password)

  // 點擊登入按鈕
  await page.click('button[type="submit"]')

  // 等待跳轉（登入成功會跳到首頁或其他頁面）
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 })
}

/**
 * 檢查是否已登入
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // 如果在登入頁面，就是未登入
  if (page.url().includes('/login')) {
    return false
  }

  // 檢查是否有登入後才會出現的元素（例如側邊欄或使用者名稱）
  try {
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

/**
 * 確保已登入狀態
 */
export async function ensureLoggedIn(page: Page, credentials = TEST_CREDENTIALS) {
  const loggedIn = await isLoggedIn(page)
  if (!loggedIn) {
    await login(page, credentials)
  }
}

// 擴展 Playwright test，使用已儲存的登入狀態
// 注意：global-setup.ts 會在所有測試前登入一次並儲存 session
// 這裡的 authenticatedPage 直接使用該 session，不需要再登入
type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // storage state 已由 playwright.config.ts 自動載入
    // 只需確認已登入即可
    await use(page)
  },
})

export { expect } from '@playwright/test'
