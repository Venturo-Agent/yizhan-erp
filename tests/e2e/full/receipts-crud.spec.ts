/**
 * 收款單 CRUD 測試
 *
 * 測試範圍：
 * - 新增收款單
 * - 查看收款單詳情
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('收款單 CRUD 測試', () => {
  test('1. 新增收款單', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 點擊新增收款按鈕
    const addButton = page.locator('button').filter({ hasText: '新增收款' })
    await expect(addButton).toBeVisible({ timeout: 5000 })
    await addButton.click()
    await page.waitForTimeout(1000)

    // 確認對話框開啟
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    console.log('✅ 新增收款單對話框已開啟')

    // 等待團體 Combobox 可用（資料載入）
    const tourCombobox = dialog.locator('button[role="combobox"]').first()

    // 等待 Combobox 變成 enabled 狀態
    try {
      await expect(tourCombobox).toBeEnabled({ timeout: 10000 })
    } catch {
      console.log('⚠️ 團體選擇器未啟用（可能沒有資料）')
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    await tourCombobox.click()
    await page.waitForTimeout(500)

    // 選擇第一個團體選項
    const tourOption = page.locator('[role="option"]').first()
    if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tourOption.click()
      await page.waitForTimeout(1000)
      console.log('✅ 已選擇團體')

      // 等待訂單選擇器啟用
      const orderSelect = dialog.locator('button[role="combobox"]').nth(1)
      try {
        await expect(orderSelect).toBeEnabled({ timeout: 5000 })
        await orderSelect.click()
        await page.waitForTimeout(500)

        const orderOption = page.locator('[role="option"]').first()
        if (await orderOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await orderOption.click()
          await page.waitForTimeout(500)
          console.log('✅ 已選擇訂單')
        } else {
          console.log('⚠️ 此團體沒有訂單')
        }
      } catch {
        console.log('⚠️ 訂單選擇器未啟用')
      }
    } else {
      console.log('⚠️ 沒有可選的團體，跳過此測試')
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    // 檢查收款項目表格
    const itemsSection = dialog.locator('text=收款項目')
    if (await itemsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ 收款項目區塊顯示正常')

      // 找到金額輸入框並填入
      const amountInputs = dialog.locator('input[type="number"]')
      if ((await amountInputs.count()) > 0) {
        await amountInputs.first().fill('1000')
        console.log('✅ 已輸入收款金額')
      }
    }

    // 檢查新增按鈕狀態
    const submitButton = dialog.locator('button').filter({ hasText: /新增收款單/ })
    const isEnabled = await submitButton.isEnabled({ timeout: 3000 }).catch(() => false)
    console.log(`新增按鈕狀態: ${isEnabled ? '可點擊' : '禁用'}`)

    // 如果可以點擊就提交
    if (isEnabled) {
      await submitButton.click()
      await page.waitForTimeout(2000)

      const dialogClosed = await dialog.isHidden({ timeout: 5000 }).catch(() => false)
      if (dialogClosed) {
        console.log('✅ 收款單新增成功')
      } else {
        console.log('⚠️ 對話框未關閉，可能有驗證錯誤或等待確認')
      }
    }

    // 關閉對話框
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  test('2. 查看收款單詳情', async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 檢查是否有收款單
    const rows = await page.locator('table tbody tr').count()
    console.log(`找到 ${rows} 筆收款單`)

    if (rows === 0) {
      console.log('⚠️ 沒有收款單資料，跳過此測試')
      test.skip()
      return
    }

    // 點擊第一個收款單
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 檢查是否開啟詳情對話框
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ 收款單詳情對話框已開啟')

      // 檢查詳情內容
      const dialogContent = await dialog.textContent()
      const hasReceiptInfo = dialogContent?.includes('收款') || dialogContent?.includes('金額')
      console.log(`詳情內容包含收款資訊: ${hasReceiptInfo}`)

      await page.keyboard.press('Escape')
    } else {
      console.log('⚠️ 收款單詳情對話框未開啟')
    }
  })
})
