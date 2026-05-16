/**
 * 請款管理頁面測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('請款管理', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/finance/requests')
    await page.waitForLoadState('networkidle')
  })

  test('顯示請款管理頁面', async ({ authenticatedPage: page }) => {
    await expect(page.locator('text=請款管理')).toBeVisible()
  })

  test('顯示新增請款按鈕', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: '新增請款' })
    await expect(addButton).toBeVisible()
  })

  test('點擊新增請款開啟對話框', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: '新增請款' })
    await addButton.click()

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test('頁面正常載入無錯誤', async ({ authenticatedPage: page }) => {
    // 確認沒有 500/404 錯誤
    await expect(page.locator('text=500')).not.toBeVisible()
    await expect(page.locator('text=404')).not.toBeVisible()

    // 確認有內容
    const body = await page.locator('body').textContent()
    expect(body?.length).toBeGreaterThan(50)
  })
})
