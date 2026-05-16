/**
 * 收款管理 - 完整功能測試
 *
 * 2026-04-20 修正（v2）：
 * - 移除「批量收款」測試（入口搬到 /finance/travel-invoice 頁面）
 * - 移除「進階搜尋」測試（此頁本來就沒這功能、是 customers 頁才有）
 * - 移除「匯出 Excel」測試（William 確認不做、之後由會計報表取代）
 * - 保留核心：新增收款、頁面載入、對話框開關
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('收款管理 - 完整功能測試', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
  })

  test.describe('頁面基本元素', () => {
    test('顯示頁面標題', async ({ authenticatedPage: page }) => {
      await expect(page.locator('text=收款管理').first()).toBeVisible()
    })

    test('顯示新增收款按鈕', async ({ authenticatedPage: page }) => {
      await expect(page.locator('button').filter({ hasText: '新增收款' })).toBeVisible()
    })

    test('頁面正常載入', async ({ authenticatedPage: page }) => {
      await expect(page.locator('text="Internal Server Error"')).not.toBeVisible()
      const body = await page.locator('body').textContent()
      expect(body?.length).toBeGreaterThan(100)
    })
  })

  test.describe('新增收款對話框', () => {
    test('點擊新增收款開啟對話框', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增收款' }).click()
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })
    })

    test('對話框包含團體 / 公司收款 tabs', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增收款' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')
      await expect(dialog.getByRole('tab', { name: '團體收款' })).toBeVisible()
      await expect(dialog.getByRole('tab', { name: '公司收款' })).toBeVisible()
    })

    test('對話框有送出按鈕（新增收款單）', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增收款' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')
      // heading 和 button 都叫「新增收款單」、用 role 區分
      await expect(dialog.getByRole('button', { name: '新增收款單' })).toBeAttached()
    })

    test('按 Escape 關閉對話框', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增收款' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      // Radix Dialog 沒明顯取消按鈕、用 Escape 關
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('列表功能', () => {
    test('頁面有收款列表', async ({ authenticatedPage: page }) => {
      // TESTUX 可能沒資料、至少驗有 table 結構
      const hasTable = (await page.locator('table, [role="table"]').count()) > 0
      const hasEmptyState = await page
        .locator('text=/沒有|無資料|empty/i')
        .first()
        .isVisible()
        .catch(() => false)
      expect(hasTable || hasEmptyState, '列表應有 table 或空狀態提示').toBe(true)
    })

    test('頁面有搜尋框', async ({ authenticatedPage: page }) => {
      // ListPageLayout 內建搜尋、檢查有搜尋 input
      const hasSearchInput = (await page.locator('input[placeholder*="搜尋"]').count()) > 0
      expect(hasSearchInput, '應有搜尋輸入框').toBe(true)
    })
  })
})
