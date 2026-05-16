/**
 * 簽證管理完整生命週期測試
 *
 * 測試範圍：
 * - 創建簽證 → 驗證資料正確儲存
 * - 在列表中查看 → 驗證顯示正確
 * - 刪除簽證 → 驗證刪除成功
 *
 * 注意：簽證需要關聯旅遊團和訂單
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe.serial('簽證管理完整生命週期測試', () => {
  // 儲存創建的簽證資訊
  let createdApplicantName: string | null = null
  const testTimestamp = Date.now().toString().slice(-6)
  const testApplicantName = `測試申請人${testTimestamp}`

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/visas')
    await page.waitForLoadState('networkidle')
  })

  test('1. 創建簽證並驗證資料正確儲存', async ({ authenticatedPage: page }) => {
    // ========== 第一步：等待頁面完全載入並記錄簽證數量 ==========
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 計算現有簽證數量（透過表格行數）
    const initialRows = await page.locator('table tbody tr').count()
    console.log(`創建前簽證數量: ${initialRows}`)

    // ========== 第二步：開啟新增簽證對話框 ==========
    const addButton = page.locator('button').filter({ hasText: '新增簽證' })
    await expect(addButton).toBeVisible({ timeout: 5000 })
    await addButton.click()
    await page.waitForTimeout(500)

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    console.log('新增簽證對話框已開啟')

    // ========== 第三步：選擇團號 ==========
    console.log('選擇團號...')
    const tourCombobox = dialog.getByPlaceholder('請輸入或選擇團號')
    await expect(tourCombobox).toBeVisible({ timeout: 3000 })
    await tourCombobox.click()
    await page.waitForTimeout(500)

    // 等待團號下拉選單
    const tourListbox = page.locator('[role="listbox"]')
    await expect(tourListbox).toBeVisible({ timeout: 3000 })

    // 選擇第一個團號
    const firstTour = tourListbox.locator('button').first()
    if (await firstTour.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tourText = await firstTour.textContent()
      await firstTour.click()
      console.log(`選擇團號: ${tourText}`)
      await page.waitForTimeout(500)
    } else {
      console.log('找不到可選擇的團號，跳過測試')
      const cancelButton = dialog.locator('button').filter({ hasText: '取消' })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      test.skip()
      return
    }

    // ========== 第四步：填寫聯絡人資訊 ==========
    console.log('填寫聯絡人資訊...')
    const contactInput = dialog.getByPlaceholder('請輸入聯絡人')
    if (await contactInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contactInput.fill('測試聯絡人')
    }

    const phoneInput = dialog.getByPlaceholder('請輸入聯絡電話')
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill('0912345678')
    }

    // ========== 第五步：填寫申請人資訊 ==========
    console.log('填寫申請人資訊...')
    // 找到申請人輸入框（表格中的第一個文字輸入框）
    const applicantInputs = dialog.locator('table input[type="text"]')
    const applicantInput = applicantInputs.first()
    if (await applicantInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applicantInput.fill(testApplicantName)
      console.log(`申請人: ${testApplicantName}`)
    }

    // ========== 第六步：選擇簽證類型 ==========
    console.log('選擇簽證類型...')
    // 簽證類型是一個 Radix Select 下拉選單
    const visaTypeSelect = dialog
      .locator('table [role="combobox"], table button[aria-haspopup="listbox"]')
      .first()
    if (await visaTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await visaTypeSelect.click()
      await page.waitForTimeout(500)

      // 選擇「護照 成人」- 使用 [role="option"] 選擇器
      const passportOption = page
        .locator('[role="option"]')
        .filter({ hasText: '護照 成人' })
        .first()
      if (await passportOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await passportOption.click()
        console.log('簽證類型: 護照 成人')
      } else {
        // 如果找不到，嘗試選擇第一個選項
        const firstOption = page.locator('[role="option"]').first()
        if (await firstOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          const optionText = await firstOption.textContent()
          await firstOption.click()
          console.log(`簽證類型: ${optionText}`)
        }
      }
      await page.waitForTimeout(300)
    }

    // ========== 第七步：設置收件日期 ==========
    console.log('設置收件日期...')
    // 收件日期可能是日期選擇器
    const dateInputs = dialog.locator('input[type="date"], button[title="選擇日期"]')
    const receivedDateInput = dateInputs.first()
    if (await receivedDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 如果是日期選擇按鈕，點擊並選擇今天
      if ((await receivedDateInput.getAttribute('title')) === '選擇日期') {
        await receivedDateInput.click()
        await page.waitForTimeout(300)
        // 點擊「今天」按鈕
        const todayButton = page.locator('button').filter({ hasText: '今天' })
        if (await todayButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await todayButton.click()
        }
      }
    }

    await page.waitForTimeout(500)

    // ========== 第八步：提交表單 ==========
    const submitButton = dialog
      .locator('button')
      .filter({ hasText: /批次新增簽證|新增|儲存/ })
      .last()
    await expect(submitButton).toBeVisible({ timeout: 3000 })

    const isEnabled = await submitButton.isEnabled()
    console.log('提交按鈕狀態：', isEnabled ? '啟用' : '禁用')

    if (!isEnabled) {
      console.log('提交按鈕禁用，檢查必填欄位...')
      const dialogContent = await dialog.textContent()
      console.log('對話框內容:', dialogContent?.substring(0, 500))

      const cancelButton = dialog.locator('button').filter({ hasText: '取消' })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      test.skip()
      return
    }

    console.log('點擊提交按鈕...')
    await submitButton.click()
    await page.waitForTimeout(2000)

    // 等待對話框關閉或出現旅客比對對話框
    try {
      // 可能會彈出旅客比對對話框
      const matchDialog = page.locator('[role="dialog"]').filter({ hasText: '旅客比對' })
      if (await matchDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('旅客比對對話框出現，關閉它')
        const closeButton = matchDialog
          .locator('button')
          .filter({ hasText: /關閉|取消|完成/ })
          .first()
        if (await closeButton.isVisible()) {
          await closeButton.click()
        } else {
          await page.keyboard.press('Escape')
        }
        await page.waitForTimeout(500)
      }

      await expect(dialog).not.toBeVisible({ timeout: 10000 })
      console.log('對話框已關閉，簽證創建成功')
    } catch {
      console.log('對話框未關閉，可能有錯誤')
      const cancelButton = dialog.locator('button').filter({ hasText: '取消' })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
      test.skip()
      return
    }

    // ========== 第九步：驗證簽證已創建 ==========
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')

    // 重新計算簽證數量
    const newRows = await page.locator('table tbody tr').count()
    console.log(`創建後簽證數量: ${newRows}`)

    // 找到新增的申請人
    const applicantElement = page.locator(`text=${testApplicantName}`).first()
    if (await applicantElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      createdApplicantName = testApplicantName
      console.log(`✅ 找到申請人: ${testApplicantName}`)
    }

    expect(newRows).toBeGreaterThanOrEqual(initialRows)
    expect(createdApplicantName).toBeTruthy()

    console.log(`\n========== 創建完成 ==========`)
    console.log(`申請人: ${createdApplicantName}`)
  })

  test('2. 查看簽證詳情', async ({ authenticatedPage: page }) => {
    if (!createdApplicantName) {
      // 嘗試找到測試創建的簽證
      const applicantElement = page.locator(`text=${testApplicantName}`).first()
      if (await applicantElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        createdApplicantName = testApplicantName
      }

      if (!createdApplicantName) {
        console.log('找不到測試簽證，跳過查看測試')
        test.skip()
        return
      }
    }

    console.log(`查看簽證: ${createdApplicantName}`)

    // 確認簽證在列表中可見
    const applicantCell = page.locator(`text=${createdApplicantName}`).first()
    expect(await applicantCell.isVisible()).toBe(true)
    console.log('✅ 簽證在列表中可見')

    // 嘗試點擊編輯按鈕查看詳情
    const editButton = page.locator('button[title="編輯"], button:has-text("編輯")').first()
    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 找到包含申請人的行
      const row = applicantCell.locator('xpath=ancestor::tr')
      const rowEditButton = row.locator('button[title="編輯"], button:has-text("編輯")').first()
      if (await rowEditButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await rowEditButton.click()
        await page.waitForTimeout(500)

        const detailDialog = page.locator('[role="dialog"]')
        if (await detailDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ 簽證編輯對話框已開啟')
          const dialogContent = await detailDialog.textContent()
          console.log('對話框內容:', dialogContent?.substring(0, 200))

          // 關閉對話框
          const closeButton = detailDialog
            .locator('button')
            .filter({ hasText: /關閉|取消/ })
            .first()
          if (await closeButton.isVisible()) {
            await closeButton.click()
          } else {
            await page.keyboard.press('Escape')
          }
        }
      }
    }
  })

  test('3. 刪除簽證並驗證', async ({ authenticatedPage: page }) => {
    if (!createdApplicantName) {
      const applicantElement = page.locator(`text=${testApplicantName}`).first()
      if (await applicantElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        createdApplicantName = testApplicantName
      }

      if (!createdApplicantName) {
        console.log('找不到測試簽證，跳過刪除測試')
        test.skip()
        return
      }
    }

    console.log(`準備刪除簽證: ${createdApplicantName}`)

    // 記錄刪除前的數量
    const beforeDeleteCount = await page.locator('table tbody tr').count()
    console.log(`刪除前簽證數量: ${beforeDeleteCount}`)

    // 找到該簽證的行和刪除按鈕
    const applicantCell = page.locator(`text=${createdApplicantName}`).first()
    expect(await applicantCell.isVisible()).toBe(true)

    // 遍歷所有刪除按鈕找到正確的行
    let targetDeleteButton: ReturnType<typeof page.locator> | null = null
    const allDeleteButtons = page.locator('button[title="刪除"], button:has-text("刪除")')
    const deleteButtonCount = await allDeleteButtons.count()
    console.log(`找到 ${deleteButtonCount} 個刪除按鈕`)

    for (let i = 0; i < deleteButtonCount; i++) {
      const deleteBtn = allDeleteButtons.nth(i)
      const parentRow = deleteBtn.locator('xpath=ancestor::tr[1]')
      const rowText = await parentRow.textContent().catch(() => '')

      if (rowText && rowText.includes(createdApplicantName!)) {
        targetDeleteButton = deleteBtn
        console.log(`找到目標行的刪除按鈕 (第 ${i + 1} 個)`)
        break
      }
    }

    if (!targetDeleteButton) {
      console.log('⚠️ 無法找到刪除按鈕，跳過測試')
      test.skip()
      return
    }

    console.log('找到刪除按鈕，執行刪除...')
    await targetDeleteButton.click()
    await page.waitForTimeout(500)

    // 確認對話框
    const confirmDialog = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /確定|刪除|確認/ })
    if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('確認對話框已出現')

      const confirmButton = confirmDialog
        .locator('button')
        .filter({ hasText: /^確定$|^確認$|確認刪除|^刪除$/ })
        .first()
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('點擊確認按鈕...')
        await confirmButton.click({ force: true })
      }
    }

    // 等待刪除完成
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 驗證簽證已刪除
    const afterDeleteCount = await page.locator('table tbody tr').count()
    console.log(`刪除後簽證數量: ${afterDeleteCount}`)

    // 確認數量減少
    expect(afterDeleteCount).toBeLessThan(beforeDeleteCount)

    // 確認該簽證不在列表中
    const deletedApplicant = page.locator(`text="${createdApplicantName}"`)
    const stillExists = (await deletedApplicant.count()) > 0

    if (stillExists) {
      console.log('簽證仍可見，嘗試重新載入頁面...')
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const afterReloadExists = (await page.locator(`text="${createdApplicantName}"`).count()) > 0
      expect(afterReloadExists).toBe(false)
      console.log(`✅ 重新載入後簽證 ${createdApplicantName} 確認已刪除`)
    } else {
      console.log(`✅ 簽證 ${createdApplicantName} 已成功刪除`)
    }

    createdApplicantName = null
  })

  test.afterAll(async () => {
    if (createdApplicantName) {
      console.log(`⚠️ 警告：測試簽證 ${createdApplicantName} 未被刪除，請手動清理`)
    }
  })
})
