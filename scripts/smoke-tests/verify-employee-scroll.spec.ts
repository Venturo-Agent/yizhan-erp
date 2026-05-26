/**
 * 驗 hr/_components/EmployeeForm.tsx 修完 dialog 內可滾動
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

test('employee edit dialog should scroll', async ({ page }) => {
  test.setTimeout(60_000)

  // 登入
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('公司代號').fill('VENTURO')
  await page.getByPlaceholder('Email').fill('smoke@venturo.tw')
  await page.getByPlaceholder('密碼').fill('smoke-test-12345')
  await page.getByRole('button', { name: /登入/ }).click()
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30_000 })

  // 進 /hr
  await page.goto(`${BASE}/hr`)
  await page.waitForTimeout(3000)

  // 點 員工 row（第一筆）
  await page.locator('table tbody tr').first().click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/smoke-screens/_hr_employee_dialog_open.png', fullPage: true })

  // 找到 form、scroll 看能不能動
  const form = page.locator('form').first()
  const scrollableInfo = await form.evaluate(el => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    isScrollable: el.scrollHeight > el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }))

  console.log('form scroll info:', scrollableInfo)
  expect(scrollableInfo.overflowY).toMatch(/auto|scroll/)

  // 試 scroll 到底
  await form.evaluate(el => {
    el.scrollTo({ top: el.scrollHeight })
  })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: '/tmp/smoke-screens/_hr_employee_dialog_scrolled.png',
    fullPage: true,
  })

  const after = await form.evaluate(el => el.scrollTop)
  console.log('scrollTop after scroll-to-bottom:', after)
  expect(after).toBeGreaterThan(0)
})
