/**
 * 臨時：走永豐虛擬帳號 + QRCode API（OrderCreate PayType=A）驗證串接（測完刪）
 * 跑法：金鑰 source 後、npx tsx scripts/sinopac-atm.ts
 * 測試環境：訂單成立後永豐每 5 分鐘自動模擬付款（OrderNo 尾數 9 則不付）。
 */
import { callApiService } from '@/lib/payment-providers/sinopac/client'
import type { SinopacConfig } from '@/lib/payment-providers/sinopac/config'

function reqEnv(n: string): string {
  const v = process.env[n]
  if (!v) {
    console.error('缺', n)
    process.exit(1)
  }
  return v
}

function ymd(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
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

  // OrderNo 尾數固定 1（避開尾數 9 = 不自動付款）
  const orderNo = 'ATM' + Date.now() + '1'

  console.log('→ OrderCreate 虛擬帳號 + QRCode、OrderNo:', orderNo)
  const create = await callApiService<Record<string, unknown>>(config, 'OrderCreate', {
    ShopNo: config.shopNo,
    OrderNo: orderNo,
    Amount: '10000', // 100 元 ×100（分）
    CurrencyID: 'TWD',
    PrdtName: '虛擬帳號測試',
    PayType: 'A',
    QRCodeStatus: 'Y',
    QRCodeSize: 350,
    ReturnURL: 'https://erp.venturo.tw/pay/result?t=atm',
    BackendURL: 'https://erp.venturo.tw/api/payment-webhooks/sinopac/notify',
    ATMParam: { ExpireDate: ymd(3) },
  })
  console.log('開單回應:', JSON.stringify(create, null, 2))

  console.log('\n→ 立即 OrderQuery 反查狀態')
  const q = await callApiService<Record<string, unknown>>(config, 'OrderQuery', {
    ShopNo: config.shopNo,
    OrderNo: orderNo,
    PayType: 'A',
  })
  const ol = (q.OrderList as Array<Record<string, unknown>> | undefined)?.[0]
  console.log('PayStatus:', ol?.PayStatus, '（1A200=待付款、1A400=付款完成）')
  console.log(
    '（虛擬帳號:',
    ol?.AtmPayNo ?? (create.ATMParam as Record<string, unknown>)?.AtmPayNo,
    '）'
  )
  console.log('\nOrderNo（記著、等 5 分鐘後再查自動付款）:', orderNo)
}
main().catch(e => {
  console.error('失敗：', e)
  process.exit(1)
})
