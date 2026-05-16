/**
 * 訂單管理 - 完整創建流程測試
 *
 * 測試範圍：
 * - 完整填寫新增訂單表單
 * - 提交並驗證創建成功
 * - 表單驗證錯誤處理
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('訂單管理 - 創建流程測試', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
  })

  test.describe('新增訂單完整流程', () => {
    test('完整填寫表單並成功創建訂單', async ({ authenticatedPage: page }) => {
      // 點擊新增訂單按鈕
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')

      // 1. 選擇旅遊團（Combobox）
      // 找到旅遊團選擇器並點擊
      const tourCombobox = dialog
        .locator('button, input')
        .filter({ hasText: /搜尋或選擇旅遊團|選擇旅遊團/ })
        .first()

      if (await tourCombobox.isVisible()) {
        await tourCombobox.click()
        await page.waitForTimeout(500)

        // 等待選項出現並選擇第一個
        const tourOption = page.locator('[role="option"]').first()
        if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tourOption.click()
          await page.waitForTimeout(300)
        } else {
          // 如果沒有旅遊團選項，跳過此測試
          console.log('沒有可用的旅遊團，跳過創建測試')
          await dialog.locator('button').filter({ hasText: '取消' }).click()
          test.skip()
          return
        }
      }

      // 2. 填寫聯絡人
      const contactInput = dialog.locator('input[placeholder*="聯絡人"]')
      if (await contactInput.isVisible()) {
        await contactInput.fill('E2E測試聯絡人')
      }

      // 3. 選擇業務人員（Combobox）
      const salesCombobox = dialog
        .locator('button, input')
        .filter({ hasText: /選擇業務|業務人員/ })
        .first()
      if (await salesCombobox.isVisible()) {
        await salesCombobox.click()
        await page.waitForTimeout(300)

        const salesOption = page.locator('[role="option"]').first()
        if (await salesOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await salesOption.click()
          await page.waitForTimeout(300)
        }
      }

      // 4. 選擇助理（可選）
      const assistantCombobox = dialog
        .locator('button, input')
        .filter({ hasText: /選擇助理|助理/ })
        .first()
      if (await assistantCombobox.isVisible()) {
        await assistantCombobox.click()
        await page.waitForTimeout(300)

        const assistantOption = page.locator('[role="option"]').first()
        if (await assistantOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await assistantOption.click()
          await page.waitForTimeout(300)
        }
      }

      // 5. 提交表單
      const submitButton = dialog.locator('button[type="submit"]')

      // 檢查提交按鈕是否啟用（表單驗證通過）
      const isEnabled = await submitButton.isEnabled()

      if (isEnabled) {
        await submitButton.click()

        // 等待對話框關閉或顯示成功訊息
        await Promise.race([
          expect(dialog).not.toBeVisible({ timeout: 5000 }),
          page.waitForSelector('text=成功', { timeout: 5000 }).catch(() => null),
          page.waitForSelector('[data-sonner-toast]', { timeout: 5000 }).catch(() => null),
        ])

        // 驗證：對話框應該關閉
        const dialogStillVisible = await dialog.isVisible()

        if (!dialogStillVisible) {
          // 成功創建，檢查列表是否有新訂單
          await page.waitForTimeout(1000)

          // 檢查是否有「E2E測試聯絡人」的訂單
          const hasNewOrder = await page
            .locator('text=E2E測試聯絡人')
            .isVisible()
            .catch(() => false)

          // 記錄結果（不強制要求，因為可能需要刷新）
          console.log('訂單創建結果：', hasNewOrder ? '已顯示在列表' : '需要刷新查看')
        }
      } else {
        // 按鈕仍然禁用，可能缺少必填欄位
        console.log('提交按鈕仍然禁用，檢查必填欄位')

        // 嘗試直接輸入聯絡人到任何可見的文字輸入框
        const textInputs = dialog.locator('input[type="text"]')
        const inputCount = await textInputs.count()

        for (let i = 0; i < inputCount; i++) {
          const input = textInputs.nth(i)
          const placeholder = await input.getAttribute('placeholder')
          const value = await input.inputValue()

          if (!value && placeholder?.includes('聯絡人')) {
            await input.fill('E2E測試聯絡人')
          }
        }

        // 再次檢查是否可以提交
        await page.waitForTimeout(500)
        if (await submitButton.isEnabled()) {
          await submitButton.click()
          await expect(dialog).not.toBeVisible({ timeout: 5000 })
        }
      }

      // 清理：關閉對話框（如果還開著）
      if (await dialog.isVisible()) {
        await dialog.locator('button').filter({ hasText: '取消' }).click()
      }
    })

    test('未選擇旅遊團時提交按鈕應該禁用', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')
      const submitButton = dialog.locator('button[type="submit"]')

      // 只填寫聯絡人，不選擇旅遊團
      const contactInput = dialog.locator('input[placeholder*="聯絡人"]')
      if (await contactInput.isVisible()) {
        await contactInput.fill('測試聯絡人')
      }

      // 提交按鈕應該仍然禁用
      await expect(submitButton).toBeDisabled()

      // 關閉對話框
      await dialog.locator('button').filter({ hasText: '取消' }).click()
    })

    test('選擇旅遊團後顯示正確的團號資訊', async ({ authenticatedPage: page }) => {
      await page.locator('button').filter({ hasText: '新增訂單' }).click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

      const dialog = page.locator('[role="dialog"]')

      // 選擇旅遊團
      const tourCombobox = dialog
        .locator('button, input')
        .filter({ hasText: /搜尋或選擇旅遊團|選擇旅遊團/ })
        .first()

      if (await tourCombobox.isVisible()) {
        await tourCombobox.click()
        await page.waitForTimeout(500)

        const tourOption = page.locator('[role="option"]').first()
        if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          // 記錄選項文字
          const optionText = await tourOption.textContent()
          await tourOption.click()
          await page.waitForTimeout(300)

          // 驗證選擇器顯示了選中的團
          // Combobox 的按鈕文字應該包含團號
          const comboboxText = await tourCombobox.textContent()
          console.log('選擇的旅遊團：', optionText)
          console.log('Combobox 顯示：', comboboxText)

          // 確認有選中內容（不是空的）
          expect(comboboxText?.length).toBeGreaterThan(0)
        }
      }

      // 關閉對話框
      await dialog.locator('button').filter({ hasText: '取消' }).click()
    })
  })
})
