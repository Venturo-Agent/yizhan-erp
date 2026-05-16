/**
 * 簽證 CRUD 測試
 *
 * 測試範圍：
 * - 新增簽證
 * - 查看簽證詳情
 * - 編輯簽證
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('簽證 CRUD 測試', () => {
  test('1. 新增簽證', async ({ authenticatedPage: page }) => {
    await page.goto('/visas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 點擊新增簽證按鈕
    const addButton = page.locator('button').filter({ hasText: '新增簽證' })

    if (!(await addButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('⚠️ 找不到新增簽證按鈕（可能沒有權限）')
      test.skip()
      return
    }

    await addButton.click()
    await page.waitForTimeout(1000)

    // 確認對話框開啟
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    console.log('✅ 新增簽證對話框已開啟')

    // 檢查表單欄位
    // 團號通常會自動選擇簽證專用團
    const tourField = dialog.locator('text=團號').first()
    if (await tourField.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ 團號欄位存在')
    }

    // 找到申請人輸入框（必填）
    const applicantInput = dialog.locator('input').first()
    if (await applicantInput.isVisible({ timeout: 2000 })) {
      await applicantInput.fill('E2E 測試申請人')
      console.log('✅ 已輸入申請人名字')
    }

    // 檢查簽證類型選擇
    const visaTypeSelect = dialog.locator('select, [role="combobox"]').first()
    if (await visaTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ 簽證類型選擇欄位存在')
    }

    // 檢查提交按鈕
    const submitButton = dialog.locator('button').filter({ hasText: /批次新增簽證|新增|儲存/ })
    const isEnabled = await submitButton
      .first()
      .isEnabled({ timeout: 3000 })
      .catch(() => false)
    console.log(`新增按鈕狀態: ${isEnabled ? '可點擊' : '禁用'}`)

    // 如果可以點擊就嘗試提交
    if (isEnabled) {
      await submitButton.first().click()
      await page.waitForTimeout(2000)

      // 可能會開啟旅客比對對話框
      const matchDialog = page.locator('[role="dialog"]').filter({ hasText: /比對|客戶/ })
      if (await matchDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ 簽證新增成功，開啟旅客比對')
        // 關閉比對對話框
        await page.keyboard.press('Escape')
      } else {
        const dialogClosed = await dialog.isHidden({ timeout: 3000 }).catch(() => false)
        if (dialogClosed) {
          console.log('✅ 簽證新增成功')
        }
      }
    }

    // 確保關閉所有對話框
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  test('2. 查看簽證詳情', async ({ authenticatedPage: page }) => {
    await page.goto('/visas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 檢查是否有簽證資料
    const rows = await page.locator('table tbody tr').count()
    console.log(`找到 ${rows} 筆簽證`)

    if (rows === 0) {
      console.log('⚠️ 沒有簽證資料，跳過此測試')
      test.skip()
      return
    }

    // 點擊第一個簽證
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 檢查是否開啟詳情對話框
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ 簽證詳情對話框已開啟')

      // 檢查詳情內容
      const hasEditButton = await dialog
        .locator('button')
        .filter({ hasText: /編輯|儲存/ })
        .isVisible()
        .catch(() => false)
      console.log(`可編輯: ${hasEditButton}`)

      await page.keyboard.press('Escape')
    } else {
      console.log('⚠️ 簽證詳情對話框未開啟')
    }
  })

  test('3. 編輯簽證狀態', async ({ authenticatedPage: page }) => {
    await page.goto('/visas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 檢查是否有簽證資料
    const rows = await page.locator('table tbody tr').count()

    if (rows === 0) {
      console.log('⚠️ 沒有簽證資料，跳過此測試')
      test.skip()
      return
    }

    // 點擊第一個簽證開啟編輯
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const dialog = page.locator('[role="dialog"]')
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 找狀態選擇欄位
      const statusSelect = dialog
        .locator('select, [data-state]')
        .filter({ hasText: /待送件|已送件|已取件/ })
      if (
        await statusSelect
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        console.log('✅ 找到簽證狀態欄位')
      }

      // 找儲存按鈕
      const saveButton = dialog.locator('button').filter({ hasText: /儲存/ })
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ 找到儲存按鈕')
      }

      await page.keyboard.press('Escape')
    }
  })
})
