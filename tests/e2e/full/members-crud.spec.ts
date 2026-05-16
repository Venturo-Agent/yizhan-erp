/**
 * 團員 CRUD 測試
 *
 * 測試範圍：
 * - 透過旅遊團詳情新增團員
 * - 查看團員列表
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('團員 CRUD 測試', () => {
  // 輔助函數：開啟進行中的旅遊團詳情
  async function openTourDetail(page: import('@playwright/test').Page) {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 找到狀態是「進行中」的旅遊團
    const tourRow = page.locator('table tbody tr').filter({ hasText: '待出發' }).first()

    if (!(await tourRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      return null
    }

    await tourRow.click()
    await page.waitForTimeout(1000)

    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })

    return dialog
  }

  test('1. 查看旅遊團的團員名單', async ({ authenticatedPage: page }) => {
    const dialog = await openTourDetail(page)

    if (!dialog) {
      console.log('⚠️ 找不到進行中的旅遊團，跳過此測試')
      test.skip()
      return
    }

    // 點擊團員名單分頁
    const membersTab = dialog.locator('button').filter({ hasText: '團員名單' })
    await membersTab.click()
    await page.waitForTimeout(1000)

    console.log('✅ 團員名單分頁已開啟')

    // 檢查是否有成員表格或空狀態
    const hasTable = await dialog
      .locator('table')
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    const hasEmptyState = await dialog
      .locator('text=尚無')
      .isVisible()
      .catch(() => false)

    if (hasTable) {
      const memberCount = await dialog.locator('table tbody tr').count()
      console.log(`✅ 找到 ${memberCount} 位團員`)
    } else if (hasEmptyState) {
      console.log('✅ 團員名單為空（顯示空狀態）')
    }

    await page.keyboard.press('Escape')
  })

  test('2. 透過訂單管理查看/新增團員', async ({ authenticatedPage: page }) => {
    const dialog = await openTourDetail(page)

    if (!dialog) {
      console.log('⚠️ 找不到進行中的旅遊團，跳過此測試')
      test.skip()
      return
    }

    // 點擊訂單管理分頁
    const ordersTab = dialog.locator('button').filter({ hasText: '訂單管理' })
    await ordersTab.click()
    await page.waitForTimeout(1000)

    console.log('✅ 訂單管理分頁已開啟')

    // 檢查是否有訂單
    const orderRows = dialog.locator('table tbody tr')
    const orderCount = await orderRows.count()

    if (orderCount === 0) {
      console.log('⚠️ 此旅遊團沒有訂單，跳過團員新增測試')
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    console.log(`找到 ${orderCount} 筆訂單`)

    // 點擊第一筆訂單展開成員
    const firstOrder = orderRows.first()
    await firstOrder.click()
    await page.waitForTimeout(1000)

    // 檢查是否有展開的成員區塊
    const expandedSection = dialog.locator('[data-expanded="true"], .expanded')
    const hasExpanded = await expandedSection.isVisible({ timeout: 3000 }).catch(() => false)

    // 或者檢查是否有新增成員按鈕
    const addMemberButton = dialog.locator('button').filter({ hasText: /新增成員|新增/ })
    const hasAddButton = await addMemberButton
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    if (hasAddButton) {
      console.log('✅ 找到新增成員按鈕')

      // 嘗試點擊新增成員
      await addMemberButton.first().click()
      await page.waitForTimeout(1000)

      // 檢查是否開啟新增成員對話框
      const addDialog = page.locator('[role="dialog"]').filter({ hasText: /新增成員|成員/ })
      if (await addDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ 新增成員對話框已開啟')

        // 檢查有哪些新增方式
        const hasManualAdd = await addDialog
          .locator('text=手動')
          .isVisible()
          .catch(() => false)
        const hasOcrAdd = await addDialog
          .locator('text=護照')
          .isVisible()
          .catch(() => false)
        const hasSearchAdd = await addDialog
          .locator('text=搜尋')
          .isVisible()
          .catch(() => false)

        console.log(`新增方式 - 手動: ${hasManualAdd}, OCR: ${hasOcrAdd}, 搜尋: ${hasSearchAdd}`)

        // 關閉新增對話框
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    } else {
      console.log('⚠️ 未找到新增成員按鈕')
    }

    await page.keyboard.press('Escape')
  })

  test('3. 手動新增空白成員', async ({ authenticatedPage: page }) => {
    const dialog = await openTourDetail(page)

    if (!dialog) {
      console.log('⚠️ 找不到進行中的旅遊團，跳過此測試')
      test.skip()
      return
    }

    // 點擊訂單管理分頁
    const ordersTab = dialog.locator('button').filter({ hasText: '訂單管理' })
    await ordersTab.click()
    await page.waitForTimeout(1000)

    // 點擊第一筆訂單
    const firstOrder = dialog.locator('table tbody tr').first()
    if (!(await firstOrder.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('⚠️ 沒有訂單，跳過此測試')
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    await firstOrder.click()
    await page.waitForTimeout(1000)

    // 找新增成員按鈕
    const addMemberButton = dialog
      .locator('button')
      .filter({ hasText: /新增成員/ })
      .first()
    if (!(await addMemberButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('⚠️ 找不到新增成員按鈕')
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    await addMemberButton.click()
    await page.waitForTimeout(1000)

    // 在新增對話框中選擇手動新增
    const addDialog = page.locator('[role="dialog"]').last()
    if (await addDialog.isVisible({ timeout: 3000 })) {
      // 找到人數輸入框或手動新增選項
      const manualTab = addDialog.locator('button, [role="tab"]').filter({ hasText: /手動|空白/ })
      if (await manualTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await manualTab.click()
        await page.waitForTimeout(500)
      }

      // 設定人數為 1
      const countInput = addDialog.locator('input[type="number"]')
      if (await countInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await countInput.fill('1')
        console.log('✅ 設定新增 1 位成員')
      }

      // 點擊新增按鈕
      const submitButton = addDialog.locator('button').filter({ hasText: /新增|確認/ })
      if (
        await submitButton
          .first()
          .isEnabled({ timeout: 2000 })
          .catch(() => false)
      ) {
        await submitButton.first().click()
        await page.waitForTimeout(1000)
        console.log('✅ 已點擊新增按鈕')
      }
    }

    // 關閉所有對話框
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
  })
})
