/**
 * 簽證管理頁面測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('簽證管理', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/visas')
    await page.waitForLoadState('networkidle')
  })

  test('頁面正常載入', async ({ authenticatedPage: page }) => {
    // 確認不是錯誤頁面（檢查完整錯誤文字，避免匹配到金額如 NT$ 1,500）
    await expect(page.locator('text="500 Internal Server Error"')).not.toBeVisible()
    await expect(page.locator('text="404 Not Found"')).not.toBeVisible()

    // 確認有內容
    const body = await page.locator('body').textContent()
    expect(body?.length).toBeGreaterThan(50)
  })

  test('顯示麵包屑導航', async ({ authenticatedPage: page }) => {
    // 麵包屑應該有「簽證」相關文字
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"], [class*="breadcrumb"]')
    await expect(breadcrumb).toBeVisible()
  })
})
