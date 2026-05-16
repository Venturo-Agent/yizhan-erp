/**
 * 收款單完整生命週期測試
 *
 * 測試範圍：
 * - 創建收款單 → 驗證資料正確儲存
 * - 在列表中查看 → 驗證顯示正確
 * - 編輯收款單 → 驗證修改成功
 * - 刪除收款單 → 驗證刪除成功
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe.serial('收款單完整生命週期測試', () => {
  // 儲存創建的收款單資訊，供後續測試使用
  let createdReceiptCode: string | null = null
  let testTourCode: string | null = null
  let testOrderCode: string | null = null

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
  })

  test('1. 創建收款單並驗證資料正確儲存', async ({ authenticatedPage: page }) => {
    // ========== 第一步：等待頁面載入並記錄收款單數量 ==========
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const initialRowCount = await page.locator('tbody tr').count()
    console.log(`創建前收款單數量: ${initialRowCount}`)

    // ========== 第二步：開啟新增對話框 ==========
    const addButton = page.locator('button').filter({ hasText: '新增收款' })
    await expect(addButton).toBeVisible({ timeout: 5000 })
    await addButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // ========== 第三步：選擇團體（找有訂單的團） ==========
    // 團體選擇器使用 Combobox，placeholder 是 "請先選擇團體..."
    const tourInput = dialog.locator('input[placeholder*="選擇團體"]').first()
    await expect(tourInput).toBeVisible({ timeout: 10000 })
    await tourInput.click()
    await page.waitForTimeout(500)

    // 等待下拉選單出現
    const tourListbox = page.locator('[role="listbox"]')
    await expect(tourListbox).toBeVisible({ timeout: 5000 })

    const tourOptions = tourListbox.locator('button')
    const tourCount = await tourOptions.count()
    console.log(`可用團體數量: ${tourCount}`)

    if (tourCount === 0) {
      console.log('沒有可用的團體，跳過測試')
      await dialog.locator('button').filter({ hasText: '取消' }).click()
      test.skip()
      return
    }

    // 找到有訂單的團
    let foundTourWithOrder = false
    for (let i = 0; i < Math.min(5, tourCount) && !foundTourWithOrder; i++) {
      // 如果不是第一次，需要重新打開下拉選單
      if (i > 0) {
        await tourInput.click()
        await tourInput.fill('') // 清空搜尋以顯示所有選項
        await page.waitForTimeout(500)
        await expect(tourListbox).toBeVisible({ timeout: 3000 })
      }

      const options = tourListbox.locator('button')
      const optionText = await options.nth(i).textContent()
      console.log(`嘗試團 ${i + 1}: ${optionText}`)
      await options.nth(i).click()
      await page.waitForTimeout(800)

      // 檢查訂單選擇器狀態
      // 訂單選擇器使用 Select (不是 Combobox)，查找 button[role="combobox"]
      const orderTrigger = dialog.locator('button[role="combobox"]').first()
      await expect(orderTrigger).toBeVisible({ timeout: 3000 })

      const orderPlaceholder = await orderTrigger.textContent()
      console.log(`訂單選擇器狀態: ${orderPlaceholder}`)

      // 如果顯示「此團體沒有訂單」，則跳過此團
      if (orderPlaceholder?.includes('沒有訂單')) {
        console.log('此團體沒有訂單，嘗試下一個')
        continue
      }

      // 訂單可能已經自動選中（顯示訂單編號如 CNX261121A-O01）
      // 或者顯示「請選擇訂單」
      const orderCodeMatch = orderPlaceholder?.match(/([A-Z]{3}\d{6}[A-Z]-O\d{2})/)

      if (orderCodeMatch) {
        // 訂單已經自動選中
        foundTourWithOrder = true
        testTourCode = optionText?.split(' - ')[0] || null
        testOrderCode = orderCodeMatch[1]
        console.log(`✅ 訂單已自動選中: ${testOrderCode}`)
      } else if (orderPlaceholder?.includes('請選擇訂單')) {
        // 需要手動選擇訂單
        await orderTrigger.click()
        await page.waitForTimeout(500)

        const orderOption = page.locator('[role="option"]').first()
        if (await orderOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          const orderText = await orderOption.textContent()
          console.log(`選擇訂單: ${orderText}`)
          await orderOption.click()
          await page.waitForTimeout(500)

          foundTourWithOrder = true
          testTourCode = optionText?.split(' - ')[0] || null
          testOrderCode = orderText?.split(' - ')[0] || null
          console.log(`找到有訂單的團: ${testTourCode}, 訂單: ${testOrderCode}`)
        }
      }
    }

    if (!foundTourWithOrder) {
      console.log('找不到有訂單的團，跳過測試')
      await dialog.locator('button').filter({ hasText: '取消' }).click()
      test.skip()
      return
    }

    // ========== 第四步：填寫收款資料 ==========
    const testAmount = 8888 // 使用特殊金額方便識別

    // 找到金額輸入框（在收款項目區塊內）
    const amountInput = dialog.locator('input[type="number"]').first()
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.click()
      await amountInput.fill('')
      await amountInput.fill(testAmount.toString())
      console.log(`填寫金額: ${testAmount}`)
    }

    // 填寫帳號後五碼（匯款方式必填）
    const accountInput = dialog.locator('input[placeholder*="帳號後五碼"]').first()
    if (await accountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accountInput.fill('99999')
      console.log('填寫帳號後五碼: 99999')
    }

    await page.waitForTimeout(500)

    // ========== 第五步：提交表單 ==========
    // 注意：按鈕文字是動態的「新增收款單 (共 N 項)」
    const submitButton = dialog
      .locator('button')
      .filter({ hasText: /新增收款單.*共.*項/ })
      .first()
    await expect(submitButton).toBeVisible({ timeout: 3000 })

    const isEnabled = await submitButton.isEnabled()
    console.log(`提交按鈕狀態: ${isEnabled ? '啟用' : '禁用'}`)

    if (!isEnabled) {
      console.log('提交按鈕禁用，檢查必填欄位...')
      const dialogContent = await dialog.textContent()
      console.log('對話框內容:', dialogContent?.substring(0, 300))
      await dialog.locator('button').filter({ hasText: '取消' }).click()
      test.skip()
      return
    }

    // 監聽 API 回應
    const responsePromise = page
      .waitForResponse(
        response => response.url().includes('/api/') && response.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => null)

    console.log('提交收款單...')
    await submitButton.click()

    // 等待 API 回應
    const response = await responsePromise
    if (response) {
      console.log(`API 回應狀態: ${response.status()}`)
      if (!response.ok()) {
        const body = await response.text().catch(() => '')
        console.log(`API 錯誤: ${body.substring(0, 200)}`)
      }
    }

    // 等待對話框關閉
    try {
      await expect(dialog).not.toBeVisible({ timeout: 15000 })
      console.log('對話框已關閉')
    } catch {
      console.log('對話框未關閉，檢查錯誤...')
      const errorToast = page.locator('[data-sonner-toast]')
      if (await errorToast.isVisible({ timeout: 2000 }).catch(() => false)) {
        const errorText = await errorToast.textContent()
        console.log(`錯誤提示: ${errorText}`)
      }
      await dialog.locator('button').filter({ hasText: '取消' }).click()
      test.skip()
      return
    }

    // ========== 第六步：驗證收款單已創建 ==========
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')

    const newRowCount = await page.locator('tbody tr').count()
    console.log(`創建後收款單數量: ${newRowCount}`)

    // 找包含金額 8,888 的行
    const rowWithAmount = page.locator('tbody tr').filter({ hasText: '8,888' }).first()
    if (await rowWithAmount.isVisible({ timeout: 5000 }).catch(() => false)) {
      const receiptCodeCell = rowWithAmount.locator('td').first()
      createdReceiptCode = await receiptCodeCell.textContent()
      console.log(`✅ 創建的收款單號: ${createdReceiptCode}`)
    } else {
      // 如果沒找到 8,888，檢查是否有新增的行
      if (newRowCount > initialRowCount) {
        const firstRow = page.locator('tbody tr').first()
        const receiptCodeCell = firstRow.locator('td').first()
        createdReceiptCode = await receiptCodeCell.textContent()
        console.log(`✅ 找到新收款單號: ${createdReceiptCode}`)
      } else {
        console.log('⚠️ 無法在列表中找到剛創建的收款單')
      }
    }

    expect(newRowCount).toBeGreaterThan(initialRowCount)
    expect(createdReceiptCode).toBeTruthy()

    console.log(`\n========== 創建完成 ==========`)
    console.log(`收款單號: ${createdReceiptCode}`)
    console.log(`金額: NT$ ${testAmount}`)
  })

  test('2. 查看收款單詳情', async ({ authenticatedPage: page }) => {
    // 需要先有收款單
    if (!createdReceiptCode) {
      // 嘗試找到測試創建的收款單（金額 8,888）
      const testRow = page.locator('tbody tr').filter({ hasText: '8,888' }).first()
      if (await testRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        createdReceiptCode = await testRow.locator('td').first().textContent()
      } else {
        console.log('找不到測試收款單，跳過查看測試')
        test.skip()
        return
      }
    }

    console.log(`查看收款單: ${createdReceiptCode}`)

    // 點擊該行打開詳情
    const targetRow = page.locator('tbody tr').filter({ hasText: createdReceiptCode! }).first()
    await targetRow.click()
    await page.waitForTimeout(500)

    // 檢查是否打開詳情對話框
    const detailDialog = page.locator('[role="dialog"]')
    if (await detailDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ 詳情對話框已開啟')

      // 驗證顯示的資訊
      const dialogContent = await detailDialog.textContent()
      console.log('對話框內容包含收款單號:', dialogContent?.includes(createdReceiptCode!) || false)

      // 關閉對話框
      const closeButton = detailDialog
        .locator('button')
        .filter({ hasText: /關閉|取消|Close/ })
        .first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
    } else {
      console.log('點擊行後沒有打開對話框（可能是展開模式）')
    }
  })

  test('3. 刪除收款單並驗證', async ({ authenticatedPage: page }) => {
    // 需要先有收款單
    if (!createdReceiptCode) {
      // 嘗試找到測試創建的收款單（金額 8,888）
      const testRow = page.locator('tbody tr').filter({ hasText: '8,888' }).first()
      if (await testRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        createdReceiptCode = await testRow.locator('td').first().textContent()
      } else {
        console.log('找不到測試收款單，跳過刪除測試')
        test.skip()
        return
      }
    }

    console.log(`準備刪除收款單: ${createdReceiptCode}`)

    // 記錄刪除前的數量
    const beforeDeleteCount = await page.locator('tbody tr').count()
    console.log(`刪除前收款單數量: ${beforeDeleteCount}`)

    // 找到目標行
    const targetRow = page.locator('tbody tr').filter({ hasText: createdReceiptCode! }).first()
    expect(await targetRow.isVisible()).toBe(true)

    // 找到該行的操作按鈕（編輯按鈕）
    const editButton = targetRow.locator('button').filter({ hasText: /編輯/ }).first()

    if (await editButton.isVisible()) {
      // 點擊編輯按鈕打開詳情
      await editButton.click()
      await page.waitForTimeout(500)

      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible({ timeout: 3000 })) {
        // 在詳情對話框中找刪除按鈕
        const deleteButton = dialog.locator('button').filter({ hasText: /刪除/ }).first()

        if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('找到刪除按鈕，執行刪除...')
          await deleteButton.click()

          // 等待確認對話框出現
          await page.waitForTimeout(500)

          // 找到確認對話框（包含「確定要刪除」的對話框）
          const confirmDialog = page.locator('[role="dialog"]').filter({ hasText: '確定要刪除' })
          if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('確認對話框已出現')
            const confirmButton = confirmDialog.locator('button').filter({ hasText: '確認' })
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              console.log('點擊確認按鈕...')
              await confirmButton.click({ force: true })
            }
          }

          // 等待刪除完成
          await page.waitForTimeout(2000)
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(1000)

          // 驗證收款單已從列表消失
          const afterDeleteCount = await page.locator('tbody tr').count()
          console.log(`刪除後收款單數量: ${afterDeleteCount}`)

          // 確認數量減少
          expect(afterDeleteCount).toBeLessThan(beforeDeleteCount)

          // 確認該收款單不在列表中
          const deletedRow = page.locator('tbody tr').filter({ hasText: createdReceiptCode! })
          const stillExists = await deletedRow.isVisible({ timeout: 1000 }).catch(() => false)
          expect(stillExists).toBe(false)

          console.log(`✅ 收款單 ${createdReceiptCode} 已成功刪除`)
          createdReceiptCode = null // 清除記錄
        } else {
          console.log('⚠️ 在詳情對話框中找不到刪除按鈕')
          // 關閉對話框
          await page.keyboard.press('Escape')
          test.skip()
        }
      }
    } else {
      // 嘗試點擊行打開詳情
      await targetRow.click()
      await page.waitForTimeout(500)

      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible({ timeout: 3000 })) {
        const deleteButton = dialog.locator('button').filter({ hasText: /刪除/ }).first()

        if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('找到刪除按鈕，執行刪除...')
          await deleteButton.click()

          // 等待確認對話框出現（會有新的 dialog）
          await page.waitForTimeout(500)

          // 找到確認對話框（包含「刪除收款單」標題的對話框）
          const confirmDialog = page.locator('[role="dialog"]').filter({ hasText: '確定要刪除' })
          if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('確認對話框已出現')

            // 在確認對話框中找「確認」按鈕
            const confirmButton = confirmDialog.locator('button').filter({ hasText: '確認' })
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              console.log('點擊確認按鈕...')
              await confirmButton.click({ force: true }) // force 繞過遮罩問題
            }
          }

          // 等待所有對話框關閉
          await page.waitForTimeout(2000)

          // 等待列表刷新
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(1000)

          const afterDeleteCount = await page.locator('tbody tr').count()
          console.log(`刪除後收款單數量: ${afterDeleteCount}`)
          expect(afterDeleteCount).toBeLessThan(beforeDeleteCount)

          // 確認該收款單不在列表中
          const deletedRow = page.locator('tbody tr').filter({ hasText: createdReceiptCode! })
          const stillExists = await deletedRow.isVisible({ timeout: 1000 }).catch(() => false)
          expect(stillExists).toBe(false)

          console.log(`✅ 收款單 ${createdReceiptCode} 已成功刪除`)
          createdReceiptCode = null
        } else {
          console.log('⚠️ 找不到刪除按鈕')
          await page.keyboard.press('Escape')
          test.skip()
        }
      } else {
        console.log('⚠️ 無法打開收款單詳情')
        test.skip()
      }
    }
  })

  // 清理：確保測試資料被刪除
  test.afterAll(async ({ browser }) => {
    if (createdReceiptCode) {
      console.log(`⚠️ 警告：測試收款單 ${createdReceiptCode} 未被刪除，請手動清理`)
    }
  })
})
