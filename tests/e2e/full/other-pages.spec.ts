/**
 * 其他頁面基本測試
 *
 * 測試範圍：
 * - 設定頁面
 * - HR 人事
 * - 排程
 * - 車隊管理
 * - eSIM
 * - 會計
 * - Timebox
 * - 設計
 * - 工作區
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('其他頁面基本測試', () => {
  test('1. 設定頁面 /settings', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 確認頁面已載入
    const url = page.url()
    expect(url).toContain('/settings')

    // 檢查是否有主要內容
    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    // 設定頁面通常有多個設定區塊
    const hasSettings =
      (await page
        .locator('text=設定')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=Settings')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ 設定頁面載入正常 (有設定內容: ${hasSettings})`)
  })

  test('2. HR 人事頁面 /hr', async ({ authenticatedPage: page }) => {
    await page.goto('/hr')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/hr')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    // HR 頁面可能有員工列表
    const hasContent =
      (await page
        .locator('text=員工')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=人事')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('table')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ HR 人事頁面載入正常 (有內容: ${hasContent})`)
  })

  test('3. 排程頁面 /scheduling', async ({ authenticatedPage: page }) => {
    await page.goto('/scheduling')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/scheduling')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=排程')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=調度')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('table')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ 排程頁面載入正常 (有內容: ${hasContent})`)
  })

  test('4. 車隊管理頁面 /database/fleet', async ({ authenticatedPage: page }) => {
    await page.goto('/database/fleet')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/database/fleet')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=車隊')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=車輛')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('table')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ 車隊管理頁面載入正常 (有內容: ${hasContent})`)
  })

  test('5. eSIM 頁面 /esims', async ({ authenticatedPage: page }) => {
    await page.goto('/esims')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/esims')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=eSIM')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=SIM')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('table')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ eSIM 頁面載入正常 (有內容: ${hasContent})`)
  })

  test('6. 會計頁面 /accounting', async ({ authenticatedPage: page }) => {
    await page.goto('/accounting')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/accounting')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=會計')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=傳票')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=請款')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('table')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ 會計頁面載入正常 (有內容: ${hasContent})`)
  })

  test('7. Timebox 頁面 /timebox', async ({ authenticatedPage: page }) => {
    await page.goto('/timebox')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/timebox')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=Timebox')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=時間')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=排程')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ Timebox 頁面載入正常 (有內容: ${hasContent})`)
  })

  test('8. 設計頁面 /design', async ({ authenticatedPage: page }) => {
    await page.goto('/design')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/design')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=設計')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=手冊')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('table')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ 設計頁面載入正常 (有內容: ${hasContent})`)
  })

  test('9. 工作區頁面 /workspace', async ({ authenticatedPage: page }) => {
    await page.goto('/workspace')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()
    expect(url).toContain('/workspace')

    const mainContent = page.locator('main, [role="main"], .flex-1')
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 })

    const hasContent =
      (await page
        .locator('text=頻道')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=訊息')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=Channel')
        .first()
        .isVisible()
        .catch(() => false))
    console.log(`✅ 工作區頁面載入正常 (有內容: ${hasContent})`)
  })
})
