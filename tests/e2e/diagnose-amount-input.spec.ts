/**
 * 診斷腳本：金額輸入到底壞在哪
 *
 * 不是正式測試、跑完手動觀察 console output、找出 root cause。
 * 跑法：npx playwright test diagnose-amount-input.spec.ts --headed
 */

import { test, expect } from './fixtures/auth.fixture'

test('診斷：請款 dialog 的單價 / 數量輸入', async ({ authenticatedPage: page }) => {
  test.setTimeout(60000)

  // 攔截 console + page errors、看 React / next-intl 有沒有抱怨
  page.on('console', msg => console.log(`[browser ${msg.type()}]`, msg.text()))
  page.on('pageerror', err => console.log('[browser error]', err.message))

  await page.goto('/finance/requests')
  await page.waitForLoadState('networkidle')

  // 開 dialog（新增請款）
  const addButton = page.getByRole('button', { name: /新增請款|新增/ }).first()
  await addButton.click()
  await page.waitForTimeout(500)

  // 選一團
  // 找團 dropdown（Combobox / Select）
  const tourSelector = page.locator('button:has-text("選擇旅遊團"), [role="combobox"]').first()
  if (await tourSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tourSelector.click()
    await page.waitForTimeout(300)
    // 選第一個
    const firstOption = page.locator('[role="option"]').first()
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click()
    }
  }

  await page.waitForTimeout(500)

  // 找單價 input
  // CalcInput 是 type="text" inputMode="decimal"、placeholder="0"
  const unitPriceInputs = page.locator('input[inputmode="decimal"]')
  const count = await unitPriceInputs.count()
  console.log(`[diagnose] 找到 ${count} 個 inputMode="decimal" input`)

  if (count === 0) {
    // 拍個圖
    await page.screenshot({ path: '/tmp/no-inputs.png', fullPage: true })
    console.log('[diagnose] 沒找到、screenshot 存 /tmp/no-inputs.png')
    return
  }

  // 對第一個 input（理論上單價）做完整診斷
  const first = unitPriceInputs.first()

  // 1. 印 DOM 屬性
  const props = await first.evaluate((el: HTMLInputElement) => ({
    tag: el.tagName,
    type: el.type,
    inputMode: el.inputMode,
    disabled: el.disabled,
    readOnly: el.readOnly,
    value: el.value,
    placeholder: el.placeholder,
    className: el.className,
    pointerEvents: getComputedStyle(el).pointerEvents,
    visibility: getComputedStyle(el).visibility,
    display: getComputedStyle(el).display,
    opacity: getComputedStyle(el).opacity,
    boundingRect: el.getBoundingClientRect().toJSON(),
  }))
  console.log('[diagnose] 單價 input 屬性:', JSON.stringify(props, null, 2))

  // 2. 找祖先有沒有 pointer-events:none
  const ancestorChain = await first.evaluate((el: HTMLInputElement) => {
    const chain: { tag: string; pointerEvents: string; opacity: string; className: string }[] = []
    let cur: HTMLElement | null = el
    while (cur) {
      const cs = getComputedStyle(cur)
      chain.push({
        tag: cur.tagName,
        pointerEvents: cs.pointerEvents,
        opacity: cs.opacity,
        className: cur.className.toString().slice(0, 80),
      })
      cur = cur.parentElement
    }
    return chain
  })
  console.log('[diagnose] 祖先鏈:')
  ancestorChain.forEach((a, i) => console.log(`  ${i}. ${a.tag} pe=${a.pointerEvents} op=${a.opacity} cls="${a.className}"`))

  // 3. 嘗試聚焦 + 輸入
  await first.click({ force: false })
  await page.waitForTimeout(200)

  const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
  console.log(`[diagnose] 點擊後 activeElement = ${focusedTag}`)

  // 4. 鍵盤打字
  await page.keyboard.type('123')
  await page.waitForTimeout(300)

  const afterType = await first.evaluate((el: HTMLInputElement) => el.value)
  console.log(`[diagnose] 鍵盤打 "123" 後、input.value = "${afterType}"`)

  // 5. 直接 fill
  await first.fill('456')
  await page.waitForTimeout(300)
  const afterFill = await first.evaluate((el: HTMLInputElement) => el.value)
  console.log(`[diagnose] fill("456") 後、input.value = "${afterFill}"`)

  // 6. blur 看會不會被 onChange 蓋
  await page.keyboard.press('Tab')
  await page.waitForTimeout(500)
  const afterBlur = await first.evaluate((el: HTMLInputElement) => el.value)
  console.log(`[diagnose] blur 後、input.value = "${afterBlur}"`)

  // 7. 截圖
  await page.screenshot({ path: '/tmp/amount-after.png', fullPage: true })
  console.log('[diagnose] 截圖存 /tmp/amount-after.png')

  // 軟斷言、不擋 (這是診斷不是 gate)
  expect(true).toBe(true)
})
