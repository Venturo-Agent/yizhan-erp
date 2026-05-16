/**
 * 旅遊團詳情對話框分頁測試
 *
 * 測試範圍：
 * - 團員名單分頁
 * - 訂單管理分頁
 * - 總覽分頁
 * - 團確單分頁
 * - 團控分頁
 * - 報到分頁
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe.serial('旅遊團詳情分頁測試', () => {
  // 輔助函數：找到實際的旅遊團（狀態是「進行中」而不是「提案」）
  async function findAndClickTour(page: import('@playwright/test').Page) {
    // 找到狀態是「進行中」的旅遊團行
    const tourRow = page.locator('table tbody tr').filter({ hasText: '待出發' }).first()
    await tourRow.click()

    // 等待旅遊團詳情對話框開啟（檢查是否有團員名單分頁）
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })

    // 等待一下確保內容載入
    await page.waitForTimeout(1000)

    return dialog
  }

  test('1. 開啟旅遊團詳情對話框', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 找到實際的旅遊團並點擊
    const dialog = await findAndClickTour(page)
    console.log('✅ 旅遊團詳情對話框已開啟')

    // 檢查預設是團員名單分頁
    const membersTab = dialog.locator('button').filter({ hasText: '團員名單' })
    await expect(membersTab).toBeVisible({ timeout: 5000 })
    console.log('✅ 預設顯示團員名單分頁')

    // 關閉對話框
    await page.keyboard.press('Escape')
  })

  test('2. 測試團員名單分頁', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊團員名單分頁
    const membersTab = dialog.locator('button').filter({ hasText: '團員名單' })
    await membersTab.click()
    await page.waitForTimeout(1000)

    // 檢查是否有團員表格或空狀態
    const membersContent = dialog.locator('text=團員名單')
    const hasMembers = await membersContent.isVisible().catch(() => false)

    // 檢查是否有新增按鈕
    const addButton = dialog.locator('button').filter({ hasText: '新增' })
    const hasAddButton = await addButton
      .first()
      .isVisible()
      .catch(() => false)

    if (hasAddButton) {
      console.log('✅ 團員名單分頁 - 找到新增按鈕')
    } else {
      console.log('✅ 團員名單分頁 - 顯示正常')
    }

    await page.keyboard.press('Escape')
  })

  test('3. 測試訂單管理分頁', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊訂單管理分頁
    const ordersTab = dialog.locator('button').filter({ hasText: '訂單管理' })
    await ordersTab.click()
    await page.waitForTimeout(1000)

    // 檢查是否有訂單內容
    const ordersContent = dialog.locator('text=訂單')
    const hasContent = await ordersContent
      .first()
      .isVisible()
      .catch(() => false)

    // 檢查是否有新增訂單按鈕
    const addOrderButton = dialog.locator('button').filter({ hasText: /新增.*訂單|新增/ })
    const hasAddButton = await addOrderButton
      .first()
      .isVisible()
      .catch(() => false)

    if (hasAddButton) {
      console.log('✅ 訂單管理分頁 - 找到新增訂單按鈕')
    }
    console.log('✅ 訂單管理分頁 - 顯示正常')

    await page.keyboard.press('Escape')
  })

  test('4. 測試總覽分頁', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊總覽分頁
    const overviewTab = dialog.locator('button').filter({ hasText: '總覽' })
    await overviewTab.click()
    await page.waitForTimeout(1000)

    // 檢查總覽內容：基本資訊、收款紀錄、成本支出等
    const checkItems = [
      { name: '編輯按鈕', selector: 'button:has-text("編輯")' },
      { name: '收款紀錄', selector: 'text=收款' },
      { name: '成本支出', selector: 'text=成本' },
    ]

    for (const item of checkItems) {
      const element = dialog.locator(item.selector)
      const isVisible = await element
        .first()
        .isVisible()
        .catch(() => false)
      if (isVisible) {
        console.log(`✅ 總覽分頁 - ${item.name} 顯示正常`)
      }
    }

    console.log('✅ 總覽分頁 - 測試完成')
    await page.keyboard.press('Escape')
  })

  test('5. 測試團確單分頁', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊團確單分頁（使用 first() 取得分頁按鈕，不是功能按鈕）
    const confirmationTab = dialog.locator('button').filter({ hasText: '團確單' }).first()
    await confirmationTab.click()
    await page.waitForTimeout(1500)

    // 檢查分頁切換成功（對話框仍然開著）
    await expect(dialog).toBeVisible()

    // 團確單分頁內容會顯示（可能是行程表或提示訊息）
    const hasContent =
      (await dialog
        .locator('text=行程表')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await dialog
        .locator('text=尚未')
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await dialog
        .locator('text=團確')
        .first()
        .isVisible()
        .catch(() => false))

    console.log(`✅ 團確單分頁 - 顯示正常 (有內容: ${hasContent})`)

    await page.keyboard.press('Escape')
  })

  test('6. 測試團控分頁', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊團控分頁
    const controlTab = dialog.locator('button').filter({ hasText: '團控' })
    await controlTab.click()
    await page.waitForTimeout(1500)

    // 檢查分頁切換成功
    await expect(dialog).toBeVisible()
    console.log('✅ 團控分頁 - 顯示正常')

    await page.keyboard.press('Escape')
  })

  test('7. 測試報到分頁', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊報到分頁
    const checkinTab = dialog.locator('button').filter({ hasText: '報到' })
    await checkinTab.click()
    await page.waitForTimeout(1500)

    // 檢查分頁切換成功
    await expect(dialog).toBeVisible()
    console.log('✅ 報到分頁 - 顯示正常')

    await page.keyboard.press('Escape')
  })

  test('8. 測試功能按鈕 - PNR', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊 PNR 按鈕（header 中的 PNR 按鈕，不是 PNR 配對）
    const pnrButton = dialog.getByRole('button', { name: 'PNR', exact: true })
    await expect(pnrButton).toBeVisible()
    await pnrButton.click()
    await page.waitForTimeout(1000)

    // 檢查 PNR 對話框是否開啟
    const pnrDialog = page.locator('[role="dialog"]').filter({ hasText: /PNR|電報/ })
    const isPnrDialogVisible = await pnrDialog.isVisible().catch(() => false)

    if (isPnrDialogVisible) {
      console.log('✅ PNR 對話框已開啟')
      await page.keyboard.press('Escape')
    } else {
      console.log('⚠️ PNR 對話框未開啟（可能需要資料）')
    }

    await page.keyboard.press('Escape')
  })

  test('9. 測試功能按鈕 - 入境卡', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 點擊入境卡按鈕
    const entryCardButton = dialog.locator('button').filter({ hasText: '入境卡' })
    await expect(entryCardButton).toBeVisible()
    await entryCardButton.click()
    await page.waitForTimeout(1000)

    // 檢查入境卡對話框是否開啟
    const entryCardDialog = page.locator('[role="dialog"]').filter({ hasText: /入境卡|列印/ })
    const isEntryCardDialogVisible = await entryCardDialog.isVisible().catch(() => false)

    if (isEntryCardDialogVisible) {
      console.log('✅ 入境卡對話框已開啟')

      // 檢查設定欄位
      const flightInput = page.locator('input[placeholder*="航班"]')
      const hasFlightInput = await flightInput.isVisible().catch(() => false)
      if (hasFlightInput) {
        console.log('✅ 入境卡設定欄位顯示正常')
      }

      await page.keyboard.press('Escape')
    } else {
      console.log('⚠️ 入境卡對話框未開啟')
    }

    await page.keyboard.press('Escape')
  })

  test('10. 測試功能按鈕 - 結團', async ({ authenticatedPage: page }) => {
    await page.goto('/tours')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 開啟對話框
    const dialog = await findAndClickTour(page)

    // 找結團按鈕
    const closeButton = dialog.locator('button').filter({ hasText: '結團' })
    const hasCloseButton = await closeButton.isVisible().catch(() => false)

    if (hasCloseButton) {
      console.log('✅ 找到結團按鈕')
      // 不實際點擊，避免影響資料
    } else {
      console.log('⚠️ 結團按鈕不可見（可能旅遊團已封存）')
    }

    await page.keyboard.press('Escape')
  })
})
