/**
 * Browser smoke：在單一 page session 內走完 demo flow
 */

import { test, expect, Page } from '@playwright/test'

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'
const COMPANY_CODE = process.env.SMOKE_COMPANY_CODE || 'VENTURO'
const EMAIL = process.env.SMOKE_EMAIL || 'smoke@venturo.tw'
const PASSWORD = process.env.SMOKE_PASSWORD || 'smoke-test-12345'

async function visit(page: Page, path: string, expectedSnippets: string[]) {
  const consoleErrs: string[] = []
  const netErrs: string[] = []
  const onConsole = (msg: any) => { if (msg.type() === 'error') consoleErrs.push(msg.text()) }
  const onResp = (resp: any) => {
    if (resp.status() >= 500 && resp.url().startsWith(BASE)) netErrs.push(`${resp.status()} ${resp.url()}`)
  }
  page.on('console', onConsole)
  page.on('response', onResp)

  await page.goto(`${BASE}${path}`)
  // 等 SWR / fetch 跑完。networkidle 不準（HMR / sentry 一直 ping）、改等 4s 後 snapshot
  await page.waitForTimeout(4000)
  const html = await page.content()
  const url = page.url()
  // 每頁存截圖
  const safe = path.replace(/\//g, '_') || '_root'
  await page.screenshot({ path: `/tmp/smoke-screens/${safe}.png`, fullPage: true })

  page.off('console', onConsole)
  page.off('response', onResp)

  return { html, url, consoleErrs, netErrs }
}

test('demo flow end-to-end', async ({ page }) => {
  test.setTimeout(180_000)

  // ===== 1. login =====
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('公司代號').fill(COMPANY_CODE)
  await page.getByPlaceholder('Email').fill(EMAIL)
  await page.getByPlaceholder('密碼').fill(PASSWORD)
  await page.getByRole('button', { name: /登入/ }).click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30_000 })
  console.log(`[login] OK -> ${page.url()}`)

  const results: { path: string; ok: boolean; missing: string[]; consoleErrs: string[]; netErrs: string[]; redirected?: string }[] = []

  const checks: { path: string; expects: string[]; clickTab?: string }[] = [
    { path: '/tours',                expects: ['力晶'] }, // 預設 tab 顯示「待出發」、力晶員工 upcoming OK
    { path: '/orders',               expects: ['力晶'] },
    { path: '/finance/payments',     expects: ['R-2603'] },
    { path: '/finance/requests',     expects: ['P-2603'] },
    { path: '/accounting/vouchers',  expects: ['JV-2604'] },
    { path: '/library/customers',    expects: ['王小明', '力晶'] },
  ]

  // 跑「全部」tab 的 tours 額外驗
  const tourAllCheck = async () => {
    await page.goto(`${BASE}/tours`)
    await page.waitForTimeout(2500)
    // 點「全部」tab、看 closed + proposal 也 render
    const allTab = page.getByRole('tab', { name: '全部' }).or(page.getByText('全部', { exact: true }).first())
    if (await allTab.count() > 0) {
      await allTab.first().click().catch(() => null)
      await page.waitForTimeout(1500)
    }
    const html = await page.content()
    return { hasOkinawa: html.includes('沖繩'), hasClosedLixin: html.includes('東京商務考察') }
  }

  for (const c of checks) {
    const r = await visit(page, c.path, c.expects)
    const missing = c.expects.filter((s) => !r.html.includes(s))
    const redirected = r.url.replace(BASE, '') !== c.path ? r.url : undefined
    results.push({ path: c.path, ok: missing.length === 0 && !redirected, missing, consoleErrs: r.consoleErrs, netErrs: r.netErrs, redirected })
    console.log(`[${c.path}] ${missing.length === 0 && !redirected ? 'OK' : 'FAIL'}${redirected ? ` (redirected to ${redirected})` : ''}${missing.length ? ` missing: ${missing.join(', ')}` : ''}`)
    if (r.netErrs.length) console.log(`  net5xx: ${r.netErrs.slice(0, 3).join('; ')}`)
    if (r.consoleErrs.length) console.log(`  console: ${r.consoleErrs.slice(0, 3).map(e => e.slice(0, 200)).join(' | ')}`)
  }

  // tours 「全部」tab 內含完整故事
  const tourAll = await tourAllCheck()
  console.log(`[/tours?tab=全部] hasOkinawa=${tourAll.hasOkinawa} hasClosedLixin=${tourAll.hasClosedLixin}`)
  if (!tourAll.hasOkinawa) {
    results.push({ path: '/tours[全部 tab]', ok: false, missing: ['沖繩'], consoleErrs: [], netErrs: [] })
  }

  console.log('\n===== summary =====')
  for (const r of results) {
    console.log(`  ${r.ok ? '✅' : '❌'} ${r.path}${r.redirected ? ` -> ${r.redirected}` : ''}`)
  }

  const failed = results.filter((r) => !r.ok)
  expect(failed, `${failed.length} pages failed: ${failed.map((f) => f.path).join(', ')}`).toHaveLength(0)
})
