import { test, expect } from './fixtures/auth.fixture'

// 注意：/quotes 和 /itinerary 已整合進 /tours/[code] tabs、不再是獨立路由（2026-04-20）
const EXTENDED_PAGES = [
  { path: '/library/attractions', name: '景點庫' },
  { path: '/library/suppliers', name: '供應商' },
  { path: '/accounting/vouchers', name: '會計傳票' },
  { path: '/accounting/accounts', name: '會計科目' },
  { path: '/accounting/reports', name: '會計報表' },
  { path: '/channel', name: 'AI 客服' },
  { path: '/confirmations', name: '需求單' },
  { path: '/brochures', name: '行程手冊' },
  { path: '/customized-tours', name: '客製團' },
  { path: '/contracts', name: '合約' },
  { path: '/esims', name: 'eSIM' },
  { path: '/ai-bot', name: 'AI Bot' },
  { path: '/design', name: '提案設計' },
]

test.describe('Round 4 補測：authenticated 頁面', () => {
  for (const { path, name } of EXTENDED_PAGES) {
    test(`${name} (${path}) authenticated 能正常載入`, async ({ authenticatedPage: page }) => {
      const response = await page.goto(path)
      await page.waitForLoadState('networkidle', { timeout: 15000 })

      // 檢查 HTTP status
      expect(response?.status()).toBeLessThan(500)

      // 檢查沒有 404 文字
      const notFound = await page.locator('text=找不到頁面').count()
      const next404 = await page.locator('text=404').count()
      if (notFound > 0 || next404 > 0) {
        throw new Error(`${path} 顯示 404 頁面`)
      }

      // 檢查沒有錯誤頁
      const internalError = await page.locator('text="Internal Server Error"').count()
      expect(internalError).toBe(0)

      // body 有內容
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.length).toBeGreaterThan(50)
    })
  }
})
