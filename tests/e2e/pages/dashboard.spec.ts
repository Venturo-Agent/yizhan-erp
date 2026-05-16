/**
 * 首頁/儀表板測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('首頁', () => {
  test('登入後顯示首頁', async ({ authenticatedPage: page }) => {
    await page.goto('/')

    // 等待頁面載入完成
    await page.waitForLoadState('networkidle')

    // 確認在首頁（不在登入頁）
    expect(page.url()).not.toContain('/login')
  })

  test('顯示側邊導航欄', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 檢查側邊欄存在（根據實際結構調整 selector）
    const sidebar = page.locator('nav, [role="navigation"], aside').first()
    await expect(sidebar).toBeVisible()
  })
})
