/**
 * 收款管理頁面測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('收款管理', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
  })

  test('顯示收款管理頁面', async ({ authenticatedPage: page }) => {
    await expect(page.locator('text=收款管理')).toBeVisible()
  })

  test('顯示新增收款按鈕', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: '新增收款' })
    await expect(addButton).toBeVisible()
  })

  test('顯示批量收款按鈕', async ({ authenticatedPage: page }) => {
    const batchButton = page.locator('button').filter({ hasText: '批量收款' })
    await expect(batchButton).toBeVisible()
  })

  test('點擊新增收款按鈕開啟對話框', async ({ authenticatedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: '新增收款' })
    await addButton.click()

    // 等待對話框出現
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test('顯示進階搜尋按鈕', async ({ authenticatedPage: page }) => {
    const searchButton = page.locator('button').filter({ hasText: '進階搜尋' })
    await expect(searchButton).toBeVisible()
  })

  test('顯示匯出 Excel 按鈕', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator('button').filter({ hasText: '匯出 Excel' })
    await expect(exportButton).toBeVisible()
  })

  test('表格顯示正確欄位', async ({ authenticatedPage: page }) => {
    // 檢查表頭欄位（使用 first() 避免 strict mode 問題）
    await expect(page.locator('th').filter({ hasText: '收款單號' }).first()).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '收款日期' }).first()).toBeVisible()
  })
})

test.describe('收款管理 - 新增收款對話框', () => {
  test('對話框包含必要欄位', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')

    // 開啟對話框
    const addButton = page.locator('button').filter({ hasText: '新增收款' })
    await addButton.click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

    // 檢查必要欄位（使用 label 更精確）
    await expect(page.locator('label').filter({ hasText: '團體' }).first()).toBeVisible()
  })

  test('取消按鈕關閉對話框', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')

    // 開啟對話框
    const addButton = page.locator('button').filter({ hasText: '新增收款' })
    await addButton.click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

    // 點擊取消
    const cancelButton = page
      .locator('[role="dialog"]')
      .locator('button')
      .filter({ hasText: '取消' })
    await cancelButton.click()

    // 對話框應該關閉
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 })
  })
})
