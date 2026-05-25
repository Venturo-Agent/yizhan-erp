/**
 * 臨時：自動化永豐 sandbox 刷卡（Playwright）— 端到端驗證授權成功（測完刪）
 * 跑法：金鑰 source 後、npx tsx scripts/sinopac-autopay.ts
 */
import { chromium } from '@playwright/test'
import { createCardOrder, getCardPayUrl, queryOrder } from '@/lib/payment-providers/sinopac/credit-card'
import type { SinopacConfig } from '@/lib/payment-providers/sinopac/config'

function reqEnv(n: string): string {
  const v = process.env[n]
  if (!v) { console.error('缺', n); process.exit(1) }
  return v
}

async function main() {
  const config: SinopacConfig = {
    shopNo: reqEnv('SINOPAC_SMOKE_SHOP_NO'),
    merchantUbn: '',
    hash: {
      A1: reqEnv('SINOPAC_SMOKE_HASH_A1'),
      A2: reqEnv('SINOPAC_SMOKE_HASH_A2'),
      B1: reqEnv('SINOPAC_SMOKE_HASH_B1'),
      B2: reqEnv('SINOPAC_SMOKE_HASH_B2'),
    },
    xKey: reqEnv('SINOPAC_SMOKE_X_KEY'),
    sandboxMode: true,
    baseUrl: 'https://apisbx.sinopac.com/funBIZ-Sbx/QPay.WebAPI/api/',
  }

  const orderNo = 'AUTO' + Date.now()
  const order = await createCardOrder(config, {
    orderNo,
    amount: 100,
    productName: '自動刷卡測試',
    returnUrl: `https://erp.venturo.tw/pay/result?t=auto${Date.now()}`,
    backendUrl: 'https://erp.venturo.tw/api/payment-webhooks/sinopac/notify',
  })
  const url = getCardPayUrl(order)
  console.log('OrderNo:', orderNo)
  if (!url) { console.error('沒拿到 CardPayURL'); process.exit(1) }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

  // 填測試卡 4143-5200-0187-0127 / 12/35 / 123
  await page.fill('#CardNo1', '4143')
  await page.fill('#CardNo2', '5200')
  await page.fill('#CardNo3', '0187')
  await page.fill('#CardNo4', '0127')
  await page.fill('#ExpireMM', '12')
  await page.fill('#ExpireYY', '35')
  await page.fill('#CVV2', '123')
  console.log('已填卡號')

  // 按送出（<a id="send">）
  await page.click('#send')
  console.log('已按送出、等授權結果…')
  await page.waitForTimeout(10000)
  await page.screenshot({ path: '/tmp/sp-after.png', fullPage: true })
  console.log('送出後 URL:', page.url())
  const text = await page.evaluate(() => document.body.innerText.slice(0, 500))
  console.log('送出後文字:\n', text)
  const inputs2 = await page.$$eval('input', (els) =>
    els.map((e) => ({ name: e.getAttribute('name'), id: e.id, type: e.type })),
  )
  console.log('送出後 INPUTS:', JSON.stringify(inputs2))
  const clicks2 = await page.$$eval('a, button', (els) =>
    els.slice(0, 15).map((e) => ({ tag: e.tagName, text: (e as HTMLElement).innerText?.trim().slice(0, 20), id: e.id })),
  )
  console.log('送出後 CLICKABLES:', JSON.stringify(clicks2))

  // 反查永豐確認狀態
  const q = await queryOrder(config, orderNo)
  const ol = (q as Record<string, unknown>).OrderList as Array<Record<string, unknown>> | undefined
  console.log('queryOrder → PayStatus:', ol?.[0]?.PayStatus, '/ AuthCode:', ol?.[0]?.AuthCode)
  await browser.close()
}
main().catch((e) => { console.error('失敗：', e); process.exit(1) })
