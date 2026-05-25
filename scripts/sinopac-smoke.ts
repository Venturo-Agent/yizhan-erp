/**
 * 永豐豐收款（QPay）信用卡 — A 階段煙霧測試（臨時、測完刪）
 *
 * 目的：第一次對永豐 sandbox 真伺服器驗證「加解密 + 金鑰」對不對。
 *   敲一次 OrderCreate(PayType='C')、看永豐吐不吐回刷卡頁網址。
 *   吐回來 = crypto.ts + client.ts + 金鑰全對、A 階段過關。
 *
 * ⚠️ 不碰 DB、不碰客戶資料、不部署。憑證從 env 讀（William 自己 source、不寫死、不印出）。
 *
 * 跑法（角落 sandbox 憑證 source 進 shell 後）：
 *   SINOPAC_SMOKE_SHOP_NO=... \
 *   SINOPAC_SMOKE_HASH_A1=... SINOPAC_SMOKE_HASH_A2=... \
 *   SINOPAC_SMOKE_HASH_B1=... SINOPAC_SMOKE_HASH_B2=... \
 *   SINOPAC_SMOKE_X_KEY=... \
 *   npx tsx scripts/sinopac-smoke.ts
 *
 * 若噴 SSL/憑證錯誤、前面加 NODE_TLS_REJECT_UNAUTHORIZED=0（僅測試環境可）。
 */

import { createCardOrder } from '@/lib/payment-providers/sinopac/credit-card'
import type { SinopacConfig } from '@/lib/payment-providers/sinopac/config'

function reqEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ 缺環境變數 ${name}（角落 sandbox 憑證要先 source 進 shell）`)
    process.exit(1)
  }
  return v
}

async function main() {
  const config: SinopacConfig = {
    shopNo: reqEnv('SINOPAC_SMOKE_SHOP_NO'),
    merchantUbn: process.env.SINOPAC_SMOKE_UBN ?? '',
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

  const orderNo = 'SMOKE' + Date.now()
  console.log(`→ 連永豐 sandbox、ShopNo=${config.shopNo}、送 OrderCreate(信用卡) OrderNo=${orderNo}`)
  console.log('  （憑證不印出、只看回應）\n')

  try {
    const res = await createCardOrder(config, {
      orderNo,
      amount: 100,
      productName: '永豐串接煙霧測試',
      returnUrl: 'https://erp.venturo.tw/pay/return',
      backendUrl: 'https://erp.venturo.tw/api/payment-webhooks/sinopac/notify',
    })
    console.log('✓ 永豐有回應、解密成功。回應內容：')
    console.log(JSON.stringify(res, null, 2))
    const url = res.URL || res.PaymentURL
    if (url) {
      console.log(`\n✓✓ 拿到刷卡頁網址 = A 階段過關：\n  ${url}`)
    } else {
      console.log('\n⚠ 解密成功但沒看到 URL 欄位 — 上面 JSON 找哪個欄位是刷卡網址、回報 Logan 對齊型別。')
    }
  } catch (e) {
    console.error('\n✗ 煙霧測試失敗：', e instanceof Error ? e.message : e)
    console.error('  常見原因：金鑰填錯 / X-Key 過期 / Sign 演算法對不上 / SSL（加 NODE_TLS_REJECT_UNAUTHORIZED=0 再試）')
    process.exit(1)
  }
}

main()
