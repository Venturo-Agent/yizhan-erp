/**
 * Tab 權限 gating 驗證（end-to-end）
 *
 * 流程：
 * 1. SQL：關掉 TESTUX 的 tours.requirements（= 需求 tab）
 * 2. Playwright：登入 TESTUX、進 /hr/roles
 * 3. 驗證：展開「旅遊團管理」→ 不該看到「需求」
 * 4. SQL：把 tours.requirements 開回去
 * 5. Playwright 重整頁面 → 驗證「需求」回來
 */

import { test, expect } from './fixtures/auth.fixture'

const TESTUX_ID = process.env.TEST_USER_ID || ''
const SB_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ''
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || ''
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function setFeatureEnabled(featureCode: string, enabled: boolean) {
  const res = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `UPDATE workspace_features SET enabled = ${enabled} WHERE workspace_id = '${TESTUX_ID}' AND feature_code = '${featureCode}'`,
    }),
  })
  if (!res.ok) throw new Error(`SQL failed: ${await res.text()}`)
}

test.describe('Tab 權限 gating (end-to-end)', () => {
  test.beforeAll(async () => {
    // 確保 tours 模組和需求 tab 一開始都是開
    await setFeatureEnabled('tours', true)
    await setFeatureEnabled('tours.requirements', true)
  })

  test.afterAll(async () => {
    // 收尾：把 tab 開回來
    await setFeatureEnabled('tours.requirements', true)
  })

  test('關掉 tours.requirements → /hr/roles 不該看到「需求」', async ({
    authenticatedPage: page,
  }) => {
    // 1. SQL 關掉需求 tab
    await setFeatureEnabled('tours.requirements', false)

    // 2. 進 /hr/roles、重整拿最新 features
    await page.goto('/hr/roles')
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 3. 展開 tours 模組（找標題「旅遊團管理」對應的展開按鈕）
    const toursRow = page.locator('text=旅遊團管理').first()
    await expect(toursRow, 'tours module 應該顯示').toBeVisible({ timeout: 10000 })

    // 如果 module 預設展開、tabs 直接可見
    // 如果是折疊的、點 chevron 展開
    const chevron = toursRow.locator('..').locator('button').first()
    if (await chevron.isVisible().catch(() => false)) {
      await chevron.click()
      await page.waitForTimeout(500)
    }

    // 4. 驗證：權限清單裡找不到「需求」
    // /hr/roles 的權限表是每個 tab 一行、左側有 tab 名稱
    // 看整頁 body 有沒有「需求」字（要排除其他地方的「需求」）
    // 最穩：找 tbody 內的 tab-name cell 有沒有精確匹配「需求」
    const requirementsTabCell = page
      .locator('td, div')
      .filter({ hasText: /^\s*需求\s*$/ })
      .first()
    const visible = await requirementsTabCell.isVisible({ timeout: 3000 }).catch(() => false)

    expect(visible, '需求 tab 應該被隱藏、但有顯示').toBe(false)
  })

  test('開回 tours.requirements → 需求 tab 回來', async ({ authenticatedPage: page }) => {
    // 1. SQL 開回
    await setFeatureEnabled('tours.requirements', true)

    // 2. 進 /hr/roles
    await page.goto('/hr/roles')
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 3. 展開 tours
    const toursRow = page.locator('text=旅遊團管理').first()
    await expect(toursRow).toBeVisible({ timeout: 10000 })

    const chevron = toursRow.locator('..').locator('button').first()
    if (await chevron.isVisible().catch(() => false)) {
      await chevron.click()
      await page.waitForTimeout(500)
    }

    // 4. 驗證：需求 tab 應出現
    const requirementsTabCell = page
      .locator('td, div')
      .filter({ hasText: /^\s*需求\s*$/ })
      .first()
    await expect(requirementsTabCell, '需求 tab 應該回來').toBeVisible({ timeout: 5000 })
  })
})
