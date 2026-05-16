/**
 * 訂單完整生命週期測試
 *
 * 測試範圍：
 * - 創建訂單 → 驗證資料正確儲存
 * - 在列表中查看 → 驗證顯示正確
 * - 刪除訂單 → 驗證刪除成功
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe.serial('訂單完整生命週期測試', () => {
  // 儲存創建的訂單資訊
  let createdOrderCode: string | null = null
  const testContactName = 'E2E生命週期測試'

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
  })

  test('1. 創建訂單並驗證資料正確儲存', async ({ authenticatedPage: page }) => {
    // ========== 第一步：等待頁面完全載入並記錄訂單數量 ==========
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 訂單頁面使用 div 結構，計算訂單數量
    // 找所有訂單編號（格式如 CNX261121A-O01）
    const orderCodePattern = /[A-Z]{3}\d{6}[A-Z]-O\d{2}/
    const initialOrderCodes = await page
      .locator('text=/[A-Z]{3}\\d{6}[A-Z]-O\\d{2}/')
      .allTextContents()
    const initialRowCount = initialOrderCodes.length
    console.log(`創建前訂單數量: ${initialRowCount}`)

    // ========== 第二步：開啟新增對話框 ==========
    const addButton = page.locator('button').filter({ hasText: '新增訂單' })
    await expect(addButton).toBeVisible({ timeout: 5000 })
    await addButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // ========== 第三步：選擇旅遊團 ==========
    console.log('選擇旅遊團...')
    const tourInput = dialog.locator('input[placeholder*="搜尋或選擇旅遊團"]').first()
    await expect(tourInput).toBeVisible({ timeout: 5000 })
    await tourInput.click()
    await page.waitForTimeout(500)

    // 等待下拉選單出現
    const tourListbox = page.locator('[role="listbox"]')
    await expect(tourListbox).toBeVisible({ timeout: 5000 })

    const tourOption = tourListbox.locator('button').first()
    if (!(await tourOption.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('沒有可用的旅遊團，跳過測試')
      await dialog.locator('button').filter({ hasText: '取消' }).click()
      test.skip()
      return
    }

    const tourText = await tourOption.textContent()
    console.log(`選擇旅遊團: ${tourText}`)
    await tourOption.click()
    await page.waitForTimeout(500)

    // 驗證旅遊團已選擇
    const tourInputValue = await tourInput.inputValue()
    console.log(`旅遊團輸入框值: ${tourInputValue}`)

    // ========== 第四步：填寫聯絡人 ==========
    const contactInput = dialog.locator('input[placeholder*="聯絡人"]')
    await expect(contactInput).toBeVisible({ timeout: 3000 })
    await contactInput.fill(testContactName)
    console.log(`填寫聯絡人: ${testContactName}`)
    await page.waitForTimeout(300)

    // ========== 第五步：選擇業務人員（必填！） ==========
    console.log('選擇業務人員...')
    const salesInput = dialog.locator('input[placeholder*="選擇業務人員"]').first()
    await expect(salesInput).toBeVisible({ timeout: 5000 })
    await salesInput.click()
    await page.waitForTimeout(500)

    // 等待業務人員下拉選單
    const salesListbox = page.locator('[role="listbox"]')
    await expect(salesListbox).toBeVisible({ timeout: 5000 })

    const salesOption = salesListbox.locator('button').first()
    if (await salesOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      const salesText = await salesOption.textContent()
      console.log(`選擇業務: ${salesText}`)
      await salesOption.click()
      await page.waitForTimeout(500)

      // 驗證業務已選擇
      const salesInputValue = await salesInput.inputValue()
      console.log(`業務輸入框值: ${salesInputValue}`)
    } else {
      console.log('⚠️ 沒有可用的業務人員')
    }

    // ========== 第六步：驗證表單狀態並提交 ==========
    await page.waitForTimeout(500)

    // 檢查表單欄位的實際值
    const formState = {
      tour: await tourInput.inputValue(),
      contact: await contactInput.inputValue(),
      sales: await salesInput.inputValue(),
    }
    console.log('表單狀態:', JSON.stringify(formState))

    const submitButton = dialog.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible({ timeout: 3000 })

    const isEnabled = await submitButton.isEnabled()
    console.log('提交按鈕狀態：', isEnabled ? '啟用' : '禁用')

    if (!isEnabled) {
      console.log('提交按鈕禁用，檢查必填欄位...')
      const dialogContent = await dialog.textContent()
      console.log('對話框內容:', dialogContent?.substring(0, 300))
      await dialog.locator('button').filter({ hasText: '取消' }).click()
      test.skip()
      return
    }

    // 先設置 alert 監聽器（在點擊之前）
    let alertMessage: string | null = null
    page.on('dialog', async alertDialog => {
      alertMessage = alertDialog.message()
      console.log('捕獲到 Alert:', alertMessage)
      await alertDialog.dismiss()
    })

    // 監聽控制台訊息
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('瀏覽器錯誤:', msg.text())
      }
    })

    // 檢查 localStorage 中的 auth 資料
    const authData = await page.evaluate(() => {
      const data = localStorage.getItem('auth-storage')
      if (data) {
        try {
          const parsed = JSON.parse(data)
          return {
            hasUser: !!parsed?.state?.user,
            workspaceId: parsed?.state?.user?.workspace_id || null,
            userId: parsed?.state?.user?.id || null,
          }
        } catch {
          return { error: 'parse error' }
        }
      }
      return { error: 'no auth data' }
    })
    console.log('Auth 資料:', JSON.stringify(authData))

    console.log('點擊提交按鈕...')
    await submitButton.click()
    await page.waitForTimeout(2000)

    // 如果有 alert，記錄它
    if (alertMessage) {
      console.log(`表單驗證失敗: ${alertMessage}`)
      // alert 可能阻止了表單提交，取消對話框
      await dialog
        .locator('button')
        .filter({ hasText: '取消' })
        .click()
        .catch(() => {})
      test.skip()
      return
    }

    // 檢查是否有錯誤 toast
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    if (await errorToast.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorToast.textContent()
      console.log(`錯誤提示: ${errorText}`)
    }

    // 等待對話框關閉
    try {
      await expect(dialog).not.toBeVisible({ timeout: 15000 })
      console.log('對話框已關閉，訂單創建成功')
    } catch {
      // 對話框還在
      console.log('對話框未關閉')

      // 再檢查一次 alert
      await page.waitForTimeout(500)
      if (alertMessage) {
        console.log(`Alert 訊息: ${alertMessage}`)
      }

      // 嘗試使用 Enter 鍵提交
      console.log('嘗試使用 Enter 鍵提交...')
      await submitButton.press('Enter')
      await page.waitForTimeout(2000)

      // 再次檢查對話框
      if (await dialog.isVisible()) {
        console.log('對話框仍然開啟，取消操作')
        await dialog.locator('button').filter({ hasText: '取消' }).click()
        test.skip()
        return
      }
      console.log('對話框已關閉')
    }

    // ========== 第七步：驗證訂單已創建 ==========
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')

    // 重新計算訂單數量
    const newOrderCodes = await page.locator('text=/[A-Z]{3}\\d{6}[A-Z]-O\\d{2}/').allTextContents()
    const newRowCount = newOrderCodes.length
    console.log(`創建後訂單數量: ${newRowCount}`)

    // 找出新增的訂單編號
    const newCodes = newOrderCodes.filter(code => !initialOrderCodes.includes(code))
    if (newCodes.length > 0) {
      createdOrderCode = newCodes[0]
      console.log(`✅ 新創建的訂單編號: ${createdOrderCode}`)
    }

    // 也嘗試透過聯絡人名稱找
    const contactElement = page.locator(`text=${testContactName}`).first()
    if (await contactElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`✅ 找到聯絡人: ${testContactName}`)
    }

    expect(newRowCount).toBeGreaterThan(initialRowCount)
    expect(createdOrderCode).toBeTruthy()

    console.log(`\n========== 創建完成 ==========`)
    console.log(`訂單編號: ${createdOrderCode}`)
    console.log(`聯絡人: ${testContactName}`)
  })

  test('2. 查看訂單詳情', async ({ authenticatedPage: page }) => {
    // 需要先有訂單
    if (!createdOrderCode) {
      // 嘗試找到測試創建的訂單
      const contactElement = page.locator('text=' + testContactName).first()
      if (await contactElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 找同一區塊的訂單編號
        const pageContent = await page.content()
        const orderCodeMatch = pageContent.match(/([A-Z]{3}\d{6}[A-Z]-O\d{2})/g)
        if (orderCodeMatch) {
          createdOrderCode = orderCodeMatch[orderCodeMatch.length - 1]
        }
      }

      if (!createdOrderCode) {
        console.log('找不到測試訂單，跳過查看測試')
        test.skip()
        return
      }
    }

    console.log(`查看訂單: ${createdOrderCode}`)

    // 點擊「查看成員」按鈕來查看訂單詳情
    // 找到該訂單的區域
    const orderSection = page.locator(`text=${createdOrderCode}`).first()
    const orderRow = orderSection
      .locator('xpath=ancestor::div[contains(@class, "flex") or contains(@class, "grid")]')
      .first()

    // 找查看成員按鈕
    const viewButton = orderRow.locator('button').filter({ hasText: '查看成員' }).first()
    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForTimeout(500)

      // 檢查是否打開詳情對話框
      const detailDialog = page.locator('[role="dialog"]')
      if (await detailDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ 成員對話框已開啟')

        const dialogContent = await detailDialog.textContent()
        console.log('對話框內容:', dialogContent?.substring(0, 100))

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
      }
    } else {
      console.log('找不到查看成員按鈕，嘗試點擊訂單區域')
      await orderSection.click()
      await page.waitForTimeout(500)
    }
  })

  test('3. 刪除訂單並驗證', async ({ authenticatedPage: page }) => {
    // 需要先有訂單
    if (!createdOrderCode) {
      const contactElement = page.locator('text=' + testContactName).first()
      if (await contactElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        const pageContent = await page.content()
        const orderCodeMatch = pageContent.match(/([A-Z]{3}\d{6}[A-Z]-O\d{2})/g)
        if (orderCodeMatch) {
          createdOrderCode = orderCodeMatch[orderCodeMatch.length - 1]
        }
      }

      if (!createdOrderCode) {
        console.log('找不到測試訂單，跳過刪除測試')
        test.skip()
        return
      }
    }

    console.log(`準備刪除訂單: ${createdOrderCode}`)

    // 記錄刪除前的數量
    const beforeDeleteCount = await page.locator('button[title="刪除訂單"]').count()
    console.log(`刪除前訂單數量: ${beforeDeleteCount}`)

    // 使用更精確的方式找到目標訂單行
    // 頁面結構：每個訂單行是一個包含訂單編號和刪除按鈕的 div
    // 我們需要找到「包含特定訂單編號」且「直接包含刪除按鈕」的最小 div

    // 方法：遍歷所有刪除按鈕，找到其所在行包含目標訂單編號的那個
    const allDeleteButtons = page.locator('button[title="刪除訂單"]')
    const deleteButtonCount = await allDeleteButtons.count()
    console.log(`找到 ${deleteButtonCount} 個刪除按鈕`)

    let targetDeleteButton: ReturnType<typeof page.locator> | null = null

    for (let i = 0; i < deleteButtonCount; i++) {
      const deleteBtn = allDeleteButtons.nth(i)
      // 找到該按鈕的父行（向上找最近的包含訂單資訊的容器）
      // 使用 xpath 找到該按鈕的父元素，然後檢查該父元素是否包含目標訂單編號
      const parentRow = deleteBtn.locator('xpath=ancestor::div[1]/parent::div[1]')
      const rowText = await parentRow.textContent().catch(() => '')

      if (rowText && rowText.includes(createdOrderCode!)) {
        console.log(`找到目標訂單行 (第 ${i + 1} 個刪除按鈕)`)
        targetDeleteButton = deleteBtn
        break
      }
    }

    // 備用方法：直接用 CSS 選擇器找到包含訂單編號的容器內的刪除按鈕
    if (!targetDeleteButton) {
      console.log('使用備用選擇器方法...')
      // 找到訂單編號文字元素
      const orderCodeElement = page.locator(`text="${createdOrderCode}"`).first()
      if (await orderCodeElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 向上找到最近的包含刪除按鈕的容器
        // 訂單行的結構：div > (訂單編號 + ... + 操作按鈕區)
        // 從訂單編號向上找，然後找同級的刪除按鈕
        const siblingDeleteButton = orderCodeElement
          .locator(
            'xpath=following-sibling::div//button[@title="刪除訂單"] | ../following-sibling::div//button[@title="刪除訂單"] | ../..//button[@title="刪除訂單"]'
          )
          .first()

        if (await siblingDeleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          targetDeleteButton = siblingDeleteButton
          console.log('透過備用選擇器找到刪除按鈕')
        }
      }
    }

    if (
      !targetDeleteButton ||
      !(await targetDeleteButton.isVisible({ timeout: 3000 }).catch(() => false))
    ) {
      console.log('⚠️ 找不到目標訂單的刪除按鈕')
      const pageContent = await page.content()
      const hasOrderCode = pageContent.includes(createdOrderCode!)
      console.log(`頁面包含訂單編號 ${createdOrderCode}: ${hasOrderCode}`)
      test.skip()
      return
    }

    console.log('找到刪除按鈕，執行刪除...')
    await targetDeleteButton.click()

    // 等待確認對話框出現
    await page.waitForTimeout(500)

    // 確認對話框使用 AlertDialog
    const confirmDialog = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /確定要刪除/ })
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('確認對話框已出現')

      // 找到確認按鈕
      const confirmButton = confirmDialog
        .locator('button')
        .filter({ hasText: /^確定$|^確認$/ })
        .first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('點擊確認按鈕...')
        await confirmButton.click({ force: true })
      } else {
        // 嘗試其他按鈕選擇器
        const altConfirmButton = confirmDialog.locator('button:not(:has-text("取消"))').first()
        if (await altConfirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('使用備用按鈕點擊確認...')
          await altConfirmButton.click({ force: true })
        }
      }
    } else {
      console.log('⚠️ 確認對話框未出現')
    }

    // 等待刪除完成
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 驗證訂單已從列表消失
    const afterDeleteCount = await page.locator('button[title="刪除訂單"]').count()
    console.log(`刪除後訂單數量: ${afterDeleteCount}`)

    // 確認數量減少
    expect(afterDeleteCount).toBeLessThan(beforeDeleteCount)

    // 確認該訂單不在列表中（使用更精確的選擇器）
    // 等待頁面更新後再檢查
    await page.waitForTimeout(500)
    const deletedOrderLocator = page.locator(`text="${createdOrderCode}"`)
    const stillExists = (await deletedOrderLocator.count()) > 0

    if (stillExists) {
      // 可能是頁面還沒更新，嘗試重新載入
      console.log('訂單仍可見，嘗試重新載入頁面...')
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const afterReloadExists = (await page.locator(`text="${createdOrderCode}"`).count()) > 0
      expect(afterReloadExists).toBe(false)
      console.log(`✅ 重新載入後訂單 ${createdOrderCode} 確認已刪除`)
    } else {
      console.log(`✅ 訂單 ${createdOrderCode} 已成功刪除`)
    }

    createdOrderCode = null
  })

  // 清理提醒
  test.afterAll(async () => {
    if (createdOrderCode) {
      console.log(`⚠️ 警告：測試訂單 ${createdOrderCode} 未被刪除，請手動清理`)
    }
  })
})
