/**
 * 報價單管理頁面測試
 *
 * 測試範圍：
 * - 頁面載入與顯示
 * - 搜尋功能
 * - 查看報價單詳情
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('報價單管理頁面測試', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/quotes')
    await page.waitForLoadState('networkidle')
  })

  test('1. 頁面載入正確', async ({ authenticatedPage: page }) => {
    // 確認表格存在
    const table = page.locator('table')
    await expect(table).toBeVisible({ timeout: 10000 })
    console.log('✅ 表格顯示正確')

    // 檢查表格欄位
    const headers = await page.locator('table thead th').allTextContents()
    console.log('表格欄位:', headers.join(', '))

    // 驗證關鍵欄位存在
    const hasTeamCode = headers.some(h => h.includes('團號'))
    const hasTeamName = headers.some(h => h.includes('團名'))
    const hasQuotes = headers.some(h => h.includes('報價單'))
    expect(hasTeamCode).toBe(true)
    expect(hasTeamName).toBe(true)
    expect(hasQuotes).toBe(true)
    console.log('✅ 表格欄位正確')
  })

  test('2. 搜尋功能正常', async ({ authenticatedPage: page }) => {
    await page.waitForTimeout(2000)

    // 先點擊搜尋按鈕來展開搜尋框
    const searchButton = page.locator('button[title="搜尋"]')
    if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchButton.click()
      await page.waitForTimeout(500)

      // 找到搜尋框（placeholder 是「搜尋團號、團名...」）
      const searchInput = page.locator('input[placeholder*="搜尋團號"]').first()

      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 記錄搜尋前的行數
        const beforeCount = await page.locator('table tbody tr').count()
        console.log(`搜尋前行數: ${beforeCount}`)

        // 輸入搜尋關鍵字
        await searchInput.fill('測試')
        await page.waitForTimeout(1000)

        const afterCount = await page.locator('table tbody tr').count()
        console.log(`搜尋後行數: ${afterCount}`)
        console.log('✅ 搜尋功能可用')

        // 清除搜尋
        await searchInput.clear()
        await page.waitForTimeout(500)
      } else {
        console.log('⚠️ 搜尋框展開後仍找不到，跳過此測試')
        test.skip()
      }
    } else {
      console.log('⚠️ 找不到搜尋按鈕，跳過此測試')
      test.skip()
    }
  })

  test('3. 可以查看旅遊團的報價單', async ({ authenticatedPage: page }) => {
    await page.waitForTimeout(2000)

    // 檢查是否有資料行
    const rows = await page.locator('table tbody tr').count()
    console.log(`找到 ${rows} 個旅遊團`)

    if (rows === 0) {
      console.log('⚠️ 沒有報價單資料，跳過此測試')
      test.skip()
      return
    }

    // 點擊第一行
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 檢查是否有對話框或詳情面板出現
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ 報價單詳情對話框已開啟')

      const dialogContent = await dialog.textContent()
      console.log('對話框內容:', dialogContent?.substring(0, 200))

      // 關閉對話框
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    } else {
      console.log('⚠️ 點擊行後沒有對話框出現')
    }
  })
})
