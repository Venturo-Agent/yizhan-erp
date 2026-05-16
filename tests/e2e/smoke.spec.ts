/**
 * 煙霧測試 - 快速檢查所有主要頁面是否可正常載入
 *
 * 執行方式：npm run test:e2e -- smoke.spec.ts
 */

import { test, expect } from './fixtures/auth.fixture'

// 所有需要測試的頁面（根據實際 app 路由結構）
const PAGES = [
  { path: '/', name: '首頁' },
  { path: '/tours', name: '旅遊團管理' },
  { path: '/orders', name: '訂單管理' },
  { path: '/calendar', name: '行事曆' },
  { path: '/visas', name: '簽證管理' },
  { path: '/finance/payments', name: '收款管理' },
  { path: '/finance/requests', name: '請款管理' },
  { path: '/finance/treasury', name: '出納管理' },
  { path: '/customers/companies', name: '客戶公司' },
  { path: '/design', name: '提案設計' },
  { path: '/todos', name: '待辦事項' },
  { path: '/hr', name: '人事管理' },
  { path: '/settings', name: '系統設定' },
]

test.describe('煙霧測試 - 頁面載入', () => {
  for (const { path, name } of PAGES) {
    test(`${name} (${path}) 可正常載入`, async ({ authenticatedPage: page }) => {
      // 前往頁面
      await page.goto(path)

      // 等待頁面載入（最多 30 秒）
      await page.waitForLoadState('networkidle', { timeout: 30000 })

      // 確認沒有 500 錯誤頁面（使用精確匹配，避免匹配到金額如 NT$ 1,500）
      const internalError = await page.locator('text="Internal Server Error"').count()
      expect(internalError).toBe(0)

      // 確認沒有 404 錯誤
      const pageNotFound = await page.locator('text=找不到頁面').count()
      expect(pageNotFound).toBe(0)

      // 確認頁面有內容（不是空白頁）
      const body = page.locator('body')
      const bodyText = await body.textContent()
      expect(bodyText?.length).toBeGreaterThan(10)
    })
  }
})

test.describe('煙霧測試 - 導航功能', () => {
  test('側邊欄導航正常運作', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 點擊訂單管理
    const ordersLink = page.locator('a[href="/orders"], nav >> text=訂單').first()
    if (await ordersLink.isVisible()) {
      await ordersLink.click()
      await page.waitForURL('**/orders**')
      expect(page.url()).toContain('/orders')
    }
  })

  test('頁面之間可以正常切換', async ({ authenticatedPage: page }) => {
    // 從首頁開始
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 前往旅遊團
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=旅遊團管理')).toBeVisible()

    // 前往訂單
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=訂單管理')).toBeVisible()

    // 前往收款
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=收款管理')).toBeVisible()
  })
})

test.describe('煙霧測試 - 響應式檢查', () => {
  test('桌面版正常顯示', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 側邊欄應該可見
    const sidebar = page.locator('nav, aside, [role="navigation"]').first()
    await expect(sidebar).toBeVisible()
  })

  test('平板版正常顯示', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 頁面不應該有水平滾動條
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20) // 允許小誤差
  })
})
