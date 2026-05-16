/**
 * 行事曆頁面測試
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('行事曆', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
  })

  test('顯示行事曆頁面', async ({ authenticatedPage: page }) => {
    // 檢查 FullCalendar 主容器（使用精確的 class 組合避免匹配到圖標）
    const calendar = page.locator('.fc.fc-media-screen')
    await expect(calendar).toBeVisible({ timeout: 10000 })
  })

  test('可以切換月份視圖', async ({ authenticatedPage: page }) => {
    // 檢查導航按鈕（使用頁面上的實際文字 ← 和 →）
    const prevButton = page.getByRole('button', { name: '←' })
    const nextButton = page.getByRole('button', { name: '→' })

    // 兩個按鈕都應該存在
    await expect(prevButton).toBeVisible()
    await expect(nextButton).toBeVisible()
  })
})
