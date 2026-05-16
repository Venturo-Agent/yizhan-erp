/**
 * 全域設定 - 登入一次，所有測試共用
 */

import { chromium, FullConfig } from '@playwright/test'
import { TEST_CREDENTIALS } from './fixtures/auth.fixture'

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // 登入（2026-05-11 改 Email 登入、placeholder 跟著改）
  await page.goto(`${baseURL}/login`)
  await page.waitForSelector('input[placeholder="公司代號"]')

  await page.fill('input[placeholder="公司代號"]', TEST_CREDENTIALS.companyCode)
  await page.fill('input[placeholder="Email"]', TEST_CREDENTIALS.email)
  await page.fill('input[placeholder="密碼"]', TEST_CREDENTIALS.password)
  await page.click('button[type="submit"]')

  // 等待登入成功
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })

  // 儲存登入狀態
  await page.context().storageState({ path: storageState as string })

  await browser.close()
}

export default globalSetup
