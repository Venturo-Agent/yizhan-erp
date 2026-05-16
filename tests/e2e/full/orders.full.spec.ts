/**
 * 訂單管理 - 完整功能測試
 *
 * 測試範圍：
 * - 頁面載入與基本元素
 * - 狀態篩選切換
 * - 搜尋功能
 * - 新增訂單完整流程（包含表單驗證）
 * - 訂單列表互動
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('訂單管理 - 完整功能測試', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
  })

  test.describe('頁面基本元素', () => {
    test('顯示頁面標題和麵包屑', async ({ authenticatedPage: page }) => {
      // 標題
      await expect(page.locator('text=訂單管理').first()).toBeVisible()

      // 麵包屑
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
      await expect(page.getByRole('link', { name: '首頁' })).toBeVisible()
    })

    test('顯示所有狀態篩選標籤', async ({ authenticatedPage: page }) => {
      await expect(page.locator('text=全部').first()).toBeVisible()
      await expect(page.locator('text=未收款')).toBeVisible()
      await expect(page.locator('text=部分收款')).toBeVisible()
      await expect(page.locator('text=已收款')).toBeVisible()
    })

    test('顯示新增訂單按鈕', async ({ authenticatedPage: page }) => {
      const addButton = page.locator('button').filter({ hasText: '新增訂單' })
      await expect(addButton).toBeVisible()
      await expect(addButton).toBeEnabled()
    })

    test('搜尋框直接可見（ResponsiveHeader、不是展開式）', async ({ authenticatedPage: page }) => {
      // 搜尋 input 是直接顯示的、沒有先點按鈕展開
      const searchInput = page.locator('input[placeholder*="搜尋"]').first()
      await expect(searchInput).toBeVisible()
    })
  })

  test.describe('狀態篩選功能', () => {
    test('點擊各狀態標籤可切換', async ({ authenticatedPage: page }) => {
      // 點擊「未收款」
      await page.locator('button, [role="tab"]').filter({ hasText: '未收款' }).click()
      await page.waitForTimeout(500)

      // 點擊「部分收款」
      await page.locator('button, [role="tab"]').filter({ hasText: '部分收款' }).click()
      await page.waitForTimeout(500)

      // 點擊「已收款」
      await page.locator('button, [role="tab"]').filter({ hasText: '已收款' }).click()
      await page.waitForTimeout(500)

      // 點回「全部」
      await page.locator('button, [role="tab"]').filter({ hasText: '全部' }).first().click()
      await page.waitForTimeout(500)

      // 確認還在訂單頁面
      expect(page.url()).toContain('/orders')
    })
  })

  test.describe('搜尋功能', () => {
    test('可以輸入搜尋關鍵字', async ({ authenticatedPage: page }) => {
      // 搜尋 input 直接可見
      const searchInput = page.locator('input[placeholder*="搜尋"]').first()
      await expect(searchInput).toBeVisible()

      // 輸入
      await searchInput.fill('測試')
      await expect(searchInput).toHaveValue('測試')

      // 有輸入時、清除 button (title="清除搜尋") 會出現
      const clearButton = page.locator('button[title="清除搜尋"]')
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click()
        await expect(searchInput).toHaveValue('')
      }
    })
  })

  test.describe('新增訂單對話框', () => {
    test('點擊新增按鈕開啟對話框', async ({ authenticatedPage: page }) => {
      const addButton = page.locator('button').filter({ hasText: '新增訂單' })
      await addButton.click()

      // 等待對話框出現
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // 檢查對話框標題
      await expect(dialog.locator('text=新增訂單').first()).toBeVisible()
    })

    test('對話框包含所有必要欄位', async ({ authenticatedPage: page }) => {
      // 開啟對話框
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')

      // 檢查表單欄位
      await expect(dialog.locator('text=選擇旅遊團')).toBeVisible()
      await expect(dialog.locator('text=聯絡人')).toBeVisible()
      await expect(dialog.locator('text=業務')).toBeVisible()
      await expect(dialog.locator('text=助理')).toBeVisible()
    })

    test('有取消和新增按鈕', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')

      // 取消按鈕
      await expect(dialog.locator('button').filter({ hasText: '取消' })).toBeVisible()

      // 新增按鈕（可能 disabled）
      await expect(dialog.locator('button[type="submit"]')).toBeVisible()
    })

    test('未填必填欄位時按鈕禁用', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')
      const submitButton = dialog.locator('button[type="submit"]')

      // 未填欄位時，按鈕應該 disabled
      await expect(submitButton).toBeDisabled()
    })

    test('點擊取消按鈕關閉對話框', async ({ authenticatedPage: page }) => {
      // 開啟對話框
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      // 點擊取消
      await page.locator('[role="dialog"]').locator('button').filter({ hasText: '取消' }).click()

      // 對話框關閉
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 })
    })

    test('填寫表單欄位', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')

      // 填寫聯絡人
      const contactInput = dialog.locator('input[placeholder*="聯絡人"]')
      await contactInput.fill('測試聯絡人')
      await expect(contactInput).toHaveValue('測試聯絡人')

      // 點擊旅遊團選擇器
      const tourCombobox = dialog
        .locator('button, input')
        .filter({ hasText: /搜尋或選擇旅遊團|選擇旅遊團/ })
        .first()
      if (await tourCombobox.isVisible()) {
        await tourCombobox.click()
        await page.waitForTimeout(500)

        // 如果有選項出現，選擇第一個
        const firstOption = page.locator('[role="option"]').first()
        if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstOption.click()
        }
      }

      // 清空並關閉
      await dialog.locator('button').filter({ hasText: '取消' }).click()
    })
  })

  test.describe('訂單列表', () => {
    test('表格顯示欄位標題', async ({ authenticatedPage: page }) => {
      // 等待表格載入
      await page.waitForTimeout(1000)

      // 檢查至少有一個欄位標題
      const hasOrderNumber = await page.locator('text=訂單編號').first().isVisible()
      const hasContact = await page.locator('text=聯絡人').first().isVisible()

      expect(hasOrderNumber || hasContact).toBe(true)
    })
  })
})
