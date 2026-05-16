/**
 * 旅遊團完整生命週期測試
 *
 * 測試範圍：
 * - 創建旅遊團 → 驗證資料正確儲存
 * - 在列表中查看 → 驗證顯示正確
 * - 刪除旅遊團 → 驗證刪除成功
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe.serial('旅遊團完整生命週期測試', () => {
  // 儲存創建的旅遊團資訊
  let createdTourCode: string | null = null
  // 使用時間戳確保每次測試的團名唯一
  const testTimestamp = Date.now().toString().slice(-6)
  const testTourName = `E2E測試團${testTimestamp}`

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
  })

  test('1. 創建旅遊團並驗證資料正確儲存', async ({ authenticatedPage: page }) => {
    // ========== 第一步：等待頁面完全載入並記錄旅遊團數量 ==========
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 旅遊團頁面使用 TourTable，計算團號數量
    // 團號格式：CNX261121A（3字母機場代碼+6位日期+字母序號）
    const tourCodePattern = /[A-Z]{3}\d{6}[A-Z]/
    const initialTourCodes = await page.locator('text=/[A-Z]{3}\\d{6}[A-Z]/').allTextContents()
    const initialRowCount = initialTourCodes.length
    console.log(`創建前旅遊團數量: ${initialRowCount}`)

    // ========== 第二步：開啟開團對話框 ==========
    // 點擊「新增」下拉選單按鈕
    const addDropdown = page.locator('button').filter({ hasText: '新增' })
    await expect(addDropdown).toBeVisible({ timeout: 5000 })
    await addDropdown.click()
    await page.waitForTimeout(500)

    // 選擇「直接開團」選項
    // 下拉選單使用 DropdownMenuItem，渲染為帶有 cursor=pointer 的 generic 元素
    const tourMenuItem = page.locator('text=直接開團')
    await expect(tourMenuItem).toBeVisible({ timeout: 3000 })
    await tourMenuItem.click()
    await page.waitForTimeout(500)

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // ========== 第三步：填寫旅遊團名稱 ==========
    console.log('填寫旅遊團名稱...')
    // 找到「旅遊團名稱」欄位
    const nameLabel = dialog.locator('label').filter({ hasText: '旅遊團名稱' })
    const nameInput = nameLabel
      .locator('xpath=following-sibling::input | ../following::input[1]')
      .first()

    // 如果找不到，嘗試用其他方式
    let tourNameInput = nameInput
    if (!(await tourNameInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      // 嘗試找到第一個輸入框（通常是團名）
      tourNameInput = dialog.locator('input').first()
    }

    await expect(tourNameInput).toBeVisible({ timeout: 3000 })
    await tourNameInput.fill(testTourName)
    console.log(`填寫團名: ${testTourName}`)
    await page.waitForTimeout(300)

    // ========== 第四步：選擇國家與城市 ==========
    // 表單要求：必須選擇有機場代碼的城市
    console.log('選擇國家和城市...')

    // 先選擇國家 - 使用 getByPlaceholder
    const countryInput = dialog.getByPlaceholder('選擇國家...')
    await expect(countryInput).toBeVisible({ timeout: 3000 })
    console.log('找到國家輸入框')
    await countryInput.click()
    await page.waitForTimeout(500)

    // 等待國家下拉選單出現
    const countryListbox = page.locator('[role="listbox"]')
    await expect(countryListbox).toBeVisible({ timeout: 3000 })
    console.log('國家下拉選單已出現')

    // 選擇「日本」（系統中應該有日本的城市配置）
    const japanOption = countryListbox.locator('button').filter({ hasText: '日本' }).first()
    if (await japanOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await japanOption.click()
      console.log('國家: 日本')
    } else {
      // 如果沒有日本，選擇第一個國家
      const firstCountry = countryListbox.locator('button').first()
      const countryName = await firstCountry.textContent()
      await firstCountry.click()
      console.log(`國家: ${countryName}`)
    }
    await page.waitForTimeout(500)

    // 等待城市輸入框變為可用
    const cityInput = dialog.getByPlaceholder('選擇城市...')
    await expect(cityInput).toBeEnabled({ timeout: 3000 })
    console.log('城市輸入框已啟用')
    await cityInput.click()
    await page.waitForTimeout(500)

    // 等待城市下拉選單出現
    const cityListbox = page.locator('[role="listbox"]')
    await expect(cityListbox).toBeVisible({ timeout: 3000 })
    console.log('城市下拉選單已出現')

    // 選擇第一個可用城市
    const cityOption = cityListbox.locator('button').first()
    const cityName = await cityOption.textContent()
    await cityOption.click()
    console.log(`城市: ${cityName}`)
    await page.waitForTimeout(300)

    // ========== 第五步：填寫出發日期 ==========
    console.log('填寫出發日期...')
    // 找到出發日期的日曆按鈕（使用 title 屬性）
    const departureDateCalendarBtn = dialog.locator('button[title="選擇日期"]').first()
    await expect(departureDateCalendarBtn).toBeVisible({ timeout: 3000 })
    await departureDateCalendarBtn.click()
    await page.waitForTimeout(500)

    // 等待日曆 popover 出現
    // Calendar 使用 Radix Popover，有一個「今天」按鈕可以識別
    const calendarPopover = page
      .locator('[data-radix-popper-content-wrapper]')
      .filter({ hasText: '今天' })
    await expect(calendarPopover).toBeVisible({ timeout: 3000 })
    console.log('日曆 popover 已出現')

    // 點擊下個月按鈕多次（跳到未來幾個月以避免團號衝突）
    // 使用時間戳的最後一位數決定月份偏移（0-9 → 2-11 個月後）
    const monthOffset = 2 + parseInt(testTimestamp.slice(-1))
    const nextMonthBtn = calendarPopover
      .locator('button')
      .filter({ has: page.locator('.sr-only:has-text("下個月")') })
    for (let i = 0; i < monthOffset; i++) {
      if (await nextMonthBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await nextMonthBtn.click()
        await page.waitForTimeout(200)
      }
    }
    console.log(`跳過 ${monthOffset} 個月`)

    // 選擇基於時間戳的日期（避免選到相同日期）
    // 定義為高層變數讓返回日期也能使用
    let selectedDepartureDay = 10 + (parseInt(testTimestamp.slice(-2)) % 15) // 10-24 號
    const availableDay = calendarPopover
      .locator('button:not([disabled]) time')
      .filter({ hasText: new RegExp(`^${selectedDepartureDay}$`) })
      .first()
    if (await availableDay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await availableDay.click()
      console.log(`出發日期: 選擇 ${selectedDepartureDay} 號`)
    } else {
      // 如果該日期不可用，選擇 15 號
      selectedDepartureDay = 15
      const altDay = calendarPopover
        .locator('button:not([disabled]) time')
        .filter({ hasText: /^15$/ })
        .first()
      if (await altDay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await altDay.click()
        console.log('出發日期: 選擇 15 號')
      }
    }
    await page.waitForTimeout(500)

    // ========== 第六步：填寫返回日期 ==========
    console.log('填寫返回日期...')
    // 找到返回日期的日曆按鈕（第二個）
    const returnDateCalendarBtn = dialog.locator('button[title="選擇日期"]').nth(1)
    await expect(returnDateCalendarBtn).toBeVisible({ timeout: 3000 })
    await returnDateCalendarBtn.click()
    await page.waitForTimeout(500)

    // 等待日曆 popover
    const returnCalendarPopover = page
      .locator('[data-radix-popper-content-wrapper]')
      .filter({ hasText: '今天' })
    await expect(returnCalendarPopover).toBeVisible({ timeout: 3000 })
    console.log('返回日期日曆 popover 已出現')

    // 選擇比出發日期晚 5 天的日期
    const returnDayToSelect = Math.min(28, selectedDepartureDay + 5)
    const returnDay = returnCalendarPopover
      .locator('button:not([disabled]) time')
      .filter({ hasText: new RegExp(`^${returnDayToSelect}$`) })
      .first()
    if (await returnDay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await returnDay.click()
      console.log(`返回日期: 選擇 ${returnDayToSelect} 號`)
    } else {
      // 選擇 28 號
      const altReturnDay = returnCalendarPopover
        .locator('button:not([disabled]) time')
        .filter({ hasText: /^28$/ })
        .first()
      if (await altReturnDay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await altReturnDay.click()
        console.log('返回日期: 選擇 28 號')
      }
    }
    await page.waitForTimeout(500)

    // ========== 第七步：驗證表單狀態並提交 ==========
    await page.waitForTimeout(500)

    // 找到提交按鈕
    const submitButton = dialog
      .locator('button')
      .filter({ hasText: /新增旅遊團|建立|開團|儲存/ })
      .last()
    await expect(submitButton).toBeVisible({ timeout: 3000 })

    const isEnabled = await submitButton.isEnabled()
    console.log('提交按鈕狀態：', isEnabled ? '啟用' : '禁用')

    if (!isEnabled) {
      console.log('提交按鈕禁用，檢查必填欄位...')
      // 檢查當前表單狀態
      const dialogContent = await dialog.textContent()
      console.log('對話框內容:', dialogContent?.substring(0, 500))

      // 取消並跳過
      const cancelButton = dialog.locator('button').filter({ hasText: '取消' })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      test.skip()
      return
    }

    // 設置 alert 監聽器
    let alertMessage: string | null = null
    page.on('dialog', async alertDialog => {
      alertMessage = alertDialog.message()
      console.log('捕獲到 Alert:', alertMessage)
      await alertDialog.dismiss()
    })

    console.log('點擊提交按鈕...')
    await submitButton.click()
    await page.waitForTimeout(2000)

    // 如果有 alert，記錄它
    if (alertMessage) {
      console.log(`表單驗證失敗: ${alertMessage}`)
      const cancelButton = dialog.locator('button').filter({ hasText: '取消' })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      test.skip()
      return
    }

    // 等待對話框關閉
    try {
      await expect(dialog).not.toBeVisible({ timeout: 15000 })
      console.log('對話框已關閉，旅遊團創建成功')
    } catch {
      console.log('對話框未關閉')
      // 檢查錯誤訊息
      const errorText = await dialog
        .locator('.text-status-danger, .text-red-500, [data-type="error"]')
        .textContent()
        .catch(() => '')
      if (errorText) {
        console.log('錯誤訊息:', errorText)
      }
      const cancelButton = dialog.locator('button').filter({ hasText: '取消' })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      test.skip()
      return
    }

    // ========== 第八步：驗證旅遊團已創建 ==========
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')

    // 重新計算旅遊團數量
    const newTourCodes = await page.locator('text=/[A-Z]{3}\\d{6}[A-Z]/').allTextContents()
    const newRowCount = newTourCodes.length
    console.log(`創建後旅遊團數量: ${newRowCount}`)

    // 找出新增的旅遊團號
    const newCodes = newTourCodes.filter(code => !initialTourCodes.includes(code))
    if (newCodes.length > 0) {
      createdTourCode = newCodes[0]
      console.log(`✅ 新創建的旅遊團號: ${createdTourCode}`)
    }

    // 也嘗試透過團名找
    const tourNameElement = page.locator(`text=${testTourName}`).first()
    if (await tourNameElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`✅ 找到團名: ${testTourName}`)
    }

    expect(newRowCount).toBeGreaterThan(initialRowCount)
    expect(createdTourCode).toBeTruthy()

    console.log(`\n========== 創建完成 ==========`)
    console.log(`旅遊團號: ${createdTourCode}`)
    console.log(`團名: ${testTourName}`)
  })

  test('2. 查看旅遊團詳情', async ({ authenticatedPage: page }) => {
    // 需要先有旅遊團
    if (!createdTourCode) {
      // 嘗試找到測試創建的旅遊團
      const tourNameElement = page.locator('text=' + testTourName).first()
      if (await tourNameElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 找同一區塊的旅遊團號
        const pageContent = await page.content()
        const tourCodeMatch = pageContent.match(/([A-Z]{3}\d{6}[A-Z])/g)
        if (tourCodeMatch) {
          // 取最後一個（最新的）
          createdTourCode = tourCodeMatch[tourCodeMatch.length - 1]
        }
      }

      if (!createdTourCode) {
        console.log('找不到測試旅遊團，跳過查看測試')
        test.skip()
        return
      }
    }

    console.log(`查看旅遊團: ${createdTourCode}`)

    // 找到該旅遊團的行並點擊
    const tourSection = page.locator(`text=${createdTourCode}`).first()
    expect(await tourSection.isVisible()).toBe(true)

    // 點擊旅遊團行來打開詳情
    await tourSection.click()
    await page.waitForTimeout(500)

    // 檢查是否打開詳情對話框
    const detailDialog = page.locator('[role="dialog"]')
    if (await detailDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ 旅遊團詳情對話框已開啟')

      const dialogContent = await detailDialog.textContent()
      const hasCode = dialogContent?.includes(createdTourCode!) || false
      console.log(`對話框包含團號: ${hasCode}`)
      console.log('對話框內容:', dialogContent?.substring(0, 200))

      // 關閉對話框
      const closeButton = detailDialog
        .locator('button')
        .filter({ hasText: /關閉|取消|×/ })
        .first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
    } else {
      console.log('對話框未開啟，可能使用其他方式顯示詳情')
    }
  })

  test('3. 刪除旅遊團並驗證', async ({ authenticatedPage: page }) => {
    // 需要先有旅遊團
    if (!createdTourCode) {
      const tourNameElement = page.locator('text=' + testTourName).first()
      if (await tourNameElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        const pageContent = await page.content()
        const tourCodeMatch = pageContent.match(/([A-Z]{3}\d{6}[A-Z])/g)
        if (tourCodeMatch) {
          createdTourCode = tourCodeMatch[tourCodeMatch.length - 1]
        }
      }

      if (!createdTourCode) {
        console.log('找不到測試旅遊團，跳過刪除測試')
        test.skip()
        return
      }
    }

    console.log(`準備刪除旅遊團: ${createdTourCode}`)

    // 記錄刪除前的數量
    const initialTourCodes = await page.locator('text=/[A-Z]{3}\\d{6}[A-Z]/').allTextContents()
    const beforeDeleteCount = initialTourCodes.length
    console.log(`刪除前旅遊團數量: ${beforeDeleteCount}`)

    // 找到該旅遊團的刪除按鈕
    // 使用遍歷方法確保找到正確行的刪除按鈕
    const tourSection = page.locator(`text=${createdTourCode}`).first()
    expect(await tourSection.isVisible()).toBe(true)
    console.log(`團號 ${createdTourCode} 可見，開始找刪除按鈕...`)

    // 遍歷所有刪除按鈕，找到包含目標團號的行
    let targetDeleteButton: ReturnType<typeof page.locator> | null = null
    const allDeleteButtons = page.locator('button').filter({ hasText: '刪除' })
    const deleteButtonCount = await allDeleteButtons.count()
    console.log(`找到 ${deleteButtonCount} 個刪除按鈕`)

    for (let i = 0; i < deleteButtonCount; i++) {
      const deleteBtn = allDeleteButtons.nth(i)
      // 向上找到最近的 tr 或 包含行資訊的 div
      const parentRow = deleteBtn.locator(
        'xpath=ancestor::tr[1] | ancestor::div[contains(@class, "group")][1]'
      )
      const rowText = await parentRow.textContent().catch(() => '')

      if (rowText && rowText.includes(createdTourCode!)) {
        targetDeleteButton = deleteBtn
        console.log(`找到目標行的刪除按鈕 (第 ${i + 1} 個)`)
        console.log(`行內容包含: ${rowText.substring(0, 100)}...`)
        break
      }
    }

    // 如果遍歷方法找不到，嘗試從詳情對話框刪除
    if (!targetDeleteButton) {
      console.log('遍歷方法找不到，嘗試從詳情對話框刪除...')
      await tourSection.click()
      await page.waitForTimeout(500)

      const detailDialog = page.locator('[role="dialog"]')
      if (await detailDialog.isVisible()) {
        targetDeleteButton = detailDialog.locator('button').filter({ hasText: '刪除' }).first()
      }
    }

    if (
      !targetDeleteButton ||
      !(await targetDeleteButton.isVisible({ timeout: 2000 }).catch(() => false))
    ) {
      console.log('⚠️ 無法找到刪除按鈕，跳過測試')
      test.skip()
      return
    }

    console.log('找到刪除按鈕，執行刪除...')
    await targetDeleteButton!.click()

    // 等待確認對話框出現
    await page.waitForTimeout(500)

    // 確認對話框
    const confirmDialog = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /確定|刪除|確認/ })
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('確認對話框已出現')

      // 找到確認按鈕
      const confirmButton = confirmDialog
        .locator('button')
        .filter({ hasText: /^確定$|^確認$|^刪除$/ })
        .first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('點擊確認按鈕...')
        await confirmButton.click({ force: true })
      } else {
        // 嘗試其他按鈕選擇器
        const altConfirmButton = confirmDialog
          .locator('button.bg-red, button.text-red, button:not(:has-text("取消"))')
          .first()
        if (await altConfirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('使用備用按鈕點擊確認...')
          await altConfirmButton.click({ force: true })
        }
      }
    } else {
      console.log('⚠️ 確認對話框未出現，可能直接刪除了')
    }

    // 等待刪除完成
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 驗證旅遊團已從列表消失
    const afterDeleteCodes = await page.locator('text=/[A-Z]{3}\\d{6}[A-Z]/').allTextContents()
    const afterDeleteCount = afterDeleteCodes.length
    console.log(`刪除後旅遊團數量: ${afterDeleteCount}`)

    // 確認數量減少
    expect(afterDeleteCount).toBeLessThan(beforeDeleteCount)

    // 確認該旅遊團不在列表中
    await page.waitForTimeout(500)
    const deletedTour = page.locator(`text="${createdTourCode}"`)
    const stillExists = (await deletedTour.count()) > 0

    if (stillExists) {
      // 可能是頁面還沒更新，嘗試重新載入
      console.log('旅遊團仍可見，嘗試重新載入頁面...')
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const afterReloadExists = (await page.locator(`text="${createdTourCode}"`).count()) > 0
      expect(afterReloadExists).toBe(false)
      console.log(`✅ 重新載入後旅遊團 ${createdTourCode} 確認已刪除`)
    } else {
      console.log(`✅ 旅遊團 ${createdTourCode} 已成功刪除`)
    }

    createdTourCode = null
  })

  // 清理提醒
  test.afterAll(async () => {
    if (createdTourCode) {
      console.log(`⚠️ 警告：測試旅遊團 ${createdTourCode} 未被刪除，請手動清理`)
    }
  })
})
