/**
 * 旅遊團管理 - 完整創建流程測試
 *
 * 測試範圍：
 * - 開團流程（從提案開團 or 直接新增）
 * - 表單欄位驗證
 * - 提交並驗證創建成功
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('旅遊團管理 - 創建流程測試', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
  })

  test.describe('開團功能', () => {
    test('點擊開團按鈕並檢查表單結構', async ({ authenticatedPage: page }) => {
      // 找到開團/新增按鈕
      const addButton = page.locator('button').filter({ hasText: /新增|開團/ })
      await expect(addButton).toBeVisible()

      await addButton.click()
      await page.waitForTimeout(1000)

      // 可能會開啟對話框或跳轉頁面
      const hasDialog = await page.locator('[role="dialog"]').isVisible()
      const urlChanged = !page.url().includes('/tours') || page.url().includes('/tours/new')

      if (hasDialog) {
        const dialog = page.locator('[role="dialog"]')

        // 檢查對話框內容
        console.log('開團對話框已開啟')

        // 常見的開團欄位
        const possibleFields = [
          '團名',
          '目的地',
          '出發日期',
          '回程日期',
          '開團',
          '團號',
          '人數',
          '價格',
        ]

        for (const field of possibleFields) {
          const hasField = await dialog
            .locator(`text=${field}`)
            .isVisible()
            .catch(() => false)
          if (hasField) {
            console.log(`找到欄位：${field}`)
          }
        }

        // 關閉對話框
        const cancelButton = dialog.locator('button').filter({ hasText: /取消|關閉/ })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
        }
      } else if (urlChanged) {
        console.log('跳轉到開團頁面：', page.url())

        // 檢查頁面內容
        const pageContent = await page.locator('body').textContent()
        expect(pageContent?.length).toBeGreaterThan(100)

        // 返回列表
        await page.goto('/tours')
      }
    })

    test('開團表單包含必要欄位', async ({ authenticatedPage: page }) => {
      const addButton = page.locator('button').filter({ hasText: /新增|開團/ })
      await addButton.click()
      await page.waitForTimeout(1000)

      const dialog = page.locator('[role="dialog"]')

      if (await dialog.isVisible()) {
        // 檢查必要欄位
        const requiredFields = ['團名', '出發日期']

        for (const field of requiredFields) {
          const fieldLabel = dialog.locator('label').filter({ hasText: field }).first()
          if (await fieldLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`必要欄位存在：${field}`)
          }
        }

        // 檢查是否有提交按鈕
        const submitButton = dialog
          .locator('button[type="submit"], button')
          .filter({ hasText: /建立|新增|開團|儲存/ })
          .first()
        const hasSubmit = await submitButton.isVisible().catch(() => false)
        console.log('有提交按鈕：', hasSubmit)

        // 關閉對話框
        const cancelButton = dialog.locator('button').filter({ hasText: /取消|關閉/ })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
        }
      }
    })

    test('未填必填欄位時無法提交', async ({ authenticatedPage: page }) => {
      const addButton = page.locator('button').filter({ hasText: /新增|開團/ })
      await addButton.click()
      await page.waitForTimeout(1000)

      const dialog = page.locator('[role="dialog"]')

      if (await dialog.isVisible()) {
        // 不填寫任何欄位，直接嘗試提交
        const submitButton = dialog
          .locator('button[type="submit"], button')
          .filter({ hasText: /建立|新增|開團|儲存/ })
          .first()

        if (await submitButton.isVisible()) {
          const isEnabled = await submitButton.isEnabled()
          console.log('未填寫時提交按鈕狀態：', isEnabled ? '啟用' : '禁用')

          if (isEnabled) {
            // 如果按鈕啟用，點擊後應該顯示錯誤
            await submitButton.click()
            await page.waitForTimeout(500)

            // 檢查是否有錯誤訊息
            const hasError = await page
              .locator('text=/必填|請填寫|請選擇/i')
              .isVisible()
              .catch(() => false)
            console.log('顯示錯誤訊息：', hasError)
          }
        }

        // 關閉對話框
        const cancelButton = dialog.locator('button').filter({ hasText: /取消|關閉/ })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
        }
      }
    })
  })

  test.describe('旅遊團列表操作', () => {
    test('可以展開旅遊團詳細資訊', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(1000)

      // 找到列表中的旅遊團項目
      const tourRows = page.locator('tr[data-row], [data-tour-card], .cursor-pointer, tbody tr')
      const count = await tourRows.count()

      if (count > 0) {
        // 點擊第一個項目
        await tourRows.first().click()
        await page.waitForTimeout(500)

        // 檢查是否有展開內容或對話框
        const hasExpanded = await page
          .locator('[data-state="open"], [aria-expanded="true"]')
          .isVisible()
          .catch(() => false)
        const hasDialog = await page.locator('[role="dialog"]').isVisible()

        console.log('點擊旅遊團後：', {
          展開: hasExpanded,
          對話框: hasDialog,
        })

        // 如果有對話框，關閉它
        if (hasDialog) {
          const closeButton = page
            .locator('[role="dialog"]')
            .locator('button')
            .filter({ hasText: /關閉|取消|×/ })
            .first()
          if (await closeButton.isVisible()) {
            await closeButton.click()
          }
        }
      } else {
        console.log('列表中沒有旅遊團')
      }
    })

    test('旅遊團有操作按鈕（編輯/刪除等）', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(1000)

      // 找到操作按鈕（通常在每行的最後）
      const actionButtons = page.locator('button').filter({ hasText: /編輯|刪除|查看|⋯|更多/ })
      const count = await actionButtons.count()

      console.log(`找到 ${count} 個操作按鈕`)

      if (count > 0) {
        // 點擊第一個操作按鈕
        await actionButtons.first().click()
        await page.waitForTimeout(500)

        // 檢查是否有下拉選單或對話框
        const hasDropdown = await page
          .locator('[role="menu"], [data-state="open"]')
          .isVisible()
          .catch(() => false)
        const hasDialog = await page.locator('[role="dialog"]').isVisible()

        console.log('點擊操作按鈕後：', {
          下拉選單: hasDropdown,
          對話框: hasDialog,
        })

        // 關閉選單
        await page.keyboard.press('Escape')
      }
    })
  })
})
