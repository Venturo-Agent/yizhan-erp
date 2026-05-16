/**
 * 訂單管理頁面測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('訂單管理', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
  })

  test('顯示訂單列表頁面', async ({ authenticatedPage: page }) => {
    // 檢查頁面標題
    await expect(page.locator('text=訂單管理')).toBeVisible()
  })

  test('顯示新增訂單按鈕', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: '新增訂單' })
    await expect(addButton).toBeVisible()
  })

  test('點擊新增訂單按鈕開啟對話框', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: '新增訂單' })
    await addButton.click()

    // 等待對話框出現
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test('顯示狀態篩選標籤', async ({ authenticatedPage: page }) => {
    // 檢查至少有一個狀態標籤存在
    const hasAllTab = await page.locator('text=全部').first().isVisible()
    const hasUnpaidTab = await page.locator('text=未收款').isVisible()

    expect(hasAllTab || hasUnpaidTab).toBe(true)
  })

  test('訂單表格顯示欄位', async ({ authenticatedPage: page }) => {
    // 檢查至少有一個表頭欄位（訂單編號是最基本的）
    await expect(page.locator('text=訂單編號').first()).toBeVisible()
  })
})
