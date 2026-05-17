/**
 * 建立租戶 onboarding 流程 walkthrough（William 2026-05-17 拍板）
 *
 * 為什麼存在：
 *   驛站 ERP 之後要做使用手冊、得先把租戶 onboarding 從頭跑一次。
 *   現在已知症狀：「建立分公司失敗」會跳 toast、原因待抓。
 *   這隻 spec 跑完一次完整流程、把任何錯誤 toast / API 5xx 攔下來給 William 看。
 *
 * 涵蓋範圍：
 *   1. 用 CORNER 系統主管身分登入
 *   2. 進入「租戶管理」
 *   3. 開「新增租戶」對話框
 *   4. 填基本資料（公司名「第一間測試」、代號、統編）
 *   5. 不勾「多分公司」「多部門」→ 走 placeholder fallback
 *   6. 填第一位系統主管姓名 + Email
 *   7. 按「建立租戶」、等結果
 *   8. 把 toast / 後端錯誤訊息打到 console、test failure 顯示 root cause
 *
 * 怎麼跑：
 *   npm run test:e2e:headed -- tenant-create-walkthrough
 *
 *   需要 dev server 在 :3000、Corner 測試帳號（見 .env.example）。
 */

import { test, expect } from '@playwright/test'
import { login, TEST_CREDENTIALS } from './fixtures/auth.fixture'

// 為了不撞既有資料、每次跑加 timestamp suffix
const STAMP = Date.now().toString().slice(-6)
const NEW_TENANT_NAME = `第一間測試-${STAMP}`
const NEW_TENANT_CODE = `TST${STAMP}`
const NEW_TENANT_TAX_ID = String(10000000 + (Number(STAMP) % 89999999)).slice(0, 8)
const ADMIN_NAME = '測試主管'
const ADMIN_EMAIL = `admin-${STAMP}@example.com`

test.describe('租戶 onboarding walkthrough', () => {
  test('用 CORNER 主管建立新租戶「第一間測試」單品牌單分公司單部門', async ({ page }) => {
    // ① 收集 API 與 console 錯誤、Test 結尾統一報告
    const apiErrors: string[] = []
    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('response', async res => {
      if (res.url().includes('/api/tenants/create') && !res.ok()) {
        let body = ''
        try {
          body = await res.text()
        } catch {
          /* ignore */
        }
        apiErrors.push(`POST ${res.url()} → ${res.status()} ${body}`)
      }
    })

    // ② 用 CORNER 主管登入
    await login(page, TEST_CREDENTIALS)

    // ③ 進入租戶管理頁
    await page.goto('/workspaces')
    await expect(page.getByRole('heading', { name: '租戶管理' })).toBeVisible({ timeout: 15000 })

    // ④ 開「新增租戶」對話框
    await page.getByRole('button', { name: '新增租戶' }).click()
    await expect(page.getByRole('heading', { name: '公司資料' })).toBeVisible()

    // ⑤ 填基本資料
    await page.getByPlaceholder('例如：XX旅行社、XX旅遊').fill(NEW_TENANT_NAME)
    await page.getByPlaceholder('例如：CORNER、DEMO（英文大寫）').fill(NEW_TENANT_CODE)
    await page.getByPlaceholder('8 碼數字（例：12345678）').fill(NEW_TENANT_TAX_ID)

    // ⑥ 品牌設定 — 加 1 個品牌（驗證移除代號 input 後 UI 不爆）
    await page.getByRole('button', { name: '+ 新增品牌' }).click()
    const brandNameInputs = page.locator('input[placeholder*="品牌名稱"]')
    await expect(brandNameInputs.first()).toBeVisible()
    await brandNameInputs.first().fill(NEW_TENANT_NAME)

    // ⑦ 不勾「多分公司」「多部門」→ 後端 fallback 建「總部」+「總公司」placeholder
    //    這條路徑曾經出現「建立分公司失敗」、是這隻 spec 要抓的主嫌

    // ⑧ 填第一位系統主管
    await page.getByPlaceholder('系統主管姓名').fill(ADMIN_NAME)
    await page.getByPlaceholder('例：admin@jinyang.com.tw').fill(ADMIN_EMAIL)

    // ⑨ 按「建立租戶」
    await page.getByRole('button', { name: '建立租戶' }).click()

    // ⑩ 等結果：成功 → 跳「建立完成」step；失敗 → toast「建立分公司失敗」之類
    const done = page.getByRole('heading', { name: '建立完成' })
    const failureToast = page.locator('text=/建立.*失敗|失敗/i').first()

    await Promise.race([
      done.waitFor({ state: 'visible', timeout: 25000 }).catch(() => null),
      failureToast.waitFor({ state: 'visible', timeout: 25000 }).catch(() => null),
    ])

    // ⑪ 收集診斷資訊、永遠列印讓 William 看
    if (apiErrors.length) {
      console.log('🔴 API 錯誤：\n' + apiErrors.join('\n'))
    }
    if (consoleErrors.length) {
      console.log('🟡 Console 錯誤：\n' + consoleErrors.join('\n'))
    }

    // ⑫ 最終斷言
    await expect(done, [
      `「建立完成」沒出現，可能命中過去的「建立分公司失敗」bug。`,
      `API 錯誤: ${apiErrors.join('; ') || '(無)'}`,
      `Console 錯誤: ${consoleErrors.join('; ') || '(無)'}`,
    ].join('\n')).toBeVisible({ timeout: 5000 })

    // ⑬ 成功的話、確認登入資訊區塊有出現公司代號
    await expect(page.locator(`text=${NEW_TENANT_CODE}`)).toBeVisible()
  })
})
