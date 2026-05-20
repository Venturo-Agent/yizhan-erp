#!/usr/bin/env node
/**
 * 診斷腳本：實際登入打開請款 dialog、看單價 / 數量 input 怎麼了。
 *
 * 不走 playwright test runner（會跟現有 dev server 撞 EADDRINUSE）、
 * 直接用 playwright chromium。dev server 應該已經在 3000 跑。
 *
 * 跑法：node scripts/diagnose-amount-input.mjs
 */

import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const COMPANY = process.env.TEST_COMPANY_CODE || 'CORNER'
const EMAIL = process.env.TEST_EMAIL || 'e001@testux.local'
const PASSWORD = process.env.TEST_PASSWORD || '00000000'

const log = (...args) => console.log('[diagnose]', ...args)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  page.on('console', msg => console.log(`  [browser ${msg.type()}]`, msg.text()))
  page.on('pageerror', err => console.log('  [browser ERROR]', err.message))

  log('登入中...')
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[placeholder="公司代號"]', { timeout: 15000 })
  await page.fill('input[placeholder="公司代號"]', COMPANY)
  await page.fill('input[placeholder="Email"]', EMAIL)
  await page.fill('input[placeholder="密碼"]', PASSWORD)
  await page.click('button[type="submit"]')

  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 })
  log('登入成功、URL =', page.url())

  log('開 /finance/requests')
  await page.goto(`${BASE}/finance/requests`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // 找新增按鈕
  const candidates = await page.getByRole('button').allTextContents()
  log(`頁面有 ${candidates.length} 個 button、含「新增」字樣的:`, candidates.filter(t => t.includes('新增')).slice(0, 5))

  const addBtn = page.getByRole('button', { name: /新增請款/ }).first()
  const addBtn2 = page.getByRole('button', { name: /^新增$/ }).first()
  let opened = false
  for (const btn of [addBtn, addBtn2]) {
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click()
      opened = true
      break
    }
  }
  if (!opened) {
    log('找不到「新增請款」按鈕、截圖 /tmp/diagnose-no-button.png')
    await page.screenshot({ path: '/tmp/diagnose-no-button.png', fullPage: true })
    await browser.close()
    process.exit(1)
  }
  await page.waitForTimeout(800)

  // 選一團
  log('選團 dropdown...')
  const tourBtn = page.locator('button:has-text("選擇旅遊團"), button:has-text("選擇團")').first()
  if (await tourBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tourBtn.click()
    await page.waitForTimeout(300)
    const opt = page.locator('[role="option"], [role="menuitem"]').first()
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await opt.click()
      log('選了第一個團')
    } else {
      log('沒選團（沒 option 出來）')
    }
  } else {
    log('找不到團 dropdown、可能 dialog 結構不一樣')
  }

  await page.waitForTimeout(500)

  // 找所有 inputMode="decimal" 的 input（CalcInput）
  const inputs = page.locator('input[inputmode="decimal"]')
  const count = await inputs.count()
  log(`找到 ${count} 個 inputMode="decimal" input（CalcInput）`)

  if (count === 0) {
    await page.screenshot({ path: '/tmp/diagnose-no-inputs.png', fullPage: true })
    log('沒 CalcInput、截圖 /tmp/diagnose-no-inputs.png')
    await browser.close()
    process.exit(1)
  }

  for (let i = 0; i < Math.min(count, 2); i++) {
    log(`\n=== Input #${i} 診斷 ===`)
    const el = inputs.nth(i)

    const props = await el.evaluate(node => ({
      tag: node.tagName,
      type: node.type,
      inputMode: node.inputMode,
      disabled: node.disabled,
      readOnly: node.readOnly,
      value: node.value,
      placeholder: node.placeholder,
      className: node.className,
      pointerEvents: getComputedStyle(node).pointerEvents,
      visibility: getComputedStyle(node).visibility,
      display: getComputedStyle(node).display,
      opacity: getComputedStyle(node).opacity,
      tabIndex: node.tabIndex,
      rect: node.getBoundingClientRect().toJSON(),
    }))
    log('DOM 屬性:', JSON.stringify(props, null, 2))

    // 祖先鏈 pointer-events
    const ancestors = await el.evaluate(node => {
      const chain = []
      let cur = node
      while (cur && chain.length < 12) {
        const cs = getComputedStyle(cur)
        chain.push({
          tag: cur.tagName,
          pe: cs.pointerEvents,
          opacity: cs.opacity,
          inert: cur.hasAttribute('inert'),
          ariaDisabled: cur.getAttribute('aria-disabled'),
          cls: (cur.className?.toString() || '').slice(0, 60),
        })
        cur = cur.parentElement
      }
      return chain
    })
    log('祖先鏈:')
    ancestors.forEach((a, j) => log(`  ${j}. ${a.tag} pe=${a.pe} op=${a.opacity} inert=${a.inert} aria-disabled=${a.ariaDisabled} cls="${a.cls}"`))

    // 試 click + type
    await el.click({ force: false }).catch(e => log(`  click 失敗:`, e.message))
    await page.waitForTimeout(150)
    const activeTag = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      id: document.activeElement?.id,
      className: (document.activeElement?.className || '').toString().slice(0, 60),
    }))
    log(`點擊後 activeElement:`, activeTag)

    await page.keyboard.type('123', { delay: 30 })
    await page.waitForTimeout(200)
    const afterType = await el.evaluate(n => n.value)
    log(`keyboard.type("123") 後 value = "${afterType}"`)

    await el.fill('456')
    await page.waitForTimeout(200)
    const afterFill = await el.evaluate(n => n.value)
    log(`fill("456") 後 value = "${afterFill}"`)

    await page.keyboard.press('Tab')
    await page.waitForTimeout(400)
    const afterBlur = await el.evaluate(n => n.value)
    log(`Tab 離開後 value = "${afterBlur}"`)
  }

  await page.screenshot({ path: '/tmp/diagnose-after.png', fullPage: true })
  log('\n最後狀態截圖 /tmp/diagnose-after.png')

  await browser.close()
})().catch(err => {
  console.error('[diagnose] 失敗:', err)
  process.exit(1)
})
