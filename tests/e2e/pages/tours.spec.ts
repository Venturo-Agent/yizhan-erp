/**
 * 旅遊團管理頁面測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('旅遊團管理', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
  })

  test('顯示旅遊團列表頁面', async ({ authenticatedPage: page }) => {
    // 檢查頁面標題
    await expect(page.locator('text=旅遊團管理')).toBeVisible()
  })

  test('顯示新增按鈕', async ({ authenticatedPage: page }) => {
    // 檢查新增/開團按鈕
    const addButton = page.locator('button').filter({ hasText: /新增|開團/ })
    await expect(addButton).toBeVisible()
  })

  test('新增按鈕可點擊', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: /新增|開團/ })

    // 確認按鈕存在且可點擊
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
  })
})
