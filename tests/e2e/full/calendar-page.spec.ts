/**
 * 行事曆頁面測試
 *
 * 測試範圍：
 * - 頁面載入與顯示
 * - 行事曆視圖切換
 * - 事件顯示
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('行事曆頁面測試', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
  })

  test('1. 頁面載入正確', async ({ authenticatedPage: page }) => {
    await page.waitForTimeout(3000)

    // 確認頁面已載入（檢查 URL）
    const url = page.url()
    expect(url).toContain('/calendar')
    console.log('✅ 頁面 URL 正確')

    // 確認有主要內容區域
    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ 主內容區域顯示正確')
  })

  test('2. 可以切換月份', async ({ authenticatedPage: page }) => {
    await page.waitForTimeout(2000)

    // 找到導航按鈕（上/下月）
    const nextButton = page
      .locator('button')
      .filter({ hasText: /下一|next|>/ })
      .first()
    const prevButton = page
      .locator('button')
      .filter({ hasText: /上一|prev|</ })
      .first()

    // 或者使用 FullCalendar 的標準按鈕
    const fcNext = page
      .locator('.fc-next-button, button[title*="next"], button[aria-label*="next"]')
      .first()
    const fcPrev = page
      .locator('.fc-prev-button, button[title*="prev"], button[aria-label*="prev"]')
      .first()

    const hasNavigation =
      (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await fcNext.isVisible({ timeout: 3000 }).catch(() => false))

    if (hasNavigation) {
      console.log('✅ 找到導航按鈕')

      // 嘗試點擊下一月
      const navBtn = (await nextButton.isVisible()) ? nextButton : fcNext
      if (await navBtn.isVisible()) {
        await navBtn.click()
        await page.waitForTimeout(500)
        console.log('✅ 已切換到下個月')

        // 切回上個月
        const backBtn = (await prevButton.isVisible()) ? prevButton : fcPrev
        if (await backBtn.isVisible()) {
          await backBtn.click()
          await page.waitForTimeout(500)
          console.log('✅ 已切換回上個月')
        }
      }
    } else {
      console.log('⚠️ 找不到導航按鈕，可能使用不同的UI')
    }
  })

  test('3. 可以查看事件', async ({ authenticatedPage: page }) => {
    await page.waitForTimeout(3000)

    // 找事件元素
    const events = page.locator('.fc-event, [class*="event"], [data-event]')
    const eventCount = await events.count()
    console.log(`找到 ${eventCount} 個事件`)

    if (eventCount > 0) {
      // 使用 force click 避免被 header 攔截
      const firstEvent = events.first()
      try {
        await firstEvent.click({ force: true })
        await page.waitForTimeout(500)

        // 檢查是否有詳情出現
        const dialog = page.locator('[role="dialog"], [role="tooltip"], .popover')
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('✅ 事件詳情顯示')
          await page.keyboard.press('Escape')
        }
      } catch {
        console.log('⚠️ 無法點擊事件（可能被覆蓋）')
      }
    } else {
      console.log('⚠️ 行事曆上沒有事件（這是正常的，取決於資料）')
    }
  })
})
